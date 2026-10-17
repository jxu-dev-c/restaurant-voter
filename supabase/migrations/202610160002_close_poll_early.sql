-- Organizers can close a draft or nominations poll early. It closes with the
-- cancelled outcome: no ballots, no results, no winner, and no reopening.

alter table public.polls drop constraint polls_lifecycle_check;
alter table public.polls add constraint polls_lifecycle_check check (
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
    and outcome_status not in ('pending', 'cancelled')
    and voting_started_at is not null
    and closed_at is not null
  )
  or (
    status = 'closed'
    and outcome_status = 'cancelled'
    and voting_started_at is null
    and closed_at is not null
  )
);

alter table public.polls drop constraint polls_official_winner_check;
alter table public.polls add constraint polls_official_winner_check check (
  (
    outcome_status in ('unique_winner', 'resolved_tie')
    and official_winner_candidate_id is not null
  )
  or (
    outcome_status in ('pending', 'no_votes', 'tie', 'cancelled')
    and official_winner_candidate_id is null
  )
);

create or replace function public.enforce_poll_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  active_candidate_count integer;
begin
  if new.access_version < old.access_version then
    raise exception using errcode = '22023', message = 'Poll access version cannot decrease';
  end if;

  if old.status = 'closed' and (
    new.lunch_center_id is distinct from old.lunch_center_id
    or new.center_name is distinct from old.center_name
    or new.center_address is distinct from old.center_address
    or new.center_google_place_id is distinct from old.center_google_place_id
    or new.center_latitude is distinct from old.center_latitude
    or new.center_longitude is distinct from old.center_longitude
    or new.vote_limit is distinct from old.vote_limit
    or new.nominations_enabled is distinct from old.nominations_enabled
  ) then
    raise exception using errcode = '55000', message = 'Poll configuration is locked once voting closes';
  end if;

  if old.status = 'voting' and (
    new.lunch_center_id is distinct from old.lunch_center_id
    or new.center_name is distinct from old.center_name
    or new.center_address is distinct from old.center_address
    or new.center_google_place_id is distinct from old.center_google_place_id
    or new.center_latitude is distinct from old.center_latitude
    or new.center_longitude is distinct from old.center_longitude
    or new.vote_limit < old.vote_limit
    or new.nominations_enabled is distinct from old.nominations_enabled
  ) then
    raise exception using errcode = '55000', message = 'Poll configuration can only increase the choice limit once voting starts';
  end if;

  if old.status = 'voting' and new.vote_limit > old.vote_limit then
    select count(*)::integer
    into active_candidate_count
    from public.poll_candidates pc
    where pc.poll_id = old.id and pc.is_active;

    if new.vote_limit > active_candidate_count then
      raise exception using
        errcode = '22023',
        message = format(
          'Choices per voter cannot exceed the %s active restaurants',
          active_candidate_count
        );
    end if;
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status = 'nominations' and new.nominations_enabled)
    or (old.status = 'draft' and new.status = 'voting' and not new.nominations_enabled)
    or (old.status = 'nominations' and new.status = 'voting')
    or (old.status = 'voting' and new.status = 'closed')
    or (
      old.status in ('draft', 'nominations')
      and new.status = 'closed'
      and new.outcome_status = 'cancelled'
    )
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

create or replace function public.close_poll_early(
  p_poll_id uuid,
  p_admin_email text
)
returns public.polls
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  old_status public.poll_status;
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

  if poll_row.status not in ('draft', 'nominations') then
    raise exception using
      errcode = '55000',
      message = 'Only a draft or nominations poll can be closed early; use close_poll during voting';
  end if;

  old_status := poll_row.status;

  update public.polls p
  set
    status = 'closed',
    outcome_status = 'cancelled',
    closed_at = statement_timestamp()
  where p.id = p_poll_id
  returning * into poll_row;

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    actor_identifier,
    payload
  ) values (
    p_poll_id,
    'poll_closed_early',
    'admin',
    lower(btrim(p_admin_email)),
    jsonb_build_object('from', old_status)
  );

  return poll_row;
end;
$$;

revoke execute on function public.close_poll_early(uuid, text)
from public, anon, authenticated;

grant execute on function public.close_poll_early(uuid, text)
to service_role;
