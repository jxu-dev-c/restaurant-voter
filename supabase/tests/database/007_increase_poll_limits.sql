begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select ok(
  has_function_privilege(
    'service_role',
    'public.update_poll_limits(uuid, text, integer, integer)',
    'EXECUTE'
  ),
  'service role can update poll limits'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.update_poll_limits(uuid, text, integer, integer)',
    'EXECUTE'
  ),
  'anonymous users cannot update poll limits'
);

insert into public.lunch_centers (
  id, name, latitude, longitude, created_by_admin
) values (
  'f0000000-0000-4000-8000-000000000001',
  'Limit increase office',
  44.6488,
  -63.5752,
  'admin@example.com'
);

insert into public.polls (
  id, public_id, title, lunch_center_id, center_name, center_latitude,
  center_longitude, vote_limit, nomination_limit, nominations_enabled,
  created_by_admin
) values (
  'f1000000-0000-4000-8000-000000000001',
  'test-increase-poll-limits',
  'Increase poll limits',
  'f0000000-0000-4000-8000-000000000001',
  'Limit increase office',
  44.6488,
  -63.5752,
  2,
  2,
  true,
  'admin@example.com'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'limit-increase-place-one',
    'Restaurant One'
  )$$,
  'first candidate is seeded'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'limit-increase-place-two',
    'Restaurant Two'
  )$$,
  'second candidate is seeded'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'limit-increase-place-three',
    'Restaurant Three'
  )$$,
  'third candidate is seeded'
);

select lives_ok(
  $$select public.transition_poll(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'nominations'
  )$$,
  'poll opens for nominations'
);

select lives_ok(
  $$select public.update_poll_limits(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    2,
    3
  )$$,
  'nomination limit increases before voting'
);

select lives_ok(
  $$select public.transition_poll(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'voting'
  )$$,
  'poll opens for voting'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'f1000000-0000-4000-8000-000000000001',
    repeat('L', 43),
    'Limit voter'
  )$$,
  'voter registers'
);

select lives_ok(
  $$select * from public.save_ballot(
    'f1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'f1000000-0000-4000-8000-000000000001'),
    array(
      select pc.id
      from public.poll_candidates pc
      join public.restaurants r on r.id = pc.restaurant_id
      where pc.poll_id = 'f1000000-0000-4000-8000-000000000001'
      order by r.fallback_label
      limit 2
    ),
    0
  )$$,
  'the original two-choice ballot is saved'
);

select lives_ok(
  $$select public.update_poll_limits(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    3,
    3
  )$$,
  'choice limit increases during voting'
);

select lives_ok(
  $$select * from public.save_ballot(
    'f1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'f1000000-0000-4000-8000-000000000001'),
    array(
      select pc.id
      from public.poll_candidates pc
      join public.restaurants r on r.id = pc.restaurant_id
      where pc.poll_id = 'f1000000-0000-4000-8000-000000000001'
      order by r.fallback_label
    ),
    1
  )$$,
  'the voter can revise the ballot up to the increased limit'
);

select is(
  (
    select count(*)::integer
    from public.ballot_choices bc
    join public.ballots b on b.id = bc.ballot_id
    where b.poll_id = 'f1000000-0000-4000-8000-000000000001'
  ),
  3,
  'the revised ballot keeps all three choices'
);

select throws_ok(
  $$select public.update_poll_limits(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    2,
    3
  )$$,
  '22023',
  'Poll limits can only be increased',
  'the choice limit cannot decrease'
);

select throws_ok(
  $$select public.update_poll_limits(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    3,
    4
  )$$,
  '55000',
  'The nomination limit is locked once voting starts',
  'the nomination limit stays locked during voting'
);

select throws_ok(
  $$select public.update_poll_limits(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    4,
    3
  )$$,
  '22023',
  'Choices per voter cannot exceed the 3 active restaurants',
  'the choice limit cannot exceed the locked shortlist'
);

select is(
  (
    select count(*)::integer
    from public.poll_events
    where poll_id = 'f1000000-0000-4000-8000-000000000001'
      and event_type = 'poll_limits_increased'
  ),
  2,
  'each successful increase is audited'
);

select lives_ok(
  $$select * from public.close_poll(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com'
  )$$,
  'poll closes normally after the limit increase'
);

select throws_ok(
  $$select public.update_poll_limits(
    'f1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    4,
    3
  )$$,
  '55000',
  'Closed poll settings cannot be changed',
  'closed poll limits remain immutable'
);

select * from finish();
rollback;
