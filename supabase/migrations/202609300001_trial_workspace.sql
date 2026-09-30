-- One reserved, public sandbox. No existing team is converted or reassigned.
alter table public.teams add column is_trial boolean not null default false;
alter table public.teams add constraint teams_reserved_trial check (
  not is_trial or (id = '00000000-0000-4000-8000-00000000ff01' and slug = 'trial')
);
insert into public.teams (id, slug, name, is_trial)
values ('00000000-0000-4000-8000-00000000ff01', 'trial', 'LunchPick trial', true);

-- This identifier is server-owned audit metadata, never an Auth account.
alter table public.organizer_email_allowlist add constraint organizer_no_trial_identity
  check (email <> 'trial@lunchpick.invalid');
alter table public.organizer_email_allowlist add constraint organizer_no_trial_team
  check (team_id <> '00000000-0000-4000-8000-00000000ff01');
create or replace function public.organizer_team_id_for_email(p_email text)
returns uuid language sql stable security definer
set search_path = pg_catalog, public
as $$
  select case when lower(btrim(p_email)) = 'trial@lunchpick.invalid'
    then '00000000-0000-4000-8000-00000000ff01'::uuid
    else (select team_id from public.organizer_email_allowlist where email = lower(btrim(p_email)))
  end;
$$;

create table public.trial_workspace (
  team_id uuid primary key references public.teams(id) on delete restrict
    check (team_id = '00000000-0000-4000-8000-00000000ff01'),
  generation uuid not null default gen_random_uuid(),
  resets_at timestamptz not null default '-infinity',
  voting_poll_id uuid references public.polls(id) on delete set null
);
alter table public.trial_workspace enable row level security;
revoke all on public.trial_workspace from public, anon, authenticated;
grant select on public.trial_workspace to service_role;
insert into public.trial_workspace (team_id)
values ('00000000-0000-4000-8000-00000000ff01');

-- Row-scoped exceptions for sandbox cleanup only. Normal candidates, events,
-- and result snapshots retain their existing immutability guards. No triggers
-- are disabled and no session_replication_role changes are made during reset.
create function public.trial_reset_allows_delete(p_poll_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (select 1 from public.teams
    where id = '00000000-0000-4000-8000-00000000ff01' and slug = 'trial' and is_trial)
    and p_poll_id = any(coalesce(
      nullif(current_setting('restaurant_voter.trial_reset_poll_ids', true), ''), '{}'
    )::uuid[])
    and not exists (select 1 from public.polls where id = p_poll_id
      and team_id <> '00000000-0000-4000-8000-00000000ff01');
$$;
revoke all on function public.trial_reset_allows_delete(uuid) from public, anon, authenticated;
grant execute on function public.trial_reset_allows_delete(uuid) to service_role;

drop trigger poll_candidates_enforce_write on public.poll_candidates;
create trigger poll_candidates_enforce_write
before insert or update on public.poll_candidates
for each row execute function public.enforce_candidate_write();
create trigger poll_candidates_enforce_delete
before delete on public.poll_candidates
for each row when (not public.trial_reset_allows_delete(old.poll_id))
execute function public.enforce_candidate_write();

drop trigger poll_results_immutable on public.poll_results;
create trigger poll_results_immutable before update on public.poll_results
for each row execute function public.reject_immutable_row_change();
create trigger poll_results_immutable_delete before delete on public.poll_results
for each row when (not public.trial_reset_allows_delete(old.poll_id))
execute function public.reject_immutable_row_change();
drop trigger poll_events_immutable on public.poll_events;
create trigger poll_events_immutable before update on public.poll_events
for each row execute function public.reject_immutable_row_change();
create trigger poll_events_immutable_delete before delete on public.poll_events
for each row when (not public.trial_reset_allows_delete(old.poll_id))
execute function public.reject_immutable_row_change();

-- Fictional labels and durable sample IDs; live Google search is still usable
-- when configured, and organizers can add real restaurants in the trial.
create function public.seed_trial_poll(p_title text, p_status public.poll_status)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  trial_id constant uuid := '00000000-0000-4000-8000-00000000ff01'::uuid;
  audit_email constant text := 'trial@lunchpick.invalid';
  center_row public.lunch_centers%rowtype;
  poll_id uuid;
  candidate_ids uuid[] := '{}'::uuid[];
  restaurant_id uuid;
  candidate_id uuid;
  voter_id uuid;
  labels text[] := array['Harbour Tacos', 'The Green Table', 'North End Noodle House', 'Pier 21 Pizza'];
  names text[] := array['Alex (sample)', 'Sam (sample)', 'Jordan (sample)', 'Taylor (sample)'];
begin
  select * into strict center_row from public.lunch_centers
  where team_id = trial_id order by created_at, id limit 1;
  insert into public.polls (title, lunch_center_id, center_name, center_address,
    center_latitude, center_longitude, vote_limit, nomination_limit,
    nominations_enabled, created_by_admin, team_id)
  values (p_title, center_row.id, center_row.name, center_row.address_label,
    center_row.latitude, center_row.longitude, 2, 3, true, audit_email, trial_id)
  returning id into poll_id;

  for i in 1..4 loop
    insert into public.restaurants (google_place_id)
    values ('lunchpick-trial-sample-' || i)
    on conflict (google_place_id) do nothing;
    select id into restaurant_id from public.restaurants
    where google_place_id = 'lunchpick-trial-sample-' || i;
    insert into public.poll_candidates (poll_id, restaurant_id, source, fallback_label)
    values (poll_id, restaurant_id, 'admin', labels[i]) returning id into candidate_id;
    candidate_ids := array_append(candidate_ids, candidate_id);
  end loop;

  if p_status = 'draft' then return poll_id; end if;
  perform public.transition_poll(poll_id, audit_email, 'nominations');
  if p_status <> 'nominations' then
    perform public.transition_poll(poll_id, audit_email, 'voting');
  end if;
  for i in 1..4 loop
    select registered.voter_id into voter_id from public.register_poll_voter(
      poll_id, translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_'), names[i]
    ) registered;
    if p_status <> 'nominations' and i <= 3 then
      perform public.save_ballot(poll_id, voter_id, array[candidate_ids[1], candidate_ids[i + 1]], 0);
    end if;
  end loop;
  if p_status = 'closed' then perform public.close_poll(poll_id, audit_email); end if;
  return poll_id;
end;
$$;
revoke all on function public.seed_trial_poll(text, public.poll_status) from public, anon, authenticated, service_role;

create function public.reset_trial_workspace()
returns void language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  trial_id constant uuid := '00000000-0000-4000-8000-00000000ff01'::uuid;
  workspace public.trial_workspace%rowtype;
  poll_ids uuid[];
  voting_id uuid;
begin
  select * into strict workspace from public.trial_workspace where team_id = trial_id for update;
  perform 1 from public.teams where id = trial_id and slug = 'trial' and is_trial for update;
  if not found or exists (select 1 from public.organizer_email_allowlist where team_id = trial_id) then
    raise exception using errcode = '42501', message = 'Trial reset refused: reserved team is not isolated';
  end if;
  if workspace.resets_at > statement_timestamp() then return; end if;

  -- Capture and lock only the reserved team's rows. The transaction-local
  -- delete exception names these exact IDs, including for cascade triggers.
  perform 1 from public.polls where team_id = trial_id order by id for update;
  select coalesce(array_agg(id), '{}') into poll_ids from public.polls where team_id = trial_id;
  perform set_config('restaurant_voter.trial_reset_poll_ids', poll_ids::text, true);
  delete from public.winner_history where team_id = trial_id;
  delete from public.poll_results where poll_id = any(poll_ids);
  delete from public.poll_events where poll_id = any(poll_ids);
  delete from public.ballot_choices where poll_id = any(poll_ids);
  delete from public.ballots where poll_id = any(poll_ids);
  delete from public.polls where team_id = trial_id and id = any(poll_ids);
  delete from public.lunch_centers where team_id = trial_id;
  perform set_config('restaurant_voter.trial_reset_poll_ids', '', true);
  -- Shared restaurant identifiers are deliberately never deleted or updated.

  insert into public.lunch_centers (name, address_label, latitude, longitude, created_by_admin, team_id)
  values
    ('Downtown office (sample)', 'Halifax, Nova Scotia', 44.6488, -63.5752, 'trial@lunchpick.invalid', trial_id),
    ('Waterfront meetup (sample)', 'Lower Water Street, Halifax', 44.6456, -63.5711, 'trial@lunchpick.invalid', trial_id);
  perform public.seed_trial_poll('Plan your next team lunch (sample)', 'draft');
  perform public.seed_trial_poll('Friday lunch shortlist (sample)', 'nominations');
  voting_id := public.seed_trial_poll('Try a lunch vote (sample)', 'voting');
  perform public.seed_trial_poll('Previous team lunch (sample)', 'closed');
  perform public.add_manual_winner('trial@lunchpick.invalid', 'lunchpick-trial-sample-4',
    'Pier 21 Pizza', current_date - 14, 'Sample team favorite after an offsite.');
  update public.trial_workspace set generation = gen_random_uuid(), voting_poll_id = voting_id,
    resets_at = (date_trunc('week', statement_timestamp() at time zone 'UTC') + interval '1 week') at time zone 'UTC'
  where team_id = trial_id;
end;
$$;
revoke all on function public.reset_trial_workspace() from public, anon, authenticated, service_role;

create function public.ensure_trial_workspace()
returns table (team_id uuid, generation uuid, resets_at timestamptz,
  voting_public_id text, voting_access_version integer)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  trial_id constant uuid := '00000000-0000-4000-8000-00000000ff01'::uuid;
  workspace public.trial_workspace%rowtype;
begin
  -- Cron normally handles cleanup; this repairs a missed run after downtime.
  perform public.reset_trial_workspace();
  select * into strict workspace from public.trial_workspace tw where tw.team_id = trial_id for update;
  -- An organizer may close the example vote. Keep the voter entry point useful
  -- without resetting everyone else's ongoing work during the week.
  if not exists (select 1 from public.polls p where p.id = workspace.voting_poll_id
    and p.team_id = trial_id and p.status = 'voting') then
    update public.trial_workspace tw
    set voting_poll_id = public.seed_trial_poll('Try a lunch vote (sample)', 'voting')
    where tw.team_id = trial_id;
  end if;
  return query select tw.team_id, tw.generation, tw.resets_at, p.public_id, p.access_version
    from public.trial_workspace tw join public.polls p on p.id = tw.voting_poll_id
    where tw.team_id = trial_id and p.team_id = trial_id;
end;
$$;
revoke all on function public.ensure_trial_workspace() from public, anon, authenticated;
grant execute on function public.ensure_trial_workspace() to service_role;

select public.reset_trial_workspace();
select cron.schedule('restaurant-voter-reset-trial', '0 0 * * 1', 'select public.reset_trial_workspace();');
