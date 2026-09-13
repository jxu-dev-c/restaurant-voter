-- Restaurant Voter v1: service-role-only transactional mutation API.

create or replace function public.require_admin_identifier(p_admin_email text)
returns void
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
begin
  if p_admin_email is null
    or btrim(p_admin_email) = ''
    or char_length(p_admin_email) > 320 then
    raise exception using errcode = '22023', message = 'A valid admin identifier is required';
  end if;
end;
$$;

create or replace function public.register_poll_voter(
  p_poll_id uuid,
  p_device_hash text,
  p_display_name text
)
returns table (
  voter_id uuid,
  display_name text,
  voter_code text,
  is_new boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  voter_row public.poll_voters%rowtype;
begin
  if p_device_hash is null or p_device_hash !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception using errcode = '22023', message = 'Device hash must be a base64url SHA-256 digest';
  end if;

  select *
  into poll_row
  from public.polls
  where id = p_poll_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Poll not found';
  end if;

  if poll_row.status not in ('nominations', 'voting') then
    raise exception using errcode = '55000', message = 'Voter registration is not open';
  end if;

  select *
  into voter_row
  from public.poll_voters pv
  where pv.poll_id = p_poll_id and pv.device_hash = p_device_hash
  for update;

  if found then
    update public.poll_voters pv
    set last_seen_at = statement_timestamp()
    where pv.id = voter_row.id
    returning pv.* into voter_row;

    return query
    select voter_row.id, voter_row.display_name, voter_row.voter_code, false;
    return;
  end if;

  insert into public.poll_voters (poll_id, device_hash, display_name, normalized_name)
  values (p_poll_id, p_device_hash, p_display_name, 'pending-trigger-normalization')
  returning * into voter_row;

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    voter_id
  ) values (
    p_poll_id,
    'voter_registered',
    'voter',
    voter_row.id
  );

  return query
  select voter_row.id, voter_row.display_name, voter_row.voter_code, true;
end;
$$;

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

  insert into public.restaurants (google_place_id, fallback_label)
  values (
    btrim(p_google_place_id),
    nullif(btrim(p_fallback_label), '')
  )
  on conflict (google_place_id) do update
  set fallback_label = coalesce(public.restaurants.fallback_label, excluded.fallback_label)
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
    nominated_by_voter_id
  ) values (
    p_poll_id,
    restaurant_row.id,
    'voter',
    p_voter_id
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

  insert into public.restaurants (google_place_id, fallback_label)
  values (
    btrim(p_google_place_id),
    nullif(btrim(p_fallback_label), '')
  )
  on conflict (google_place_id) do update
  set fallback_label = coalesce(public.restaurants.fallback_label, excluded.fallback_label)
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

  insert into public.poll_candidates (poll_id, restaurant_id, source)
  values (p_poll_id, restaurant_row.id, 'admin')
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

create or replace function public.set_candidate_active(
  p_poll_id uuid,
  p_admin_email text,
  p_candidate_id uuid,
  p_is_active boolean
)
returns public.poll_candidates
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  candidate_row public.poll_candidates%rowtype;
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
    raise exception using errcode = '55000', message = 'Candidates are locked once voting starts';
  end if;

  select *
  into candidate_row
  from public.poll_candidates pc
  where pc.id = p_candidate_id and pc.poll_id = p_poll_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Candidate not found';
  end if;

  if candidate_row.is_active = p_is_active then
    return candidate_row;
  end if;

  update public.poll_candidates pc
  set
    is_active = p_is_active,
    removed_at = case when p_is_active then null else statement_timestamp() end,
    removed_by_admin = case when p_is_active then null else lower(btrim(p_admin_email)) end
  where pc.id = p_candidate_id
  returning * into candidate_row;

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    actor_identifier,
    payload
  ) values (
    p_poll_id,
    case when p_is_active then 'candidate_restored' else 'candidate_removed' end,
    'admin',
    lower(btrim(p_admin_email)),
    jsonb_build_object('candidate_id', p_candidate_id)
  );

  return candidate_row;
end;
$$;

create or replace function public.transition_poll(
  p_poll_id uuid,
  p_admin_email text,
  p_target_status public.poll_status
)
returns public.polls
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  old_status public.poll_status;
  active_candidate_count integer;
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

  old_status := poll_row.status;

  if p_target_status = 'closed' then
    raise exception using errcode = '55000', message = 'Use close_poll to close and snapshot a poll';
  end if;

  if p_target_status = 'nominations' then
    if poll_row.status <> 'draft' or not poll_row.nominations_enabled then
      raise exception using errcode = '55000', message = 'Nominations can only open from an eligible draft';
    end if;

    update public.polls p
    set
      status = 'nominations',
      nominations_started_at = statement_timestamp()
    where p.id = p_poll_id
    returning * into poll_row;
  elsif p_target_status = 'voting' then
    if not (
      poll_row.status = 'nominations'
      or (poll_row.status = 'draft' and not poll_row.nominations_enabled)
    ) then
      raise exception using errcode = '55000', message = 'Voting cannot open from the current phase';
    end if;

    select count(*)
    into active_candidate_count
    from public.poll_candidates pc
    where pc.poll_id = p_poll_id and pc.is_active;

    if active_candidate_count = 0 then
      raise exception using errcode = '55000', message = 'At least one active candidate is required to open voting';
    end if;

    update public.polls p
    set
      status = 'voting',
      voting_started_at = statement_timestamp()
    where p.id = p_poll_id
    returning * into poll_row;
  else
    raise exception using errcode = '55000', message = 'Poll lifecycle only moves forward';
  end if;

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    actor_identifier,
    payload
  ) values (
    p_poll_id,
    'poll_transitioned',
    'admin',
    lower(btrim(p_admin_email)),
    jsonb_build_object('from', old_status, 'to', poll_row.status)
  );

  return poll_row;
end;
$$;

create or replace function public.save_ballot(
  p_poll_id uuid,
  p_voter_id uuid,
  p_candidate_ids uuid[],
  p_expected_revision integer
)
returns table (
  ballot_id uuid,
  revision integer,
  choice_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  ballot_row public.ballots%rowtype;
  requested_count integer;
  distinct_count integer;
  valid_count integer;
begin
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'Expected revision must be zero or greater';
  end if;

  if p_candidate_ids is null then
    raise exception using errcode = '22023', message = 'At least one candidate must be selected';
  end if;

  requested_count := cardinality(p_candidate_ids);

  if requested_count = 0 or array_position(p_candidate_ids, null) is not null then
    raise exception using errcode = '22023', message = 'At least one valid candidate must be selected';
  end if;

  select count(distinct candidate_id)::integer
  into distinct_count
  from unnest(p_candidate_ids) as selected(candidate_id);

  if distinct_count <> requested_count then
    raise exception using errcode = '22023', message = 'Ballot selections must be distinct';
  end if;

  select *
  into poll_row
  from public.polls
  where id = p_poll_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Poll not found';
  end if;

  if poll_row.status <> 'voting' then
    raise exception using errcode = '55000', message = 'Voting is not open';
  end if;

  if requested_count > poll_row.vote_limit then
    raise exception using
      errcode = '22023',
      message = format('A ballot may select at most %s candidates', poll_row.vote_limit);
  end if;

  perform 1
  from public.poll_voters pv
  where pv.id = p_voter_id
    and pv.poll_id = p_poll_id
    and pv.anonymized_at is null;

  if not found then
    raise exception using errcode = '22023', message = 'Voter does not belong to this poll';
  end if;

  select count(*)::integer
  into valid_count
  from public.poll_candidates pc
  join unnest(p_candidate_ids) as selected(candidate_id)
    on selected.candidate_id = pc.id
  where pc.poll_id = p_poll_id and pc.is_active;

  if valid_count <> requested_count then
    raise exception using errcode = '22023', message = 'Every selection must be an active candidate in this poll';
  end if;

  select *
  into ballot_row
  from public.ballots b
  where b.poll_id = p_poll_id and b.voter_id = p_voter_id
  for update;

  if not found then
    if p_expected_revision <> 0 then
      raise exception using errcode = 'PT409', message = 'Ballot revision conflict';
    end if;

    insert into public.ballots (
      poll_id,
      voter_id,
      revision,
      is_submitted,
      submitted_at,
      withdrawn_at
    ) values (
      p_poll_id,
      p_voter_id,
      1,
      true,
      statement_timestamp(),
      null
    )
    returning * into ballot_row;
  else
    if ballot_row.revision <> p_expected_revision then
      raise exception using errcode = 'PT409', message = 'Ballot revision conflict';
    end if;

    update public.ballots b
    set
      revision = b.revision + 1,
      is_submitted = true,
      submitted_at = statement_timestamp(),
      withdrawn_at = null
    where b.id = ballot_row.id
    returning * into ballot_row;

    delete from public.ballot_choices bc where bc.ballot_id = ballot_row.id;
  end if;

  insert into public.ballot_choices (ballot_id, poll_id, candidate_id)
  select ballot_row.id, p_poll_id, selected.candidate_id
  from unnest(p_candidate_ids) as selected(candidate_id);

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    voter_id,
    payload
  ) values (
    p_poll_id,
    'ballot_saved',
    'voter',
    p_voter_id,
    jsonb_build_object('revision', ballot_row.revision)
  );

  return query select ballot_row.id, ballot_row.revision, requested_count;
end;
$$;

create or replace function public.withdraw_ballot(
  p_poll_id uuid,
  p_voter_id uuid,
  p_expected_revision integer
)
returns table (
  ballot_id uuid,
  revision integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  ballot_row public.ballots%rowtype;
begin
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception using errcode = '22023', message = 'Expected revision must be one or greater';
  end if;

  select *
  into poll_row
  from public.polls
  where id = p_poll_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Poll not found';
  end if;

  if poll_row.status <> 'voting' then
    raise exception using errcode = '55000', message = 'Voting is not open';
  end if;

  select *
  into ballot_row
  from public.ballots b
  where b.poll_id = p_poll_id and b.voter_id = p_voter_id
  for update;

  if not found or not ballot_row.is_submitted then
    raise exception using errcode = 'P0002', message = 'Submitted ballot not found';
  end if;

  if ballot_row.revision <> p_expected_revision then
    raise exception using errcode = 'PT409', message = 'Ballot revision conflict';
  end if;

  delete from public.ballot_choices bc where bc.ballot_id = ballot_row.id;

  update public.ballots b
  set
    revision = b.revision + 1,
    is_submitted = false,
    withdrawn_at = statement_timestamp()
  where b.id = ballot_row.id
  returning * into ballot_row;

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    voter_id,
    payload
  ) values (
    p_poll_id,
    'ballot_withdrawn',
    'voter',
    p_voter_id,
    jsonb_build_object('revision', ballot_row.revision)
  );

  return query select ballot_row.id, ballot_row.revision;
end;
$$;

create or replace function public.close_poll(
  p_poll_id uuid,
  p_admin_email text
)
returns table (
  outcome_status public.poll_outcome_status,
  top_vote_count integer,
  leader_candidate_ids uuid[]
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  submitted_ballot_count integer;
  active_candidate_count integer;
  leader_count integer;
  winning_candidate_id uuid;
  winning_restaurant_id uuid;
  resolved_outcome public.poll_outcome_status;
  resolved_top_count integer;
  resolved_leaders uuid[];
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

  if poll_row.status <> 'voting' then
    raise exception using errcode = '55000', message = 'Only a voting poll can be closed';
  end if;

  select count(*)::integer
  into active_candidate_count
  from public.poll_candidates pc
  where pc.poll_id = p_poll_id and pc.is_active;

  if active_candidate_count = 0 then
    raise exception using errcode = '55000', message = 'Cannot close a poll without active candidates';
  end if;

  insert into public.poll_results (poll_id, candidate_id, vote_count, rank)
  select
    p_poll_id,
    pc.id,
    count(b.id)::integer as vote_count,
    dense_rank() over (order by count(b.id) desc)::integer as rank
  from public.poll_candidates pc
  left join public.ballot_choices bc
    on bc.poll_id = pc.poll_id and bc.candidate_id = pc.id
  left join public.ballots b
    on b.id = bc.ballot_id and b.poll_id = p_poll_id and b.is_submitted
  where pc.poll_id = p_poll_id and pc.is_active
  group by pc.id;

  select count(*)::integer
  into submitted_ballot_count
  from public.ballots b
  where b.poll_id = p_poll_id and b.is_submitted;

  if submitted_ballot_count = 0 then
    resolved_outcome := 'no_votes';
    resolved_top_count := 0;
    resolved_leaders := array[]::uuid[];
  else
    select max(pr.vote_count)
    into resolved_top_count
    from public.poll_results pr
    where pr.poll_id = p_poll_id;

    select
      count(*)::integer,
      array_agg(pr.candidate_id order by pr.candidate_id)
    into leader_count, resolved_leaders
    from public.poll_results pr
    where pr.poll_id = p_poll_id and pr.vote_count = resolved_top_count;

    if leader_count = 1 then
      resolved_outcome := 'unique_winner';
      winning_candidate_id := resolved_leaders[1];

      select pc.restaurant_id
      into winning_restaurant_id
      from public.poll_candidates pc
      where pc.id = winning_candidate_id and pc.poll_id = p_poll_id;
    else
      resolved_outcome := 'tie';
    end if;
  end if;

  update public.polls p
  set
    status = 'closed',
    outcome_status = resolved_outcome,
    official_winner_candidate_id = winning_candidate_id,
    closed_at = statement_timestamp()
  where p.id = p_poll_id
  returning * into poll_row;

  if resolved_outcome = 'unique_winner' then
    insert into public.winner_history (
      restaurant_id,
      source_poll_id,
      source,
      won_on
    ) values (
      winning_restaurant_id,
      p_poll_id,
      'automatic',
      current_date
    );
  end if;

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    actor_identifier,
    payload
  ) values (
    p_poll_id,
    'poll_closed',
    'admin',
    lower(btrim(p_admin_email)),
    jsonb_build_object(
      'outcome', resolved_outcome,
      'top_vote_count', resolved_top_count,
      'leader_candidate_ids', to_jsonb(resolved_leaders)
    )
  );

  return query select resolved_outcome, resolved_top_count, resolved_leaders;
end;
$$;

create or replace function public.resolve_tie(
  p_poll_id uuid,
  p_admin_email text,
  p_candidate_id uuid
)
returns public.polls
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  poll_row public.polls%rowtype;
  winning_restaurant_id uuid;
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

  if poll_row.status <> 'closed' or poll_row.outcome_status <> 'tie' then
    raise exception using errcode = '55000', message = 'Poll does not have an unresolved top tie';
  end if;

  select pc.restaurant_id
  into winning_restaurant_id
  from public.poll_results pr
  join public.poll_candidates pc
    on pc.id = pr.candidate_id and pc.poll_id = pr.poll_id
  where pr.poll_id = p_poll_id
    and pr.candidate_id = p_candidate_id
    and pr.rank = 1;

  if not found then
    raise exception using errcode = '22023', message = 'Winner must be one of the tied leaders';
  end if;

  update public.polls p
  set
    outcome_status = 'resolved_tie',
    official_winner_candidate_id = p_candidate_id
  where p.id = p_poll_id
  returning * into poll_row;

  insert into public.winner_history (
    restaurant_id,
    source_poll_id,
    source,
    won_on,
    created_by_admin
  ) values (
    winning_restaurant_id,
    p_poll_id,
    'tie_break',
    current_date,
    lower(btrim(p_admin_email))
  );

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    actor_identifier,
    payload
  ) values (
    p_poll_id,
    'tie_resolved',
    'admin',
    lower(btrim(p_admin_email)),
    jsonb_build_object('candidate_id', p_candidate_id)
  );

  return poll_row;
end;
$$;

create or replace function public.rotate_poll_access(
  p_poll_id uuid,
  p_admin_email text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_access_version integer;
begin
  perform public.require_admin_identifier(p_admin_email);

  update public.polls p
  set access_version = p.access_version + 1
  where p.id = p_poll_id
  returning p.access_version into new_access_version;

  if not found then
    raise exception using errcode = 'P0002', message = 'Poll not found';
  end if;

  insert into public.poll_events (
    poll_id,
    event_type,
    actor_type,
    actor_identifier,
    payload
  ) values (
    p_poll_id,
    'access_rotated',
    'admin',
    lower(btrim(p_admin_email)),
    jsonb_build_object('access_version', new_access_version)
  );

  return new_access_version;
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

  insert into public.restaurants (google_place_id, fallback_label)
  values (btrim(p_google_place_id), nullif(btrim(p_fallback_label), ''))
  on conflict (google_place_id) do update
  set fallback_label = coalesce(public.restaurants.fallback_label, excluded.fallback_label)
  returning * into restaurant_row;

  insert into public.winner_history (
    restaurant_id,
    source,
    won_on,
    notes,
    created_by_admin
  ) values (
    restaurant_row.id,
    'manual',
    p_won_on,
    nullif(btrim(p_notes), ''),
    lower(btrim(p_admin_email))
  )
  returning * into history_row;

  return history_row;
end;
$$;

create or replace function public.anonymize_closed_poll_voters(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  anonymized_count integer;
begin
  update public.poll_voters pv
  set
    device_hash = null,
    display_name = 'Anonymous voter',
    normalized_name = 'anonymous voter',
    anonymized_at = p_now,
    last_seen_at = least(pv.last_seen_at, p_now)
  from public.polls p
  where p.id = pv.poll_id
    and p.status = 'closed'
    and p.closed_at <= p_now - interval '90 days'
    and pv.anonymized_at is null;

  get diagnostics anonymized_count = row_count;
  return anonymized_count;
end;
$$;

-- Function execution is intentionally restricted to the server's service role.
revoke execute on function public.require_admin_identifier(text) from public, anon, authenticated;
revoke execute on function public.register_poll_voter(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.nominate_restaurant(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.seed_poll_candidate(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.set_candidate_active(uuid, text, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.transition_poll(uuid, text, public.poll_status) from public, anon, authenticated;
revoke execute on function public.save_ballot(uuid, uuid, uuid[], integer) from public, anon, authenticated;
revoke execute on function public.withdraw_ballot(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.close_poll(uuid, text) from public, anon, authenticated;
revoke execute on function public.resolve_tie(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.rotate_poll_access(uuid, text) from public, anon, authenticated;
revoke execute on function public.add_manual_winner(text, text, text, date, text) from public, anon, authenticated;
revoke execute on function public.anonymize_closed_poll_voters(timestamptz) from public, anon, authenticated;

grant execute on function public.register_poll_voter(uuid, text, text) to service_role;
grant execute on function public.nominate_restaurant(uuid, uuid, text, text) to service_role;
grant execute on function public.seed_poll_candidate(uuid, text, text, text) to service_role;
grant execute on function public.set_candidate_active(uuid, text, uuid, boolean) to service_role;
grant execute on function public.transition_poll(uuid, text, public.poll_status) to service_role;
grant execute on function public.save_ballot(uuid, uuid, uuid[], integer) to service_role;
grant execute on function public.withdraw_ballot(uuid, uuid, integer) to service_role;
grant execute on function public.close_poll(uuid, text) to service_role;
grant execute on function public.resolve_tie(uuid, text, uuid) to service_role;
grant execute on function public.rotate_poll_access(uuid, text) to service_role;
grant execute on function public.add_manual_winner(text, text, text, date, text) to service_role;
grant execute on function public.anonymize_closed_poll_voters(timestamptz) to service_role;
