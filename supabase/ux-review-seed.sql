-- Local-only deterministic data for `pnpm ux:screenshots`.
-- The runner resets local Supabase before loading this file.

begin;
set local session_replication_role = replica;

update public.lunch_centers center_row
set owner_id = user_row.id
from auth.users user_row
where center_row.id = '10000000-0000-4000-8000-000000000001'
  and user_row.email = 'admin@example.com';

update public.polls poll_row
set
  owner_id = user_row.id,
  title = 'Friday team lunch',
  vote_limit = 3,
  nomination_limit = 2,
  created_at = '2026-09-07 12:00:00+00',
  nominations_started_at = '2026-09-09 12:00:00+00'
from auth.users user_row
where poll_row.id = '20000000-0000-4000-8000-000000000001'
  and user_row.email = 'admin@example.com';

insert into public.restaurants (id, google_place_id, fallback_label) values
  ('30000000-0000-4000-8000-000000000001', 'ux-harbour-tacos', 'Harbour Tacos'),
  ('30000000-0000-4000-8000-000000000002', 'ux-green-table', 'The Green Table'),
  ('30000000-0000-4000-8000-000000000003', 'ux-noodle-house', 'North End Noodle House'),
  ('30000000-0000-4000-8000-000000000004', 'ux-pier-pizza', 'Pier 21 Pizza'),
  ('30000000-0000-4000-8000-000000000005', 'ux-curry-club', 'Halifax Curry Club'),
  ('30000000-0000-4000-8000-000000000006', 'ux-salad-stop', 'Garden & Grain');

insert into public.lunch_centers (
  id, name, address_label, latitude, longitude, created_by_admin, owner_id, team_id, created_at
)
select
  '10000000-0000-4000-8000-000000000002',
  'Waterfront meetup',
  'Lower Water Street, Halifax',
  44.6456,
  -63.5711,
  'admin@example.com',
  id,
  '00000000-0000-4000-8000-000000000001',
  '2026-07-13 12:00:00+00'
from auth.users
where email = 'admin@example.com';

insert into public.polls (
  id, public_id, title, status, outcome_status, lunch_center_id,
  center_name, center_address, center_latitude, center_longitude,
  vote_limit, nomination_limit, nominations_enabled, access_version,
  nominations_started_at, voting_started_at, closed_at,
  created_by_admin, owner_id, team_id, created_at
)
select
  '21000000-0000-4000-8000-000000000001', 'ux-draft-poll', 'Product design lunch',
  'draft', 'pending', '10000000-0000-4000-8000-000000000001',
  'Demo office', 'Halifax, Nova Scotia', 44.6488, -63.5752,
  2, 3, true, 1, null, null, null,
  'admin@example.com', id, '00000000-0000-4000-8000-000000000001', '2026-09-10 12:00:00+00'
from auth.users where email = 'admin@example.com';

insert into public.polls (
  id, public_id, title, status, outcome_status, lunch_center_id,
  center_name, center_address, center_latitude, center_longitude,
  vote_limit, nomination_limit, nominations_enabled, access_version,
  nominations_started_at, voting_started_at, closed_at,
  created_by_admin, owner_id, team_id, created_at
)
select
  '22000000-0000-4000-8000-000000000001', 'ux-voting-poll', 'Quarterly planning lunch',
  'voting', 'pending', '10000000-0000-4000-8000-000000000002',
  'Waterfront meetup', 'Lower Water Street, Halifax', 44.6456, -63.5711,
  3, 2, true, 1,
  '2026-09-08 12:00:00+00', '2026-09-10 12:00:00+00', null,
  'admin@example.com', id, '00000000-0000-4000-8000-000000000001', '2026-09-06 12:00:00+00'
from auth.users where email = 'admin@example.com';

insert into public.polls (
  id, public_id, title, status, outcome_status, lunch_center_id,
  center_name, center_address, center_latitude, center_longitude,
  vote_limit, nomination_limit, nominations_enabled, access_version,
  nominations_started_at, voting_started_at, closed_at,
  created_by_admin, owner_id, team_id, created_at
)
select
  '23000000-0000-4000-8000-000000000001', 'ux-winner-poll', 'Summer kickoff lunch',
  'voting', 'pending', '10000000-0000-4000-8000-000000000001',
  'Demo office', 'Halifax, Nova Scotia', 44.6488, -63.5752,
  2, 3, true, 1,
  '2026-08-08 12:00:00+00', '2026-08-09 12:00:00+00', null,
  'admin@example.com', id, '00000000-0000-4000-8000-000000000001', '2026-08-07 12:00:00+00'
from auth.users where email = 'admin@example.com';

insert into public.polls (
  id, public_id, title, status, outcome_status, lunch_center_id,
  center_name, center_address, center_latitude, center_longitude,
  vote_limit, nomination_limit, nominations_enabled, access_version,
  nominations_started_at, voting_started_at, closed_at,
  created_by_admin, owner_id, team_id, created_at
)
select
  '24000000-0000-4000-8000-000000000001', 'ux-tied-poll', 'Client workshop lunch',
  'voting', 'pending', '10000000-0000-4000-8000-000000000002',
  'Waterfront meetup', 'Lower Water Street, Halifax', 44.6456, -63.5711,
  2, 3, false, 1, null, '2026-09-05 12:00:00+00', null,
  'admin@example.com', id, '00000000-0000-4000-8000-000000000001', '2026-09-04 12:00:00+00'
from auth.users where email = 'admin@example.com';

insert into public.polls (
  id, public_id, title, status, outcome_status, lunch_center_id,
  center_name, center_address, center_latitude, center_longitude,
  vote_limit, nomination_limit, nominations_enabled, access_version,
  nominations_started_at, voting_started_at, closed_at,
  created_by_admin, owner_id, team_id, created_at
)
select
  '25000000-0000-4000-8000-000000000001', 'ux-no-votes-poll', 'Rainy day backup lunch',
  'voting', 'pending', '10000000-0000-4000-8000-000000000001',
  'Demo office', 'Halifax, Nova Scotia', 44.6488, -63.5752,
  1, 2, false, 1, null, '2026-09-01 12:00:00+00', null,
  'admin@example.com', id, '00000000-0000-4000-8000-000000000001', '2026-08-31 12:00:00+00'
from auth.users where email = 'admin@example.com';

insert into public.poll_voters (
  id, poll_id, device_hash, display_name, normalized_name, voter_code, registered_at
) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', repeat('a', 43), 'Maya Chen', 'maya chen', 'maya01', '2026-09-10 06:00:00+00'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', repeat('b', 43), 'Jordan Lee', 'jordan lee', 'jord02', '2026-09-10 16:00:00+00'),
  ('42000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', repeat('c', 43), 'Avery Smith', 'avery smith', 'aver01', '2026-09-10 16:00:00+00'),
  ('42000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001', repeat('d', 43), 'Noah Williams', 'noah williams', 'noah02', '2026-09-11 00:00:00+00'),
  ('43000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', repeat('e', 43), 'Priya Patel', 'priya patel', 'priy01', '2026-08-09 12:00:00+00'),
  ('43000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000001', repeat('f', 43), 'Sam Rivera', 'sam rivera', 'samr02', '2026-08-09 12:05:00+00'),
  ('43000000-0000-4000-8000-000000000003', '23000000-0000-4000-8000-000000000001', repeat('g', 43), 'Taylor Brooks', 'taylor brooks', 'tayl03', '2026-08-09 12:10:00+00'),
  ('44000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', repeat('h', 43), 'Morgan Ellis', 'morgan ellis', 'morg01', '2026-09-05 12:00:00+00'),
  ('44000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000001', repeat('i', 43), 'Casey Ross', 'casey ross', 'case02', '2026-09-05 12:05:00+00'),
  ('44000000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000001', repeat('j', 43), 'Jamie Kim', 'jamie kim', 'jami03', '2026-09-05 12:10:00+00'),
  ('45000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', repeat('k', 43), 'Riley Quinn', 'riley quinn', 'rile01', '2026-09-01 12:00:00+00');

insert into public.poll_candidates (
  id, poll_id, restaurant_id, source, nominated_by_voter_id,
  is_active, removed_at, removed_by_admin, fallback_label, created_at
) values
  ('51000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'admin', null, true, null, null, 'Harbour Tacos', '2026-09-10 13:00:00+00'),
  ('51000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'admin', null, true, null, null, 'The Green Table', '2026-09-10 14:00:00+00'),
  ('51000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000006', 'admin', null, false, '2026-09-10 15:00:00+00', 'admin@example.com', 'Garden & Grain', '2026-09-10 15:00:00+00'),
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'admin', null, true, null, null, 'Harbour Tacos', '2026-09-09 18:00:00+00'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'voter', '40000000-0000-4000-8000-000000000001', true, null, null, 'The Green Table', '2026-09-10 06:00:00+00'),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'voter', '40000000-0000-4000-8000-000000000002', true, null, null, 'North End Noodle House', '2026-09-10 16:00:00+00'),
  ('50000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 'admin', null, false, '2026-09-10 18:00:00+00', 'admin@example.com', 'Pier 21 Pizza', '2026-09-10 17:00:00+00'),
  ('52000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'admin', null, true, null, null, 'Harbour Tacos', '2026-09-08 12:00:00+00'),
  ('52000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'admin', null, true, null, null, 'The Green Table', '2026-09-08 12:05:00+00'),
  ('52000000-0000-4000-8000-000000000003', '22000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'admin', null, true, null, null, 'North End Noodle House', '2026-09-08 12:10:00+00'),
  ('52000000-0000-4000-8000-000000000004', '22000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', 'voter', '42000000-0000-4000-8000-000000000001', true, null, null, 'Halifax Curry Club', '2026-09-08 12:15:00+00'),
  ('53000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'admin', null, true, null, null, 'Harbour Tacos', '2026-08-08 12:00:00+00'),
  ('53000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'admin', null, true, null, null, 'The Green Table', '2026-08-08 12:05:00+00'),
  ('53000000-0000-4000-8000-000000000003', '23000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'admin', null, true, null, null, 'North End Noodle House', '2026-08-08 12:10:00+00'),
  ('54000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 'admin', null, true, null, null, 'Pier 21 Pizza', '2026-09-04 12:00:00+00'),
  ('54000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', 'admin', null, true, null, null, 'Halifax Curry Club', '2026-09-04 12:05:00+00'),
  ('54000000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000006', 'admin', null, true, null, null, 'Garden & Grain', '2026-09-04 12:10:00+00'),
  ('55000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'admin', null, true, null, null, 'The Green Table', '2026-08-31 12:00:00+00'),
  ('55000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000006', 'admin', null, true, null, null, 'Garden & Grain', '2026-08-31 12:05:00+00');

insert into public.ballots (
  id, poll_id, voter_id, revision, is_submitted, submitted_at, created_at
) values
  ('62000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 2, true, '2026-09-11 02:00:00+00', '2026-09-10 16:00:00+00'),
  ('63000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', 1, true, '2026-08-10 12:00:00+00', '2026-08-10 12:00:00+00'),
  ('63000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000002', 1, true, '2026-08-10 12:05:00+00', '2026-08-10 12:05:00+00'),
  ('63000000-0000-4000-8000-000000000003', '23000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000003', 1, true, '2026-08-10 12:10:00+00', '2026-08-10 12:10:00+00'),
  ('64000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000001', 1, true, '2026-09-06 12:00:00+00', '2026-09-06 12:00:00+00'),
  ('64000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000002', 1, true, '2026-09-06 12:05:00+00', '2026-09-06 12:05:00+00'),
  ('64000000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000003', 1, true, '2026-09-06 12:10:00+00', '2026-09-06 12:10:00+00');

insert into public.ballot_choices (ballot_id, poll_id, candidate_id) values
  ('62000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001'),
  ('62000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000004'),
  ('63000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001'),
  ('63000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000002'),
  ('63000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001'),
  ('63000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000002'),
  ('63000000-0000-4000-8000-000000000003', '23000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001'),
  ('63000000-0000-4000-8000-000000000003', '23000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000003'),
  ('64000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000001'),
  ('64000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000002'),
  ('64000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000001'),
  ('64000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000002'),
  ('64000000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000003');

update public.polls
set
  status = 'closed',
  outcome_status = 'unique_winner',
  official_winner_candidate_id = '53000000-0000-4000-8000-000000000001',
  closed_at = '2026-08-10 12:30:00+00'
where id = '23000000-0000-4000-8000-000000000001';

update public.polls
set status = 'closed', outcome_status = 'tie', closed_at = '2026-09-06 12:30:00+00'
where id = '24000000-0000-4000-8000-000000000001';

update public.polls
set status = 'closed', outcome_status = 'no_votes', closed_at = '2026-09-02 12:30:00+00'
where id = '25000000-0000-4000-8000-000000000001';

insert into public.poll_results (poll_id, candidate_id, vote_count, rank) values
  ('23000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', 3, 1),
  ('23000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000002', 2, 2),
  ('23000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000003', 1, 3),
  ('24000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000001', 2, 1),
  ('24000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000002', 2, 1),
  ('24000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000003', 1, 3),
  ('25000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', 0, 1),
  ('25000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000002', 0, 1);

insert into public.winner_history (
  id, restaurant_id, source_poll_id, source, won_on, notes,
  created_by_admin, owner_id, team_id, fallback_label, created_at
)
select
  '70000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000001',
  'automatic', '2026-08-10', null, null, id, '00000000-0000-4000-8000-000000000001', 'Harbour Tacos', '2026-08-10 12:30:00+00'
from auth.users where email = 'admin@example.com';

insert into public.winner_history (
  id, restaurant_id, source_poll_id, source, won_on, notes,
  created_by_admin, owner_id, team_id, fallback_label, created_at
)
select
  '70000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000004',
  null, 'manual', '2026-08-28', 'Team favorite after the offsite.',
  'admin@example.com', id, '00000000-0000-4000-8000-000000000001', 'Pier 21 Pizza', '2026-08-28 12:00:00+00'
from auth.users where email = 'admin@example.com';

insert into public.winner_history (
  id, restaurant_id, source_poll_id, source, won_on, notes,
  created_by_admin, owner_id, team_id, fallback_label, created_at
)
select
  '70000000-0000-4000-8000-000000000003',
  '30000000-0000-4000-8000-000000000006',
  null, 'manual', '2026-07-21', 'Strong vegetarian menu.',
  'admin@example.com', id, '00000000-0000-4000-8000-000000000001', 'Garden & Grain', '2026-07-21 12:00:00+00'
from auth.users where email = 'admin@example.com';

commit;
