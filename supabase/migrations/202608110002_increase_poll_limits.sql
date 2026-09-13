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

create or replace function public.update_poll_limits(
  p_poll_id uuid,
  p_admin_email text,
  p_vote_limit integer,
  p_nomination_limit integer
)
returns public.polls
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  active_candidate_count integer;
  old_vote_limit integer;
  old_nomination_limit integer;
begin
  perform public.require_admin_identifier(p_admin_email);

  if p_vote_limit is null or p_vote_limit < 1 or p_vote_limit > 10 then
    raise exception using errcode = '22023', message = 'Choices per voter must be between 1 and 10';
  end if;

  if p_nomination_limit is null or p_nomination_limit < 1 or p_nomination_limit > 50 then
    raise exception using errcode = '22023', message = 'Nominations per voter must be between 1 and 50';
  end if;

  select *
  into poll_row
  from public.polls
  where id = p_poll_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Poll not found';
  end if;

  old_vote_limit := poll_row.vote_limit;
  old_nomination_limit := poll_row.nomination_limit;

  if poll_row.status = 'closed' then
    raise exception using errcode = '55000', message = 'Closed poll settings cannot be changed';
  end if;

  if p_vote_limit < poll_row.vote_limit or p_nomination_limit < poll_row.nomination_limit then
    raise exception using errcode = '22023', message = 'Poll limits can only be increased';
  end if;

  if poll_row.status = 'voting' and p_nomination_limit <> poll_row.nomination_limit then
    raise exception using errcode = '55000', message = 'The nomination limit is locked once voting starts';
  end if;

  if poll_row.status = 'voting' and p_vote_limit > poll_row.vote_limit then
    select count(*)::integer
    into active_candidate_count
    from public.poll_candidates pc
    where pc.poll_id = p_poll_id and pc.is_active;

    if p_vote_limit > active_candidate_count then
      raise exception using
        errcode = '22023',
        message = format(
          'Choices per voter cannot exceed the %s active restaurants',
          active_candidate_count
        );
    end if;
  end if;

  if p_vote_limit = poll_row.vote_limit
    and p_nomination_limit = poll_row.nomination_limit then
    return poll_row;
  end if;

  update public.polls p
  set
    vote_limit = p_vote_limit,
    nomination_limit = p_nomination_limit
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
    'poll_limits_increased',
    'admin',
    lower(btrim(p_admin_email)),
    jsonb_build_object(
      'vote_limit', jsonb_build_object('from', old_vote_limit, 'to', p_vote_limit),
      'nomination_limit', jsonb_build_object('from', old_nomination_limit, 'to', p_nomination_limit)
    )
  );

  return poll_row;
end;
$$;

revoke execute on function public.update_poll_limits(uuid, text, integer, integer)
from public, anon, authenticated;

grant execute on function public.update_poll_limits(uuid, text, integer, integer)
to service_role;
