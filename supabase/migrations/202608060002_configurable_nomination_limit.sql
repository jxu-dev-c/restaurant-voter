alter table public.polls
  add column nomination_limit integer not null default 5,
  add constraint polls_nomination_limit_check
    check (nomination_limit between 1 and 50);

create or replace function public.enforce_nomination_limit_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.status in ('voting', 'closed')
    and new.nomination_limit is distinct from old.nomination_limit then
    raise exception using
      errcode = '55000',
      message = 'Poll configuration is locked once voting starts';
  end if;

  return new;
end;
$$;

create trigger polls_enforce_nomination_limit_update
before update of nomination_limit on public.polls
for each row execute function public.enforce_nomination_limit_update();

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
