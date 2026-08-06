-- Restaurant Voter v1: relational model, invariants, and browser-facing access controls.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.poll_status as enum (
  'draft',
  'nominations',
  'voting',
  'closed'
);

create type public.poll_outcome_status as enum (
  'pending',
  'no_votes',
  'unique_winner',
  'tie',
  'resolved_tie'
);

create type public.candidate_source as enum ('admin', 'voter');
create type public.winner_source as enum ('automatic', 'tie_break', 'manual');
create type public.event_actor_type as enum ('admin', 'voter', 'system');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create or replace function public.normalize_voter_name()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  normalized text;
begin
  normalized := regexp_replace(btrim(new.display_name), '[[:space:]]+', ' ', 'g');

  if normalized = '' or char_length(normalized) > 80 then
    raise exception using
      errcode = '22023',
      message = 'Display name must contain between 1 and 80 characters';
  end if;

  new.display_name := normalized;
  new.normalized_name := lower(normalized);
  return new;
end;
$$;

create table public.lunch_centers (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  address_label text,
  google_place_id text,
  latitude double precision not null,
  longitude double precision not null,
  created_by_admin text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lunch_centers_name_check
    check (btrim(name) <> '' and char_length(name) <= 100),
  constraint lunch_centers_address_check
    check (address_label is null or char_length(address_label) <= 300),
  constraint lunch_centers_place_id_check
    check (google_place_id is null or (btrim(google_place_id) <> '' and char_length(google_place_id) <= 255)),
  constraint lunch_centers_latitude_check check (latitude between -90 and 90),
  constraint lunch_centers_longitude_check check (longitude between -180 and 180),
  constraint lunch_centers_admin_check
    check (btrim(created_by_admin) <> '' and char_length(created_by_admin) <= 320)
);

create unique index lunch_centers_google_place_id_key
  on public.lunch_centers (google_place_id)
  where google_place_id is not null;

create trigger lunch_centers_set_updated_at
before update on public.lunch_centers
for each row execute function public.set_updated_at();

create table public.restaurants (
  id uuid primary key default extensions.gen_random_uuid(),
  google_place_id text not null unique,
  fallback_label text,
  created_at timestamptz not null default now(),
  constraint restaurants_google_place_id_check
    check (btrim(google_place_id) <> '' and char_length(google_place_id) <= 255),
  constraint restaurants_fallback_label_check
    check (fallback_label is null or (btrim(fallback_label) <> '' and char_length(fallback_label) <= 160))
);

create table public.polls (
  id uuid primary key default extensions.gen_random_uuid(),
  public_id text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  title text not null,
  status public.poll_status not null default 'draft',
  outcome_status public.poll_outcome_status not null default 'pending',
  lunch_center_id uuid references public.lunch_centers (id) on delete restrict,
  center_name text not null,
  center_address text,
  center_google_place_id text,
  center_latitude double precision not null,
  center_longitude double precision not null,
  vote_limit smallint not null default 1,
  nominations_enabled boolean not null default true,
  access_version integer not null default 1,
  official_winner_candidate_id uuid,
  nominations_started_at timestamptz,
  voting_started_at timestamptz,
  closed_at timestamptz,
  created_by_admin text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint polls_public_id_check
    check (public_id ~ '^[A-Za-z0-9_-]{12,64}$'),
  constraint polls_title_check
    check (btrim(title) <> '' and char_length(title) <= 160),
  constraint polls_center_name_check
    check (btrim(center_name) <> '' and char_length(center_name) <= 100),
  constraint polls_center_address_check
    check (center_address is null or char_length(center_address) <= 300),
  constraint polls_center_place_id_check
    check (center_google_place_id is null or (btrim(center_google_place_id) <> '' and char_length(center_google_place_id) <= 255)),
  constraint polls_center_latitude_check check (center_latitude between -90 and 90),
  constraint polls_center_longitude_check check (center_longitude between -180 and 180),
  constraint polls_vote_limit_check check (vote_limit between 1 and 50),
  constraint polls_access_version_check check (access_version >= 1),
  constraint polls_admin_check
    check (btrim(created_by_admin) <> '' and char_length(created_by_admin) <= 320),
  constraint polls_lifecycle_check check (
    (
      status = 'draft'
      and outcome_status = 'pending'
      and nominations_started_at is null
      and voting_started_at is null
      and closed_at is null
    )
    or (
      status = 'nominations'
      and nominations_enabled
      and outcome_status = 'pending'
      and nominations_started_at is not null
      and voting_started_at is null
      and closed_at is null
    )
    or (
      status = 'voting'
      and outcome_status = 'pending'
      and voting_started_at is not null
      and closed_at is null
    )
    or (
      status = 'closed'
      and outcome_status <> 'pending'
      and voting_started_at is not null
      and closed_at is not null
    )
  )
);

create index polls_status_created_at_idx on public.polls (status, created_at desc);
create index polls_closed_at_idx on public.polls (closed_at) where status = 'closed';

create trigger polls_set_updated_at
before update on public.polls
for each row execute function public.set_updated_at();

create table public.poll_voters (
  id uuid primary key default extensions.gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  device_hash text,
  display_name text not null,
  normalized_name text not null,
  voter_code text not null default lower(encode(extensions.gen_random_bytes(3), 'hex')),
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  anonymized_at timestamptz,
  constraint poll_voters_id_poll_key unique (id, poll_id),
  constraint poll_voters_device_hash_check check (
    (device_hash is not null and device_hash ~ '^[A-Za-z0-9_-]{43}$')
    or (device_hash is null and anonymized_at is not null)
  ),
  constraint poll_voters_display_name_check
    check (btrim(display_name) <> '' and char_length(display_name) <= 80),
  constraint poll_voters_normalized_name_check
    check (btrim(normalized_name) <> '' and char_length(normalized_name) <= 80),
  constraint poll_voters_code_check check (voter_code ~ '^[a-z0-9]{6}$'),
  constraint poll_voters_anonymized_name_check check (
    anonymized_at is null
    or (device_hash is null and display_name = 'Anonymous voter' and normalized_name = 'anonymous voter')
  ),
  constraint poll_voters_poll_code_key unique (poll_id, voter_code)
);

create unique index poll_voters_poll_device_hash_key
  on public.poll_voters (poll_id, device_hash)
  where device_hash is not null;

create index poll_voters_poll_name_idx
  on public.poll_voters (poll_id, normalized_name);

create trigger poll_voters_normalize_name
before insert or update of display_name on public.poll_voters
for each row execute function public.normalize_voter_name();

create table public.poll_candidates (
  id uuid primary key default extensions.gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  source public.candidate_source not null,
  nominated_by_voter_id uuid,
  is_active boolean not null default true,
  removed_at timestamptz,
  removed_by_admin text,
  created_at timestamptz not null default now(),
  constraint poll_candidates_id_poll_key unique (id, poll_id),
  constraint poll_candidates_poll_restaurant_key unique (poll_id, restaurant_id),
  constraint poll_candidates_nominator_fk
    foreign key (nominated_by_voter_id, poll_id)
    references public.poll_voters (id, poll_id)
    on delete restrict,
  constraint poll_candidates_source_check check (
    (source = 'admin' and nominated_by_voter_id is null)
    or (source = 'voter' and nominated_by_voter_id is not null)
  ),
  constraint poll_candidates_removal_check check (
    (is_active and removed_at is null and removed_by_admin is null)
    or (
      not is_active
      and removed_at is not null
      and removed_by_admin is not null
      and btrim(removed_by_admin) <> ''
      and char_length(removed_by_admin) <= 320
    )
  )
);

create index poll_candidates_active_idx
  on public.poll_candidates (poll_id, created_at, id)
  where is_active;

create index poll_candidates_nominator_idx
  on public.poll_candidates (poll_id, nominated_by_voter_id)
  where source = 'voter';

alter table public.polls
  add constraint polls_official_winner_candidate_fk
  foreign key (official_winner_candidate_id, id)
  references public.poll_candidates (id, poll_id)
  on delete restrict;

alter table public.polls
  add constraint polls_official_winner_check check (
    (
      outcome_status in ('unique_winner', 'resolved_tie')
      and official_winner_candidate_id is not null
    )
    or (
      outcome_status in ('pending', 'no_votes', 'tie')
      and official_winner_candidate_id is null
    )
  );

create table public.ballots (
  id uuid primary key default extensions.gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  voter_id uuid not null,
  revision integer not null default 1,
  is_submitted boolean not null default true,
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ballots_id_poll_key unique (id, poll_id),
  constraint ballots_poll_voter_key unique (poll_id, voter_id),
  constraint ballots_voter_fk
    foreign key (voter_id, poll_id)
    references public.poll_voters (id, poll_id)
    on delete restrict,
  constraint ballots_revision_check check (revision >= 1),
  constraint ballots_submission_state_check check (
    (is_submitted and submitted_at is not null and withdrawn_at is null)
    or (not is_submitted and withdrawn_at is not null)
  )
);

create index ballots_submitted_poll_idx
  on public.ballots (poll_id, voter_id)
  where is_submitted;

create trigger ballots_set_updated_at
before update on public.ballots
for each row execute function public.set_updated_at();

create table public.ballot_choices (
  ballot_id uuid not null,
  poll_id uuid not null,
  candidate_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (ballot_id, candidate_id),
  constraint ballot_choices_ballot_fk
    foreign key (ballot_id, poll_id)
    references public.ballots (id, poll_id)
    on delete cascade,
  constraint ballot_choices_candidate_fk
    foreign key (candidate_id, poll_id)
    references public.poll_candidates (id, poll_id)
    on delete restrict
);

create index ballot_choices_poll_candidate_idx
  on public.ballot_choices (poll_id, candidate_id);

create table public.poll_results (
  poll_id uuid not null references public.polls (id) on delete restrict,
  candidate_id uuid not null,
  vote_count integer not null,
  rank integer not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, candidate_id),
  constraint poll_results_candidate_fk
    foreign key (candidate_id, poll_id)
    references public.poll_candidates (id, poll_id)
    on delete restrict,
  constraint poll_results_vote_count_check check (vote_count >= 0),
  constraint poll_results_rank_check check (rank >= 1)
);

create index poll_results_ranking_idx
  on public.poll_results (poll_id, rank, candidate_id);

create table public.winner_history (
  id uuid primary key default extensions.gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  source_poll_id uuid references public.polls (id) on delete restrict,
  source public.winner_source not null,
  won_on date not null default current_date,
  notes text,
  created_by_admin text,
  created_at timestamptz not null default now(),
  constraint winner_history_source_check check (
    (source in ('automatic', 'tie_break') and source_poll_id is not null)
    or (source = 'manual' and source_poll_id is null)
  ),
  constraint winner_history_admin_check check (
    (source = 'automatic' and created_by_admin is null)
    or (
      source in ('tie_break', 'manual')
      and created_by_admin is not null
      and btrim(created_by_admin) <> ''
      and char_length(created_by_admin) <= 320
    )
  ),
  constraint winner_history_notes_check
    check (notes is null or char_length(notes) <= 1000)
);

create unique index winner_history_source_poll_key
  on public.winner_history (source_poll_id)
  where source_poll_id is not null;

create index winner_history_restaurant_won_on_idx
  on public.winner_history (restaurant_id, won_on desc, created_at desc);

create table public.poll_events (
  id bigint generated always as identity primary key,
  poll_id uuid not null references public.polls (id) on delete restrict,
  event_type text not null,
  actor_type public.event_actor_type not null,
  actor_identifier text,
  voter_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint poll_events_voter_fk
    foreign key (voter_id, poll_id)
    references public.poll_voters (id, poll_id)
    on delete restrict,
  constraint poll_events_type_check
    check (event_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint poll_events_actor_check check (
    (actor_type = 'voter' and voter_id is not null and actor_identifier is null)
    or (
      actor_type = 'admin'
      and voter_id is null
      and actor_identifier is not null
      and btrim(actor_identifier) <> ''
      and char_length(actor_identifier) <= 320
    )
    or (actor_type = 'system' and voter_id is null)
  ),
  constraint poll_events_payload_check check (jsonb_typeof(payload) = 'object')
);

create index poll_events_poll_created_at_idx
  on public.poll_events (poll_id, created_at, id);

create or replace function public.enforce_poll_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.access_version < old.access_version then
    raise exception using errcode = '22023', message = 'Poll access version cannot decrease';
  end if;

  if old.status in ('voting', 'closed') and (
    new.lunch_center_id is distinct from old.lunch_center_id
    or new.center_name is distinct from old.center_name
    or new.center_address is distinct from old.center_address
    or new.center_google_place_id is distinct from old.center_google_place_id
    or new.center_latitude is distinct from old.center_latitude
    or new.center_longitude is distinct from old.center_longitude
    or new.vote_limit is distinct from old.vote_limit
    or new.nominations_enabled is distinct from old.nominations_enabled
  ) then
    raise exception using errcode = '55000', message = 'Poll configuration is locked once voting starts';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status = 'nominations' and new.nominations_enabled)
    or (old.status = 'draft' and new.status = 'voting' and not new.nominations_enabled)
    or (old.status = 'nominations' and new.status = 'voting')
    or (old.status = 'voting' and new.status = 'closed')
  ) then
    raise exception using errcode = '55000', message = 'Invalid poll lifecycle transition';
  end if;

  if old.status = 'closed' then
    if new.status <> 'closed' or new.closed_at is distinct from old.closed_at then
      raise exception using errcode = '55000', message = 'Closed polls cannot be reopened';
    end if;

    if old.outcome_status = 'tie' then
      if new.outcome_status not in ('tie', 'resolved_tie') then
        raise exception using errcode = '55000', message = 'A tied poll can only remain tied or be resolved';
      end if;
    elsif new.outcome_status is distinct from old.outcome_status
      or new.official_winner_candidate_id is distinct from old.official_winner_candidate_id then
      raise exception using errcode = '55000', message = 'Closed poll outcome is immutable';
    end if;
  end if;

  return new;
end;
$$;

create trigger polls_enforce_update
before update on public.polls
for each row execute function public.enforce_poll_update();

create or replace function public.enforce_candidate_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  active_count integer;
  nomination_count integer;
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'Candidates cannot be deleted; mark them inactive instead';
  end if;

  select *
  into poll_row
  from public.polls
  where id = new.poll_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'Poll does not exist';
  end if;

  if tg_op = 'INSERT' then
    if new.source = 'voter' then
      if poll_row.status <> 'nominations' or not poll_row.nominations_enabled then
        raise exception using errcode = '55000', message = 'Voter nominations are not open';
      end if;

      select count(*)
      into nomination_count
      from public.poll_candidates
      where poll_id = new.poll_id
        and source = 'voter'
        and nominated_by_voter_id = new.nominated_by_voter_id;

      if nomination_count >= 5 then
        raise exception using errcode = '54000', message = 'A voter may nominate at most five restaurants per poll';
      end if;
    elsif poll_row.status not in ('draft', 'nominations') then
      raise exception using errcode = '55000', message = 'Candidates are locked once voting starts';
    end if;

    if new.is_active then
      select count(*)
      into active_count
      from public.poll_candidates
      where poll_id = new.poll_id and is_active;

      if active_count >= 50 then
        raise exception using errcode = '54000', message = 'A poll may have at most 50 active candidates';
      end if;
    end if;
  else
    if new.poll_id is distinct from old.poll_id
      or new.restaurant_id is distinct from old.restaurant_id
      or new.source is distinct from old.source
      or new.nominated_by_voter_id is distinct from old.nominated_by_voter_id
      or new.created_at is distinct from old.created_at then
      raise exception using errcode = '55000', message = 'Candidate identity is immutable';
    end if;

    if poll_row.status in ('voting', 'closed') and new is distinct from old then
      raise exception using errcode = '55000', message = 'Candidates are locked once voting starts';
    end if;

    if not old.is_active and new.is_active then
      select count(*)
      into active_count
      from public.poll_candidates
      where poll_id = new.poll_id and is_active;

      if active_count >= 50 then
        raise exception using errcode = '54000', message = 'A poll may have at most 50 active candidates';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger poll_candidates_enforce_write
before insert or update or delete on public.poll_candidates
for each row execute function public.enforce_candidate_write();

create or replace function public.reject_immutable_row_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception using errcode = '55000', message = format('%I rows are immutable', tg_table_name);
end;
$$;

create trigger poll_results_immutable
before update or delete on public.poll_results
for each row execute function public.reject_immutable_row_change();

create trigger poll_events_immutable
before update or delete on public.poll_events
for each row execute function public.reject_immutable_row_change();

-- Browser roles intentionally receive no table policies. All public and admin access
-- goes through trusted Next.js server code, and mutations use the RPCs in the next migration.
alter table public.lunch_centers enable row level security;
alter table public.restaurants enable row level security;
alter table public.polls enable row level security;
alter table public.poll_voters enable row level security;
alter table public.poll_candidates enable row level security;
alter table public.ballots enable row level security;
alter table public.ballot_choices enable row level security;
alter table public.poll_results enable row level security;
alter table public.winner_history enable row level security;
alter table public.poll_events enable row level security;

revoke all on table public.lunch_centers from anon, authenticated;
revoke all on table public.restaurants from anon, authenticated;
revoke all on table public.polls from anon, authenticated;
revoke all on table public.poll_voters from anon, authenticated;
revoke all on table public.poll_candidates from anon, authenticated;
revoke all on table public.ballots from anon, authenticated;
revoke all on table public.ballot_choices from anon, authenticated;
revoke all on table public.poll_results from anon, authenticated;
revoke all on table public.winner_history from anon, authenticated;
revoke all on table public.poll_events from anon, authenticated;
revoke all on sequence public.poll_events_id_seq from anon, authenticated;

grant select, insert, update, delete on table public.lunch_centers to service_role;
grant select, insert, update, delete on table public.restaurants to service_role;
grant select, insert, update, delete on table public.polls to service_role;
grant select, insert, update, delete on table public.poll_voters to service_role;
grant select, insert, update, delete on table public.poll_candidates to service_role;
grant select, insert, update, delete on table public.ballots to service_role;
grant select, insert, update, delete on table public.ballot_choices to service_role;
grant select, insert, update, delete on table public.poll_results to service_role;
grant select, insert, update, delete on table public.winner_history to service_role;
grant select, insert, update, delete on table public.poll_events to service_role;
grant usage, select on sequence public.poll_events_id_seq to service_role;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.normalize_voter_name() from public, anon, authenticated;
revoke execute on function public.enforce_poll_update() from public, anon, authenticated;
revoke execute on function public.enforce_candidate_write() from public, anon, authenticated;
revoke execute on function public.reject_immutable_row_change() from public, anon, authenticated;
