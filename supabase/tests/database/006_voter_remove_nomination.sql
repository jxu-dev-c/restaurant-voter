begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

insert into public.lunch_centers (
  id, name, latitude, longitude, created_by_admin
) values (
  'e0000000-0000-4000-8000-000000000001',
  'Nomination removal office',
  44.6488,
  -63.5752,
  'admin@example.com'
);

insert into public.polls (
  id, public_id, title, lunch_center_id, center_name, center_latitude,
  center_longitude, vote_limit, nominations_enabled, created_by_admin
) values (
  'e1000000-0000-4000-8000-000000000001',
  'test-voter-nomination-removal',
  'Voter nomination removal poll',
  'e0000000-0000-4000-8000-000000000001',
  'Nomination removal office',
  44.6488,
  -63.5752,
  2,
  true,
  'admin@example.com'
);

select lives_ok(
  $$select public.transition_poll(
    'e1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'nominations'
  )$$,
  'poll opens for nominations'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'e1000000-0000-4000-8000-000000000001',
    repeat('A', 43),
    'Nominator A'
  )$$,
  'first voter registers'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'e1000000-0000-4000-8000-000000000001',
    repeat('B', 43),
    'Nominator B'
  )$$,
  'second voter registers'
);

select lives_ok(
  $$select * from public.nominate_restaurant(
    'e1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where display_name = 'Nominator A'),
    'voter-removal-owned-place',
    'Owned nomination'
  )$$,
  'first voter nominates a restaurant'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'e1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'voter-removal-admin-place',
    'Admin nomination'
  )$$,
  'admin adds a restaurant'
);

select throws_ok(
  $$select * from public.remove_voter_nomination(
    'e1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where display_name = 'Nominator B'),
    (
      select pc.id
      from public.poll_candidates pc
      join public.restaurants r on r.id = pc.restaurant_id
      where r.google_place_id = 'voter-removal-owned-place'
    )
  )$$,
  'P0002',
  'Nomination not found',
  'a voter cannot remove another voter nomination'
);

select throws_ok(
  $$select * from public.remove_voter_nomination(
    'e1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where display_name = 'Nominator A'),
    (
      select pc.id
      from public.poll_candidates pc
      join public.restaurants r on r.id = pc.restaurant_id
      where r.google_place_id = 'voter-removal-admin-place'
    )
  )$$,
  'P0002',
  'Nomination not found',
  'a voter cannot remove an admin nomination'
);

select lives_ok(
  $$select * from public.remove_voter_nomination(
    'e1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where display_name = 'Nominator A'),
    (
      select pc.id
      from public.poll_candidates pc
      join public.restaurants r on r.id = pc.restaurant_id
      where r.google_place_id = 'voter-removal-owned-place'
    )
  )$$,
  'a voter can remove their own nomination'
);

select is(
  (
    select count(*)
    from public.poll_candidates pc
    join public.restaurants r on r.id = pc.restaurant_id
    where pc.poll_id = 'e1000000-0000-4000-8000-000000000001'
      and r.google_place_id = 'voter-removal-owned-place'
  ),
  0::bigint,
  'the removed nomination leaves the shortlist'
);

select is(
  (
    select count(*)
    from public.poll_events
    where poll_id = 'e1000000-0000-4000-8000-000000000001'
      and event_type = 'nomination_removed'
      and actor_type = 'voter'
      and voter_id = (select id from public.poll_voters where display_name = 'Nominator A')
  ),
  1::bigint,
  'the voter removal is recorded in the audit log'
);

select lives_ok(
  $$select * from public.nominate_restaurant(
    'e1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where display_name = 'Nominator A'),
    'voter-removal-owned-place',
    'Owned nomination'
  )$$,
  'the restaurant can be nominated again while nominations are open'
);

select throws_ok(
  $$delete from public.poll_candidates
    where poll_id = 'e1000000-0000-4000-8000-000000000001'
      and source = 'admin'$$,
  '55000',
  'Candidates cannot be deleted; mark them inactive instead',
  'direct candidate deletion remains blocked'
);

select lives_ok(
  $$select public.transition_poll(
    'e1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'voting'
  )$$,
  'poll opens for voting'
);

select throws_ok(
  $$select * from public.remove_voter_nomination(
    'e1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where display_name = 'Nominator A'),
    (
      select pc.id
      from public.poll_candidates pc
      join public.restaurants r on r.id = pc.restaurant_id
      where r.google_place_id = 'voter-removal-owned-place'
    )
  )$$,
  '55000',
  'Restaurant nominations are closed',
  'a voter cannot remove a nomination after voting starts'
);

select * from finish();
rollback;
