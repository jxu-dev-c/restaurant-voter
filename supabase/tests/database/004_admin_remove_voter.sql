begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

insert into public.lunch_centers (
  id, name, latitude, longitude, created_by_admin
) values (
  'c0000000-0000-4000-8000-000000000001',
  'Moderation test office',
  44.6488,
  -63.5752,
  'admin@example.com'
);

insert into public.polls (
  id, public_id, title, lunch_center_id, center_name, center_latitude,
  center_longitude, vote_limit, nominations_enabled, created_by_admin
) values (
  'c1000000-0000-4000-8000-000000000001',
  'test-admin-voter-removal',
  'Admin voter removal poll',
  'c0000000-0000-4000-8000-000000000001',
  'Moderation test office',
  44.6488,
  -63.5752,
  2,
  true,
  'admin@example.com'
);

select lives_ok(
  $$select public.transition_poll(
    'c1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'nominations'
  )$$,
  'poll opens for nominations'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'c1000000-0000-4000-8000-000000000001',
    repeat('R', 43),
    'Spam voter'
  )$$,
  'voter registers'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'c1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'moderation-admin-place',
    'Admin restaurant'
  )$$,
  'admin candidate is added'
);

select lives_ok(
  $$select * from public.nominate_restaurant(
    'c1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'c1000000-0000-4000-8000-000000000001'),
    'moderation-voter-place',
    'Voter restaurant'
  )$$,
  'voter nomination is added'
);

select lives_ok(
  $$select public.transition_poll(
    'c1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'voting'
  )$$,
  'poll opens for voting'
);

select lives_ok(
  $$select * from public.save_ballot(
    'c1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'c1000000-0000-4000-8000-000000000001'),
    array[
      (
        select pc.id
        from public.poll_candidates pc
        join public.restaurants r on r.id = pc.restaurant_id
        where pc.poll_id = 'c1000000-0000-4000-8000-000000000001'
          and r.google_place_id = 'moderation-admin-place'
      )
    ],
    0
  )$$,
  'voter submits a ballot'
);

select lives_ok(
  $$select * from public.remove_poll_voter(
    'c1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    (select id from public.poll_voters where poll_id = 'c1000000-0000-4000-8000-000000000001')
  )$$,
  'admin removes the voter'
);

select is(
  (
    select display_name
    from public.poll_voters
    where poll_id = 'c1000000-0000-4000-8000-000000000001'
  ),
  'Anonymous voter',
  'removed voter identity is erased'
);

select ok(
  (
    select device_hash is null and anonymized_at is not null
    from public.poll_voters
    where poll_id = 'c1000000-0000-4000-8000-000000000001'
  ),
  'removed voter device association is erased'
);

select is(
  (
    select count(*)
    from public.poll_voter_blocks
    where poll_id = 'c1000000-0000-4000-8000-000000000001'
      and device_hash = repeat('R', 43)
  ),
  1::bigint,
  'removed voter browser is blocked from rejoining the poll'
);

select throws_ok(
  $$select * from public.register_poll_voter(
    'c1000000-0000-4000-8000-000000000001',
    repeat('R', 43),
    'Spam voter again'
  )$$,
  '42501',
  'This voter entry was removed as a duplicate. To continue, open the poll in a different browser profile.',
  'removed browser cannot register again'
);

select is(
  (
    select count(*)
    from public.ballots
    where poll_id = 'c1000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'removed voter ballot is deleted'
);

select is(
  (
    select count(*)
    from public.ballot_choices
    where poll_id = 'c1000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'removed voter ballot choices are deleted'
);

select is(
  (
    select count(*)
    from public.poll_candidates
    where poll_id = 'c1000000-0000-4000-8000-000000000001'
      and source = 'voter'
  ),
  1::bigint,
  'voter nomination remains linked to the anonymous audit row'
);

select is(
  (
    select count(*)
    from public.poll_events
    where poll_id = 'c1000000-0000-4000-8000-000000000001'
      and event_type = 'voter_removed'
      and actor_type = 'admin'
  ),
  1::bigint,
  'voter removal is recorded as an admin event'
);

select lives_ok(
  $$select * from public.close_poll(
    'c1000000-0000-4000-8000-000000000001',
    'admin@example.com'
  )$$,
  'poll can close after removing the voter ballot'
);

select throws_ok(
  $$select * from public.remove_poll_voter(
    'c1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    (select id from public.poll_voters where poll_id = 'c1000000-0000-4000-8000-000000000001')
  )$$,
  '55000',
  'Voters cannot be removed after the poll closes',
  'closed poll voters cannot be removed because results are finalized'
);

select * from finish();
rollback;
