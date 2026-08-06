begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

insert into public.lunch_centers (
  id, name, latitude, longitude, created_by_admin
) values (
  'b0000000-0000-4000-8000-000000000001',
  'Boundary test office',
  44.6488,
  -63.5752,
  'admin@example.com'
);

insert into public.polls (
  id, public_id, title, lunch_center_id, center_name, center_latitude,
  center_longitude, vote_limit, nominations_enabled, created_by_admin
) values
  (
    'b1000000-0000-4000-8000-000000000001',
    'test-candidate-cap',
    'Candidate cap poll',
    'b0000000-0000-4000-8000-000000000001',
    'Boundary test office',
    44.6488,
    -63.5752,
    1,
    false,
    'admin@example.com'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'test-three-way-tie',
    'Three-way tie poll',
    'b0000000-0000-4000-8000-000000000001',
    'Boundary test office',
    44.6488,
    -63.5752,
    1,
    false,
    'admin@example.com'
  );

do $$
declare
  candidate_number integer;
begin
  for candidate_number in 1..50 loop
    perform public.seed_poll_candidate(
      'b1000000-0000-4000-8000-000000000001',
      'admin@example.com',
      format('candidate-cap-place-%s', candidate_number),
      format('Candidate %s', candidate_number)
    );
  end loop;
end;
$$;

select is(
  (
    select count(*)
    from public.poll_candidates
    where poll_id = 'b1000000-0000-4000-8000-000000000001' and is_active
  ),
  50::bigint,
  'exactly 50 active candidates are accepted'
);

select throws_ok(
  $$select * from public.seed_poll_candidate(
    'b1000000-0000-4000-8000-000000000001',
    'admin@example.com',
    'candidate-cap-place-51',
    'Candidate 51'
  )$$,
  '54000',
  'A poll may have at most 50 active candidates',
  'a 51st active candidate is rejected'
);

select lives_ok(
  $$select public.add_manual_winner(
    'admin@example.com',
    'repeat-winner-place',
    'Repeat Winner',
    current_date - 14,
    'First recorded lunch'
  )$$,
  'admin can add a manual Google Place winner'
);

select lives_ok(
  $$select public.add_manual_winner(
    'admin@example.com',
    'repeat-winner-place',
    'Repeat Winner',
    current_date - 7,
    'Restaurant won again'
  )$$,
  'the same restaurant may win again on a different date'
);

select is(
  (
    select count(*)
    from public.winner_history wh
    join public.restaurants r on r.id = wh.restaurant_id
    where r.google_place_id = 'repeat-winner-place' and wh.source = 'manual'
  ),
  2::bigint,
  'winner history retains repeat wins'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'b1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    'multi-tie-place-one',
    'Multi Tie One'
  )$$,
  'three-way poll accepts candidate one'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'b1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    'multi-tie-place-two',
    'Multi Tie Two'
  )$$,
  'three-way poll accepts candidate two'
);

select lives_ok(
  $$select * from public.seed_poll_candidate(
    'b1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    'multi-tie-place-three',
    'Multi Tie Three'
  )$$,
  'three-way poll accepts candidate three'
);

select lives_ok(
  $$select public.transition_poll(
    'b1000000-0000-4000-8000-000000000002',
    'admin@example.com',
    'voting'
  )$$,
  'three-way tie poll opens voting'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'b1000000-0000-4000-8000-000000000002', repeat('F', 43), 'Fran'
  )$$,
  'three-way tie voter one registers'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'b1000000-0000-4000-8000-000000000002', repeat('G', 43), 'Gale'
  )$$,
  'three-way tie voter two registers'
);

select lives_ok(
  $$select * from public.register_poll_voter(
    'b1000000-0000-4000-8000-000000000002', repeat('H', 43), 'Harper'
  )$$,
  'three-way tie voter three registers'
);

select lives_ok(
  $$select * from public.save_ballot(
    'b1000000-0000-4000-8000-000000000002',
    (select id from public.poll_voters where poll_id = 'b1000000-0000-4000-8000-000000000002' and device_hash = repeat('F', 43)),
    array[(select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where pc.poll_id = 'b1000000-0000-4000-8000-000000000002' and r.google_place_id = 'multi-tie-place-one')],
    0
  )$$,
  'first voter selects the first leader'
);

select lives_ok(
  $$select * from public.save_ballot(
    'b1000000-0000-4000-8000-000000000002',
    (select id from public.poll_voters where poll_id = 'b1000000-0000-4000-8000-000000000002' and device_hash = repeat('G', 43)),
    array[(select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where pc.poll_id = 'b1000000-0000-4000-8000-000000000002' and r.google_place_id = 'multi-tie-place-two')],
    0
  )$$,
  'second voter selects the second leader'
);

select lives_ok(
  $$select * from public.save_ballot(
    'b1000000-0000-4000-8000-000000000002',
    (select id from public.poll_voters where poll_id = 'b1000000-0000-4000-8000-000000000002' and device_hash = repeat('H', 43)),
    array[(select pc.id from public.poll_candidates pc join public.restaurants r on r.id = pc.restaurant_id where pc.poll_id = 'b1000000-0000-4000-8000-000000000002' and r.google_place_id = 'multi-tie-place-three')],
    0
  )$$,
  'third voter selects the third leader'
);

select is(
  (
    select outcome_status::text
    from public.close_poll('b1000000-0000-4000-8000-000000000002', 'admin@example.com')
  ),
  'tie',
  'three equal leaders close as a tie'
);

select is(
  (
    select count(*)
    from public.poll_results
    where poll_id = 'b1000000-0000-4000-8000-000000000002' and rank = 1
  ),
  3::bigint,
  'all three leaders are preserved at rank one'
);

select * from finish();
rollback;
