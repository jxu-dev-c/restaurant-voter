begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- Legacy data is not claimed by an unverified signup.
insert into public.lunch_centers(id, name, latitude, longitude, created_by_admin)
values ('81000000-0000-4000-8000-000000000001', 'Legacy office', 44, -63, 'legacy-organizer@example.com');
insert into public.polls(id, title, center_name, center_latitude, center_longitude, created_by_admin)
values ('82000000-0000-4000-8000-000000000001', 'Legacy poll', 'Office', 44, -63, 'legacy-organizer@example.com');
select public.add_manual_winner('legacy-organizer@example.com', 'legacy-place', 'Legacy label', current_date, 'Legacy note');
insert into auth.users(id, email, email_confirmed_at)
values ('80000000-0000-4000-8000-000000000001', 'legacy-organizer@example.com', null);
select is((select owner_id from public.polls where id = '82000000-0000-4000-8000-000000000001'), null::uuid, 'unverified signup cannot claim legacy polls');
update auth.users set email_confirmed_at = now() where id = '80000000-0000-4000-8000-000000000001';
select is((select owner_id from public.polls where id = '82000000-0000-4000-8000-000000000001'), '80000000-0000-4000-8000-000000000001'::uuid, 'verification claims legacy polls');
select is((select owner_id from public.lunch_centers where id = '81000000-0000-4000-8000-000000000001'), '80000000-0000-4000-8000-000000000001'::uuid, 'verification claims legacy centers');
select is((select owner_id from public.winner_history where notes = 'Legacy note'), '80000000-0000-4000-8000-000000000001'::uuid, 'verification claims legacy manual history');
update auth.users set email = 'renamed-organizer@example.com' where id = '80000000-0000-4000-8000-000000000001';
select is((select owner_id from public.polls where id = '82000000-0000-4000-8000-000000000001'), '80000000-0000-4000-8000-000000000001'::uuid, 'ownership survives email changes');

insert into public.teams(id, slug, name)
values ('80000000-0000-4000-8000-000000000004', 'organizer-b-team', 'Organizer B team');
insert into public.organizer_email_allowlist(email, team_id, note) values
  ('organizer-a@example.com', '00000000-0000-4000-8000-000000000001', 'account test'),
  ('organizer-b@example.com', '80000000-0000-4000-8000-000000000004', 'account test');
insert into auth.users(id, email, email_confirmed_at) values
  ('80000000-0000-4000-8000-000000000002', 'organizer-a@example.com', now()),
  ('80000000-0000-4000-8000-000000000003', 'organizer-b@example.com', now());
insert into public.lunch_centers(id, name, google_place_id, latitude, longitude, created_by_admin) values
  ('81000000-0000-4000-8000-000000000002', 'A office', 'same-office', 44, -63, 'organizer-a@example.com'),
  ('81000000-0000-4000-8000-000000000003', 'B office', 'same-office', 44, -63, 'organizer-b@example.com');
select is((select count(*) from public.lunch_centers where google_place_id = 'same-office'), 2::bigint, 'different organizers can save the same center');
insert into public.polls(id, title, center_name, center_latitude, center_longitude, created_by_admin) values
  ('82000000-0000-4000-8000-000000000002', 'A poll', 'A office', 44, -63, 'organizer-a@example.com'),
  ('82000000-0000-4000-8000-000000000003', 'B poll', 'B office', 44, -63, 'organizer-b@example.com');
select is((select owner_id from public.polls where id = '82000000-0000-4000-8000-000000000002'), '80000000-0000-4000-8000-000000000002'::uuid, 'new polls have an organizer');
select throws_ok(
  $$update public.polls set owner_id = '80000000-0000-4000-8000-000000000003' where id = '82000000-0000-4000-8000-000000000002'$$,
  '42501', 'Workspace ownership is immutable', 'poll ownership cannot be reassigned');
select public.seed_poll_candidate('82000000-0000-4000-8000-000000000002', 'organizer-a@example.com', 'shared-restaurant', 'A private label');
select public.seed_poll_candidate('82000000-0000-4000-8000-000000000003', 'organizer-b@example.com', 'shared-restaurant', 'B private label');
select is((select fallback_label from public.poll_candidates where poll_id = '82000000-0000-4000-8000-000000000002'), 'A private label', 'first organizer retains their label');
select is((select fallback_label from public.poll_candidates where poll_id = '82000000-0000-4000-8000-000000000003'), 'B private label', 'second organizer has an independent label');
select is((select fallback_label from public.restaurants where google_place_id = 'shared-restaurant'), null::text, 'new private labels are not stored globally');
select public.add_manual_winner('organizer-b@example.com', 'shared-restaurant', 'B winner label', current_date, 'B notes');
select is((select owner_id from public.winner_history where notes = 'B notes'), '80000000-0000-4000-8000-000000000003'::uuid, 'manual winners belong to their organizer');
select is((select fallback_label from public.winner_history where notes = 'B notes'), 'B winner label', 'manual winners retain their own label');

select public.transition_poll('82000000-0000-4000-8000-000000000002', 'organizer-a@example.com', 'nominations');
select public.register_poll_voter('82000000-0000-4000-8000-000000000002', repeat('a', 43), 'Voter A');
select public.transition_poll('82000000-0000-4000-8000-000000000002', 'organizer-a@example.com', 'voting');
select public.save_ballot(
 '82000000-0000-4000-8000-000000000002',
 (select id from public.poll_voters where poll_id = '82000000-0000-4000-8000-000000000002'),
 array[(select id from public.poll_candidates where poll_id = '82000000-0000-4000-8000-000000000002')], 0);
select public.close_poll('82000000-0000-4000-8000-000000000002', 'organizer-a@example.com');
select is((select owner_id from public.winner_history where source_poll_id = '82000000-0000-4000-8000-000000000002'), '80000000-0000-4000-8000-000000000002'::uuid, 'automatic winners inherit poll ownership');
select is((select fallback_label from public.winner_history where source_poll_id = '82000000-0000-4000-8000-000000000002'), 'A private label', 'automatic winners inherit the poll candidate label');
select is((select count(*) from public.winner_history where owner_id = '80000000-0000-4000-8000-000000000002'), 1::bigint, 'A history excludes B manual entries');
select throws_ok(
  $$update public.winner_history set source_poll_id = '82000000-0000-4000-8000-000000000003' where source_poll_id = '82000000-0000-4000-8000-000000000002'$$,
  '42501', 'Workspace ownership is immutable', 'changing the source poll cannot transfer winner ownership');
select ok(not has_function_privilege('authenticated', 'public.claim_legacy_organizer_data(uuid)', 'EXECUTE'), 'browser clients cannot claim workspace ownership');
select ok(not has_function_privilege('anon', 'public.seed_poll_candidate(uuid,text,text,text)', 'EXECUTE'), 'replaced RPCs remain service only');

select * from finish();
rollback;
