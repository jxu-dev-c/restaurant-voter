begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select ok(
  has_function_privilege('service_role', 'public.close_poll_early(uuid, text)', 'EXECUTE'),
  'service role can close a poll early'
);

select ok(
  not has_function_privilege('anon', 'public.close_poll_early(uuid, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.close_poll_early(uuid, text)', 'EXECUTE'),
  'browser roles cannot close a poll early'
);

insert into public.lunch_centers (
  id, name, latitude, longitude, created_by_admin
) values (
  'c0000000-0000-4000-8000-000000000001',
  'Early close office',
  44.6488,
  -63.5752,
  'admin@example.com'
);

insert into public.polls (
  id, public_id, title, lunch_center_id, center_name, center_latitude,
  center_longitude, vote_limit, nominations_enabled, created_by_admin
) values
  (
    'c1000000-0000-4000-8000-000000000001',
    'test-early-close-draft',
    'Draft closed early',
    'c0000000-0000-4000-8000-000000000001',
    'Early close office',
    44.6488,
    -63.5752,
    1,
    true,
    'admin@example.com'
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    'test-early-close-noms',
    'Nominations closed early',
    'c0000000-0000-4000-8000-000000000001',
    'Early close office',
    44.6488,
    -63.5752,
    1,
    true,
    'admin@example.com'
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    'test-early-close-voting',
    'Voting cannot close early',
    'c0000000-0000-4000-8000-000000000001',
    'Early close office',
    44.6488,
    -63.5752,
    1,
    false,
    'admin@example.com'
  );

-- A draft closes straight to the cancelled outcome.
select lives_ok(
  $$select * from public.close_poll_early('c1000000-0000-4000-8000-000000000001', 'admin@example.com')$$,
  'a draft poll can be closed early'
);

select results_eq(
  $$select status::text, outcome_status::text, closed_at is not null, voting_started_at is null, official_winner_candidate_id is null
    from public.polls where id = 'c1000000-0000-4000-8000-000000000001'$$,
  $$values ('closed', 'cancelled', true, true, true)$$,
  'an early-closed draft is closed and cancelled with no winner'
);

select is(
  (select payload ->> 'from' from public.poll_events
    where poll_id = 'c1000000-0000-4000-8000-000000000001' and event_type = 'poll_closed_early'),
  'draft',
  'closing early is recorded with the phase it left'
);

-- A poll with open nominations closes the same way and keeps its shortlist.
select lives_ok(
  $$select * from public.transition_poll('c1000000-0000-4000-8000-000000000002', 'admin@example.com', 'nominations')$$,
  'nominations open'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'c1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    'early-close-place-one',
    'Restaurant One'
  )$$,
  'a candidate is seeded during nominations'
);

select lives_ok(
  $$select * from public.close_poll_early('c1000000-0000-4000-8000-000000000002', 'admin@example.com')$$,
  'a nominations poll can be closed early'
);

select results_eq(
  $$select status::text, outcome_status::text, nominations_started_at is not null
    from public.polls where id = 'c1000000-0000-4000-8000-000000000002'$$,
  $$values ('closed', 'cancelled', true)$$,
  'an early-closed nominations poll is closed and cancelled'
);

select is(
  (select count(*) from public.poll_results where poll_id = 'c1000000-0000-4000-8000-000000000002'),
  0::bigint,
  'closing early publishes no results'
);

select throws_ok(
  $$select * from public.seed_poll_candidate(
    'c1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    'early-close-place-two',
    'Restaurant Two'
  )$$,
  '55000',
  null,
  'candidates are locked once a poll closes early'
);

select throws_ok(
  $$select * from public.transition_poll('c1000000-0000-4000-8000-000000000002', 'admin@example.com', 'voting')$$,
  '55000',
  null,
  'an early-closed poll cannot reopen into voting'
);

select throws_ok(
  $$select * from public.close_poll_early('c1000000-0000-4000-8000-000000000002', 'admin@example.com')$$,
  '55000',
  null,
  'an early-closed poll cannot be closed again'
);

select throws_ok(
  $$update public.polls set outcome_status = 'no_votes' where id = 'c1000000-0000-4000-8000-000000000002'$$,
  '55000',
  null,
  'the cancelled outcome is immutable'
);

-- Voting polls keep their own close path, which publishes results.
select lives_ok(
  $$select * from public.seed_poll_candidate(
    'c1000000-0000-4000-8000-000000000003',
    'admin@example.com',
    'early-close-place-three',
    'Restaurant Three'
  )$$,
  'voting poll candidate is seeded'
);

select lives_ok(
  $$select * from public.transition_poll('c1000000-0000-4000-8000-000000000003', 'admin@example.com', 'voting')$$,
  'voting opens'
);

select throws_ok(
  $$select * from public.close_poll_early('c1000000-0000-4000-8000-000000000003', 'admin@example.com')$$,
  '55000',
  'Only a draft or nominations poll can be closed early; use close_poll during voting',
  'a voting poll must be closed with close_poll'
);

-- The cancelled outcome is only reachable through an early close.
select throws_ok(
  $$update public.polls
    set status = 'closed', outcome_status = 'cancelled', closed_at = now()
    where id = 'c1000000-0000-4000-8000-000000000003'$$,
  '23514',
  null,
  'a poll that reached voting cannot be marked cancelled'
);

select * from finish();
rollback;
