begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

insert into public.lunch_centers (
  id, name, latitude, longitude, created_by_admin
) values (
  'd0000000-0000-4000-8000-000000000001',
  'Nomination limit office',
  44.6488,
  -63.5752,
  'admin@example.com'
);

insert into public.polls (
  id, public_id, title, lunch_center_id, center_name, center_latitude,
  center_longitude, vote_limit, nomination_limit, nominations_enabled,
  created_by_admin
) values (
  'd1000000-0000-4000-8000-000000000001',
  'test-configurable-nomination-limit',
  'Configurable nomination limit poll',
  'd0000000-0000-4000-8000-000000000001',
  'Nomination limit office',
  44.6488,
  -63.5752,
  2,
  2,
  true,
  'admin@example.com'
);

select lives_ok(
  $$select public.transition_poll(
    'd1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'nominations'
  )$$,
  'poll opens for nominations'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'd1000000-0000-4000-8000-000000000001',
    repeat('N', 43),
    'Limit tester'
  )$$,
  'voter registers'
);

select lives_ok(
  $$select * from public.nominate_restaurant(
    'd1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'd1000000-0000-4000-8000-000000000001'),
    'nomination-limit-place-one',
    'Nomination one'
  )$$,
  'first nomination is accepted'
);

select lives_ok(
  $$select * from public.nominate_restaurant(
    'd1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'd1000000-0000-4000-8000-000000000001'),
    'nomination-limit-place-two',
    'Nomination two'
  )$$,
  'second nomination is accepted'
);

select throws_ok(
  $$select * from public.nominate_restaurant(
    'd1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'd1000000-0000-4000-8000-000000000001'),
    'nomination-limit-place-three',
    'Nomination three'
  )$$,
  '54000',
  'A voter may nominate at most 2 restaurants per poll',
  'configured nomination limit is enforced'
);

select lives_ok(
  $$update public.polls
    set nomination_limit = 3
    where id = 'd1000000-0000-4000-8000-000000000001'$$,
  'nomination limit can change before voting starts'
);

select lives_ok(
  $$select public.transition_poll(
    'd1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'voting'
  )$$,
  'poll opens for voting'
);

select throws_ok(
  $$update public.polls
    set nomination_limit = 4
    where id = 'd1000000-0000-4000-8000-000000000001'$$,
  '55000',
  'Poll configuration is locked once voting starts',
  'nomination limit locks when voting starts'
);

select * from finish();
rollback;
