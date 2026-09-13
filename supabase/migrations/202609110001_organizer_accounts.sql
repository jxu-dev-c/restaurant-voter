-- Organizers own their workspace. NULL ownership is reserved for legacy data
-- whose creator has not yet verified their email; the application never lists it.
alter table public.lunch_centers add column owner_id uuid references auth.users(id) on delete restrict;
alter table public.polls add column owner_id uuid references auth.users(id) on delete restrict;
alter table public.winner_history add column owner_id uuid references auth.users(id) on delete restrict;

create index lunch_centers_owner_idx on public.lunch_centers(owner_id);
create index polls_owner_created_idx on public.polls(owner_id, created_at desc);
create index winner_history_owner_restaurant_idx on public.winner_history(owner_id, restaurant_id, won_on desc);
drop index public.lunch_centers_google_place_id_key;
create unique index lunch_centers_owner_place_key
  on public.lunch_centers(owner_id, google_place_id) nulls not distinct
  where google_place_id is not null;

-- Place IDs remain global. User-authored labels live on workspace records so
-- one organizer cannot see or change another organizer's fallback text.
alter table public.poll_candidates add column fallback_label text
  check (fallback_label is null or (btrim(fallback_label) <> '' and char_length(fallback_label) <= 160));
alter table public.winner_history add column fallback_label text
  check (fallback_label is null or (btrim(fallback_label) <> '' and char_length(fallback_label) <= 160));
alter table public.poll_candidates disable trigger poll_candidates_enforce_write;
update public.poll_candidates c set fallback_label = r.fallback_label
from public.restaurants r where r.id = c.restaurant_id;
alter table public.poll_candidates enable trigger poll_candidates_enforce_write;
update public.winner_history h set fallback_label = r.fallback_label
from public.restaurants r where r.id = h.restaurant_id;

create function public.organizer_id_for_email(p_email text)
returns uuid language sql stable security definer
set search_path = pg_catalog, public
as $$
  select id from auth.users
  where lower(btrim(email)) = lower(btrim(p_email))
    and email_confirmed_at is not null and not is_anonymous;
$$;

create function public.claim_legacy_organizer_data(p_user_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  verified_email text;
begin
  select lower(btrim(email)) into verified_email from auth.users
  where id = p_user_id and email_confirmed_at is not null and not is_anonymous;
  if verified_email is null then return; end if;

  update public.lunch_centers set owner_id = p_user_id
  where owner_id is null and lower(btrim(created_by_admin)) = verified_email;
  update public.polls set owner_id = p_user_id
  where owner_id is null and lower(btrim(created_by_admin)) = verified_email;
  update public.winner_history h set owner_id = p_user_id
  where h.owner_id is null and (
    (h.source_poll_id is null and lower(btrim(h.created_by_admin)) = verified_email)
    or exists (select 1 from public.polls p where p.id = h.source_poll_id and p.owner_id = p_user_id)
  );
end;
$$;

-- Preserve existing installations, including accounts created before this migration.
select public.claim_legacy_organizer_data(id) from auth.users
where email_confirmed_at is not null and not is_anonymous;

create function public.claim_organizer_data_on_verification()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.claim_legacy_organizer_data(new.id);
  return new;
end;
$$;
create trigger users_claim_organizer_data
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.claim_organizer_data_on_verification();

create function public.set_workspace_owner()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and old.owner_id is not null and new.owner_id is distinct from old.owner_id then
    raise exception using errcode = '42501', message = 'Workspace ownership is immutable';
  end if;
  if new.owner_id is null then
    new.owner_id := public.organizer_id_for_email(new.created_by_admin);
  end if;
  return new;
end;
$$;
create trigger lunch_centers_set_owner before insert or update on public.lunch_centers
  for each row execute function public.set_workspace_owner();
create trigger polls_set_owner before insert or update on public.polls
  for each row execute function public.set_workspace_owner();

create function public.set_winner_workspace()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if new.source_poll_id is not null then
    select p.owner_id into new.owner_id from public.polls p where p.id = new.source_poll_id;
    if tg_op = 'INSERT' then
      select c.fallback_label into new.fallback_label from public.poll_candidates c
      where c.poll_id = new.source_poll_id and c.restaurant_id = new.restaurant_id;
    end if;
  elsif new.owner_id is null then
    new.owner_id := public.organizer_id_for_email(new.created_by_admin);
  end if;
  if tg_op = 'UPDATE' and old.owner_id is not null and new.owner_id is distinct from old.owner_id then
    raise exception using errcode = '42501', message = 'Workspace ownership is immutable';
  end if;
  return new;
end;
$$;
create trigger winner_history_set_workspace before insert or update on public.winner_history
  for each row execute function public.set_winner_workspace();

revoke all on function public.organizer_id_for_email(text) from public, anon, authenticated, service_role;
revoke all on function public.claim_legacy_organizer_data(uuid) from public, anon, authenticated, service_role;
revoke all on function public.claim_organizer_data_on_verification() from public, anon, authenticated, service_role;
revoke all on function public.set_workspace_owner() from public, anon, authenticated, service_role;
revoke all on function public.set_winner_workspace() from public, anon, authenticated, service_role;

-- Existing RLS and service-only RPC grants are retained. Next.js authenticates
-- and checks ownership at every organizer data operation before using service_role.

create or replace function public.nominate_restaurant(
  p_poll_id uuid,
  p_voter_id uuid,
  p_google_place_id text,
  p_fallback_label text default null
)
returns table (
  candidate_id uuid,
  restaurant_id uuid,
  created boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  restaurant_row public.restaurants%rowtype;
  candidate_row public.poll_candidates%rowtype;
begin
  if p_google_place_id is null
    or btrim(p_google_place_id) = ''
    or char_length(p_google_place_id) > 255 then
    raise exception using errcode = '22023', message = 'A valid Google Place ID is required';
  end if;

  select *
  into poll_row
  from public.polls
  where id = p_poll_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Poll not found';
  end if;

  if poll_row.status <> 'nominations' or not poll_row.nominations_enabled then
    raise exception using errcode = '55000', message = 'Voter nominations are not open';
  end if;

  perform 1
  from public.poll_voters pv
  where pv.id = p_voter_id
    and pv.poll_id = p_poll_id
    and pv.anonymized_at is null;

  if not found then
    raise exception using errcode = '22023', message = 'Voter does not belong to this poll';
  end if;

  insert into public.restaurants (google_place_id)
  values (
    btrim(p_google_place_id)
  )
  on conflict (google_place_id) do update
  set google_place_id = excluded.google_place_id
  returning * into restaurant_row;

  select *
  into candidate_row
  from public.poll_candidates pc
  where pc.poll_id = p_poll_id and pc.restaurant_id = restaurant_row.id;

  if found then
    if not candidate_row.is_active then
      raise exception using
        errcode = '55000',
        message = 'This restaurant was removed and cannot be re-added by a voter';
    end if;

    return query select candidate_row.id, restaurant_row.id, false;
    return;
  end if;

  insert into public.poll_candidates (
    poll_id,
    restaurant_id,
    source,
    nominated_by_voter_id,
    fallback_label
  ) values (
    p_poll_id,
    restaurant_row.id,
    'voter',
    p_voter_id,
    nullif(btrim(p_fallback_label), '')
  )
  returning * into candidate_row;

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    voter_id,
    payload
  ) values (
    p_poll_id,
    'candidate_nominated',
    'voter',
    p_voter_id,
    jsonb_build_object('candidate_id', candidate_row.id)
  );

  return query select candidate_row.id, restaurant_row.id, true;
end;
$$;

create or replace function public.seed_poll_candidate(
  p_poll_id uuid,
  p_admin_email text,
  p_google_place_id text,
  p_fallback_label text default null
)
returns table (
  candidate_id uuid,
  restaurant_id uuid,
  created boolean,
  is_active boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  restaurant_row public.restaurants%rowtype;
  candidate_row public.poll_candidates%rowtype;
begin
  perform public.require_admin_identifier(p_admin_email);

  if p_google_place_id is null
    or btrim(p_google_place_id) = ''
    or char_length(p_google_place_id) > 255 then
    raise exception using errcode = '22023', message = 'A valid Google Place ID is required';
  end if;

  select *
  into poll_row
  from public.polls
  where id = p_poll_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Poll not found';
  end if;

  if poll_row.status not in ('draft', 'nominations') then
    raise exception using errcode = '55000', message = 'Candidates are locked once voting starts';
  end if;

  insert into public.restaurants (google_place_id)
  values (
    btrim(p_google_place_id)
  )
  on conflict (google_place_id) do update
  set google_place_id = excluded.google_place_id
  returning * into restaurant_row;

  select *
  into candidate_row
  from public.poll_candidates pc
  where pc.poll_id = p_poll_id and pc.restaurant_id = restaurant_row.id;

  if found then
    return query
    select candidate_row.id, restaurant_row.id, false, candidate_row.is_active;
    return;
  end if;

  insert into public.poll_candidates (poll_id, restaurant_id, source, fallback_label)
  values (p_poll_id, restaurant_row.id, 'admin', nullif(btrim(p_fallback_label), ''))
  returning * into candidate_row;

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    actor_identifier,
    payload
  ) values (
    p_poll_id,
    'candidate_seeded',
    'admin',
    lower(btrim(p_admin_email)),
    jsonb_build_object('candidate_id', candidate_row.id)
  );

  return query select candidate_row.id, restaurant_row.id, true, true;
end;
$$;

create or replace function public.add_manual_winner(
  p_admin_email text,
  p_google_place_id text,
  p_fallback_label text,
  p_won_on date,
  p_notes text default null
)
returns public.winner_history
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  restaurant_row public.restaurants%rowtype;
  history_row public.winner_history%rowtype;
begin
  perform public.require_admin_identifier(p_admin_email);

  if p_google_place_id is null
    or btrim(p_google_place_id) = ''
    or char_length(p_google_place_id) > 255 then
    raise exception using errcode = '22023', message = 'A valid Google Place ID is required';
  end if;

  if p_won_on is null or p_won_on > current_date then
    raise exception using errcode = '22023', message = 'Winner date must not be in the future';
  end if;

  insert into public.restaurants (google_place_id)
  values (btrim(p_google_place_id))
  on conflict (google_place_id) do update
  set google_place_id = excluded.google_place_id
  returning * into restaurant_row;

  insert into public.winner_history (
    restaurant_id,
    source,
    won_on,
    notes,
    created_by_admin,
    fallback_label
  ) values (
    restaurant_row.id,
    'manual',
    p_won_on,
    nullif(btrim(p_notes), ''),
    lower(btrim(p_admin_email)),
    nullif(btrim(p_fallback_label), '')
  )
  returning * into history_row;

  return history_row;
end;
$$;
