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
    if current_setting('restaurant_voter.allow_candidate_delete', true) = 'on' then
      return old;
    end if;

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

      if nomination_count >= poll_row.nomination_limit then
        raise exception using
          errcode = '54000',
          message = format(
            'A voter may nominate at most %s restaurants per poll',
            poll_row.nomination_limit
          );
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

create or replace function public.remove_voter_nomination(
  p_poll_id uuid,
  p_voter_id uuid,
  p_candidate_id uuid
)
returns table (
  candidate_id uuid,
  restaurant_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  candidate_row public.poll_candidates%rowtype;
begin
  select *
  into poll_row
  from public.polls
  where id = p_poll_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Poll not found';
  end if;

  if poll_row.status <> 'nominations' or not poll_row.nominations_enabled then
    raise exception using errcode = '55000', message = 'Restaurant nominations are closed';
  end if;

  perform 1
  from public.poll_voters pv
  where pv.id = p_voter_id
    and pv.poll_id = p_poll_id
    and pv.anonymized_at is null;

  if not found then
    raise exception using errcode = '22023', message = 'Voter does not belong to this poll';
  end if;

  select *
  into candidate_row
  from public.poll_candidates pc
  where pc.id = p_candidate_id
    and pc.poll_id = p_poll_id
    and pc.source = 'voter'
    and pc.nominated_by_voter_id = p_voter_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Nomination not found';
  end if;

  perform set_config('restaurant_voter.allow_candidate_delete', 'on', true);

  delete from public.poll_candidates
  where id = candidate_row.id;

  perform set_config('restaurant_voter.allow_candidate_delete', 'off', true);

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    voter_id,
    payload
  ) values (
    p_poll_id,
    'nomination_removed',
    'voter',
    p_voter_id,
    jsonb_build_object(
      'candidate_id', candidate_row.id,
      'restaurant_id', candidate_row.restaurant_id
    )
  );

  return query select candidate_row.id, candidate_row.restaurant_id;
end;
$$;

revoke execute on function public.remove_voter_nomination(uuid, uuid, uuid)
from public, anon, authenticated;

grant execute on function public.remove_voter_nomination(uuid, uuid, uuid)
to service_role;
