begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

insert into public.lunch_centers (
  id, name, latitude, longitude, created_by_admin
) values (
  'a0000000-0000-4000-8000-000000000001',
  'Test office',
  44.6488,
  -63.5752,
  'admin@example.com'
);

insert into public.polls (
  id, public_id, title, lunch_center_id, center_name, center_latitude,
  center_longitude, vote_limit, nominations_enabled, created_by_admin
) values
  (
    'a1000000-0000-4000-8000-000000000001',
    'test-unique-poll',
    'Unique winner poll',
    'a0000000-0000-4000-8000-000000000001',
    'Test office',
    44.6488,
    -63.5752,
    2,
    true,
    'admin@example.com'
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'test-tied-poll',
    'Tied poll',
    'a0000000-0000-4000-8000-000000000001',
    'Test office',
    44.6488,
    -63.5752,
    1,
    false,
    'admin@example.com'
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'test-empty-poll',
    'No ballot poll',
    'a0000000-0000-4000-8000-000000000001',
    'Test office',
    44.6488,
    -63.5752,
    1,
    false,
    'admin@example.com'
  );

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'a1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    'tie-place-one',
    'Tie One'
  )$$,
  'admin can seed first tie candidate'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'a1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    'tie-place-two',
    'Tie Two'
  )$$,
  'admin can seed second tie candidate'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'a1000000-0000-4000-8000-000000000003',
    'admin@example.com',
    'empty-place-one',
    'Empty One'
  )$$,
  'admin can seed no-ballot poll candidate'
);

select lives_ok(
  $$select public.transition_poll(
    'a1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'nominations'
  )$$,
  'draft moves to nominations'
);

select is(
  (
    select is_new
    from public.register_poll_voter(
      'a1000000-0000-4000-8000-000000000001',
      repeat('A', 43),
      '  Alice   Example  '
    )
  ),
  true,
  'first device registration creates a voter'
);

select is(
  (
    select display_name
    from public.register_poll_voter(
      'a1000000-0000-4000-8000-000000000001',
      repeat('A', 43),
      'Ignored replacement name'
    )
  ),
  'Alice Example',
  'same device resumes the normalized voter identity'
);

select is(
  (
    select is_new
    from public.register_poll_voter(
      'a1000000-0000-4000-8000-000000000001',
      repeat('B', 43),
      'Alice Example'
    )
  ),
  true,
  'duplicate display names are allowed on distinct devices'
);

select lives_ok(
  $$select * from public.nominate_restaurant(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    'unique-place-one',
    'Unique One'
  )$$,
  'voter nominates the first restaurant'
);

select is(
  (
    select created
    from public.nominate_restaurant(
      'a1000000-0000-4000-8000-000000000001',
      (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('B', 43)),
      'unique-place-one',
      'Duplicate label'
    )
  ),
  false,
  'an active Google Place ID is deduplicated across voters'
);

select lives_ok(
  $$select * from public.nominate_restaurant(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    'unique-place-two',
    'Unique Two'
  )$$,
  'voter nominates a second restaurant'
);

select lives_ok(
  $$select * from public.nominate_restaurant(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    'unique-place-three',
    'Unique Three'
  )$$,
  'voter nominates a third restaurant'
);

select lives_ok(
  $$select * from public.nominate_restaurant(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    'unique-place-four',
    'Unique Four'
  )$$,
  'voter nominates a fourth restaurant'
);

select lives_ok(
  $$select * from public.nominate_restaurant(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    'unique-place-five',
    'Unique Five'
  )$$,
  'voter nominates a fifth restaurant'
);

select throws_ok(
  $$select * from public.nominate_restaurant(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    'unique-place-six',
    'Unique Six'
  )$$,
  '54000',
  'A voter may nominate at most 5 restaurants per poll',
  'sixth voter nomination is rejected'
);

select lives_ok(
  $$select public.set_candidate_active(
    'a1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where pc.poll_id = 'a1000000-0000-4000-8000-000000000001' and r.google_place_id = 'unique-place-two'),
    false
  )$$,
  'admin removes a candidate before voting'
);

select throws_ok(
  $$select * from public.nominate_restaurant(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('B', 43)),
    'unique-place-two',
    'Unique Two'
  )$$,
  '55000',
  'This restaurant was removed and cannot be re-added by a voter',
  'voters cannot re-add removed candidates'
);

select lives_ok(
  $$select public.set_candidate_active(
    'a1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where pc.poll_id = 'a1000000-0000-4000-8000-000000000001' and r.google_place_id = 'unique-place-two'),
    true
  )$$,
  'admin restores a candidate before voting'
);

select lives_ok(
  $$select public.transition_poll(
    'a1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'voting'
  )$$,
  'nominations move to voting'
);

select throws_ok(
  $$select public.set_candidate_active(
    'a1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    (select id from public.poll_candidates where poll_id = 'a1000000-0000-4000-8000-000000000001' limit 1),
    false
  )$$,
  '55000',
  'Candidates are locked once voting starts',
  'candidate roster is immutable during voting'
);

select lives_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    array[
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where pc.poll_id = 'a1000000-0000-4000-8000-000000000001' and r.google_place_id = 'unique-place-one'),
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where pc.poll_id = 'a1000000-0000-4000-8000-000000000001' and r.google_place_id = 'unique-place-two')
    ],
    0
  )$$,
  'new ballot accepts exactly the vote limit'
);

select is(
  (
    select revision
    from public.ballots
    where poll_id = 'a1000000-0000-4000-8000-000000000001'
      and voter_id = (select id from public.poll_voters where device_hash = repeat('A', 43))
  ),
  1,
  'new ballot starts at revision one'
);

select throws_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    array[
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-one'),
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-one')
    ],
    1
  )$$,
  '22023',
  'Ballot selections must be distinct',
  'duplicate selections are rejected'
);

select throws_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    array[
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-one'),
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-two'),
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-three')
    ],
    1
  )$$,
  '22023',
  'A ballot may select at most 2 candidates',
  'N plus one selections are rejected'
);

select throws_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    array[
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'tie-place-one')
    ],
    1
  )$$,
  '22023',
  'Every selection must be an active candidate in this poll',
  'candidate from another poll is rejected'
);

select throws_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    array[
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-one')
    ],
    0
  )$$,
  'PT409',
  'Ballot revision conflict',
  'stale ballot revision is rejected'
);

select lives_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('A', 43)),
    array[
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-one')
    ],
    1
  )$$,
  'valid revision atomically replaces the ballot'
);

select lives_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('B', 43)),
    array[
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-one'),
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-two')
    ],
    0
  )$$,
  'second voter saves a ballot'
);

select lives_ok(
  $$select * from public.withdraw_ballot(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('B', 43)),
    1
  )$$,
  'submitted ballot can be withdrawn'
);

select is(
  (
    select count(*)
    from public.ballot_choices bc
    join public.ballots b on b.id = bc.ballot_id
    where b.poll_id = 'a1000000-0000-4000-8000-000000000001'
      and b.voter_id = (select id from public.poll_voters where device_hash = repeat('B', 43))
  ),
  0::bigint,
  'withdrawal removes every stored choice'
);

select lives_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' and device_hash = repeat('B', 43)),
    array[
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-one'),
      (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where r.google_place_id = 'unique-place-two')
    ],
    2
  )$$,
  'withdrawn ballot can be resubmitted with its new revision'
);

select is(
  (
    select outcome_status::text
    from public.close_poll(
      'a1000000-0000-4000-8000-000000000001',
      'admin@example.com'
    )
  ),
  'unique_winner',
  'closing snapshots a unique winner'
);

select is(
  (
    select pr.vote_count
    from public.poll_results pr
    join public.poll_candidates pc on pc.id = pr.candidate_id
    join public.restaurants r on r.id = pc.restaurant_id
    where pr.poll_id = 'a1000000-0000-4000-8000-000000000001'
      and r.google_place_id = 'unique-place-one'
  ),
  2,
  'winner snapshot contains the final aggregate count'
);

select is(
  (
    select count(*)
    from public.winner_history
    where source_poll_id = 'a1000000-0000-4000-8000-000000000001'
      and source = 'automatic'
  ),
  1::bigint,
  'unique winner is added to history exactly once'
);

select throws_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000001',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000001' limit 1),
    array[(select id from public.poll_candidates where poll_id = 'a1000000-0000-4000-8000-000000000001' limit 1)],
    2
  )$$,
  '55000',
  'Voting is not open',
  'writes are rejected after close'
);

select throws_ok(
  $$update public.poll_results
    set vote_count = vote_count + 1
    where poll_id = 'a1000000-0000-4000-8000-000000000001'$$,
  '55000',
  'poll_results rows are immutable',
  'closed result snapshots cannot be edited'
);

select lives_ok(
  $$select public.transition_poll(
    'a1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    'voting'
  )$$,
  'draft skips nominations when nominations are disabled'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'a1000000-0000-4000-8000-000000000002', repeat('C', 43), 'Carol'
  )$$,
  'first tie voter registers'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'a1000000-0000-4000-8000-000000000002', repeat('D', 43), 'Dan'
  )$$,
  'second tie voter registers'
);

select lives_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000002',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000002' and device_hash = repeat('C', 43)),
    array[(select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where pc.poll_id = 'a1000000-0000-4000-8000-000000000002' and r.google_place_id = 'tie-place-one')],
    0
  )$$,
  'first tie ballot is saved'
);

select lives_ok(
  $$select * from public.save_ballot(
    'a1000000-0000-4000-8000-000000000002',
    (select id from public.poll_voters where poll_id = 'a1000000-0000-4000-8000-000000000002' and device_hash = repeat('D', 43)),
    array[(select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where pc.poll_id = 'a1000000-0000-4000-8000-000000000002' and r.google_place_id = 'tie-place-two')],
    0
  )$$,
  'second tie ballot is saved'
);

select is(
  (
    select outcome_status::text
    from public.close_poll('a1000000-0000-4000-8000-000000000002', 'admin@example.com')
  ),
  'tie',
  'equal top counts close as an unresolved tie'
);

select is(
  (
    select count(*)
    from public.poll_results
    where poll_id = 'a1000000-0000-4000-8000-000000000002' and rank = 1
  ),
  2::bigint,
  'all tied leaders retain rank one'
);

select throws_ok(
  $$select public.resolve_tie(
    'a1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    (select id from public.poll_candidates where poll_id = 'a1000000-0000-4000-8000-000000000001' limit 1)
  )$$,
  '22023',
  'Winner must be one of the tied leaders',
  'tie cannot resolve to a non-leader'
);

select lives_ok(
  $$select public.resolve_tie(
    'a1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    (select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where pc.poll_id = 'a1000000-0000-4000-8000-000000000002' and r.google_place_id = 'tie-place-one')
  )$$,
  'admin can choose one tied leader'
);

select is(
  (
    select outcome_status::text
    from public.polls
    where id = 'a1000000-0000-4000-8000-000000000002'
  ),
  'resolved_tie',
  'tie resolution records the final outcome'
);

select is(
  (
    select count(*)
    from public.winner_history
    where source_poll_id = 'a1000000-0000-4000-8000-000000000002'
      and source = 'tie_break'
  ),
  1::bigint,
  'resolved tie creates one winner history entry'
);

select lives_ok(
  $$select public.transition_poll(
    'a1000000-0000-4000-8000-000000000003',
    'admin@example.com',
    'voting'
  )$$,
  'no-ballot poll opens voting'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'a1000000-0000-4000-8000-000000000003', repeat('E', 43), 'Erin'
  )$$,
  'non-voting participant may register without submitting a ballot'
);

select is(
  (
    select outcome_status::text
    from public.close_poll('a1000000-0000-4000-8000-000000000003', 'admin@example.com')
  ),
  'no_votes',
  'zero submitted ballots close with no winner'
);

select is(
  (
    select official_winner_candidate_id
    from public.polls
    where id = 'a1000000-0000-4000-8000-000000000003'
  ),
  null::uuid,
  'zero-ballot poll has no official winner'
);

select is(
  public.anonymize_closed_poll_voters(now() + interval '91 days'),
  5,
  'retention job anonymizes all voters after 90 days'
);

select is(
  (
    select count(*)
    from public.poll_voters
    where poll_id in (
      'a1000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000002',
      'a1000000-0000-4000-8000-000000000003'
    )
      and device_hash is null
      and display_name = 'Anonymous voter'
  ),
  5::bigint,
  'retention clears device hashes and display names'
);

select throws_ok(
  $$update public.poll_events
    set payload = jsonb_build_object('tampered', true)
    where poll_id = 'a1000000-0000-4000-8000-000000000001'$$,
  '55000',
  'poll_events rows are immutable',
  'audit events cannot be edited'
);

select * from finish();
rollback;
