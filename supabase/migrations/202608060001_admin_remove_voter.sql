-- Allow an administrator to remove a voter and their ballot before results are finalized.
-- The voter row is anonymized rather than physically deleted because immutable audit
-- events and voter-created nominations retain relational references to it.

create table public.poll_voter_blocks (
  poll_id uuid not null references public.polls (id) on delete cascade,
  device_hash text not null,
  removed_at timestamptz not null default now(),
  removed_by_admin text not null,
  primary key (poll_id, device_hash),
  constraint poll_voter_blocks_device_hash_check
    check (device_hash ~ '^[A-Za-z0-9_-]{43}$'),
  constraint poll_voter_blocks_admin_check
    check (btrim(removed_by_admin) <> '' and char_length(removed_by_admin) <= 320)
);

alter table public.poll_voter_blocks enable row level security;
revoke all on table public.poll_voter_blocks from anon, authenticated;
grant select, insert, update, delete on table public.poll_voter_blocks to service_role;

create or replace function public.prevent_blocked_voter_registration()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.poll_voter_blocks pvb
    where pvb.poll_id = new.poll_id and pvb.device_hash = new.device_hash
  ) then
    raise exception using
      errcode = '42501',
      message = 'This voter was removed by the organizer';
  end if;

  return new;
end;
$$;

create trigger poll_voters_prevent_blocked_registration
before insert on public.poll_voters
for each row execute function public.prevent_blocked_voter_registration();

create or replace function public.remove_poll_voter(
  p_poll_id uuid,
  p_admin_email text,
  p_voter_id uuid
)
returns table (
  removed_voter_id uuid,
  deleted_ballot_count integer,
  deleted_choice_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  matched_voter_id uuid;
  matched_device_hash text;
begin
  perform public.require_admin_identifier(p_admin_email);

  select *
  into poll_row
  from public.polls
  where id = p_poll_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Poll not found';
  end if;

  if poll_row.status = 'closed' then
    raise exception using errcode = '55000', message = 'Voters cannot be removed after the poll closes';
  end if;

  select pv.id, pv.device_hash
  into matched_voter_id, matched_device_hash
  from public.poll_voters pv
  where pv.id = p_voter_id
    and pv.poll_id = p_poll_id
    and pv.anonymized_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Voter not found';
  end if;

  select count(*)::integer
  into deleted_choice_count
  from public.ballot_choices bc
  join public.ballots b
    on b.id = bc.ballot_id and b.poll_id = bc.poll_id
  where b.poll_id = p_poll_id and b.voter_id = matched_voter_id;

  delete from public.ballots b
  where b.poll_id = p_poll_id and b.voter_id = matched_voter_id;

  get diagnostics deleted_ballot_count = row_count;

  insert into public.poll_voter_blocks (
    poll_id,
    device_hash,
    removed_by_admin
  ) values (
    p_poll_id,
    matched_device_hash,
    lower(btrim(p_admin_email))
  )
  on conflict (poll_id, device_hash) do update
  set
    removed_at = statement_timestamp(),
    removed_by_admin = excluded.removed_by_admin;

  update public.poll_voters pv
  set
    device_hash = null,
    display_name = 'Anonymous voter',
    anonymized_at = statement_timestamp()
  where pv.id = matched_voter_id and pv.poll_id = p_poll_id;

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    actor_identifier,
    payload
  ) values (
    p_poll_id,
    'voter_removed',
    'admin',
    lower(btrim(p_admin_email)),
    jsonb_build_object(
      'deleted_ballot_count', deleted_ballot_count,
      'deleted_choice_count', deleted_choice_count
    )
  );

  return query
  select matched_voter_id, deleted_ballot_count, deleted_choice_count;
end;
$$;

revoke execute on function public.remove_poll_voter(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.remove_poll_voter(uuid, text, uuid)
  to service_role;
