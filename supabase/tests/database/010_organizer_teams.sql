begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- Test-only identities; production organizers are provisioned outside Git.
-- The surrounding transaction rolls these rows back after the assertions.
insert into public.organizer_email_allowlist (email, team_id, note) values
  ('jcb-organizer-a@example.com', '00000000-0000-4000-8000-000000000002', 'Organizer A'),
  ('jcb-organizer-b@example.com', '00000000-0000-4000-8000-000000000002', 'Organizer B'),
  ('jcb-organizer-c@example.com', '00000000-0000-4000-8000-000000000002', 'Organizer C');

select is(
  (select name from public.teams where slug = 'nrg'),
  'NRG',
  'the default NRG team exists'
);
select is(
  (select name from public.teams where slug = 'jcb'),
  'JCB',
  'the JCB team exists'
);
select is(
  (
    select count(*)
    from public.organizer_email_allowlist
    where email in (
      'jcb-organizer-a@example.com',
      'jcb-organizer-b@example.com',
      'jcb-organizer-c@example.com'
    )
  ),
  3::bigint,
  'all synthetic JCB organizers are allowlisted'
);
select ok(
  not exists (
    select 1
    from public.organizer_email_allowlist
    where email in (
      'jcb-organizer-a@example.com',
      'jcb-organizer-b@example.com',
      'jcb-organizer-c@example.com'
    )
    and team_id <> '00000000-0000-4000-8000-000000000002'
  ),
  'all synthetic JCB organizers belong to the JCB team'
);
select is(
  (
    select string_agg(note, ', ' order by email)
    from public.organizer_email_allowlist
    where email in (
      'jcb-organizer-a@example.com',
      'jcb-organizer-b@example.com',
      'jcb-organizer-c@example.com'
    )
  ),
  'Organizer A, Organizer B, Organizer C',
  'synthetic organizer notes are preserved'
);
select is(
  (select team_id from public.organizer_email_allowlist where email = 'admin@example.com'),
  '00000000-0000-4000-8000-000000000001'::uuid,
  'existing allowlist organizers default to NRG'
);

insert into public.teams(id, slug, name)
values ('00000000-0000-4000-8000-000000000003', 'other-team', 'Other team');
insert into public.organizer_email_allowlist(email, team_id, note) values
  ('nrg-organizer@example.com', '00000000-0000-4000-8000-000000000001', 'team test'),
  ('nrg-teammate@example.com', '00000000-0000-4000-8000-000000000001', 'team test'),
  ('other-organizer@example.com', '00000000-0000-4000-8000-000000000003', 'team test');

insert into public.lunch_centers(
  id, name, google_place_id, latitude, longitude, created_by_admin
) values (
  '91000000-0000-4000-8000-000000000001', 'NRG office', 'team-shared-office', 44, -63,
  'nrg-organizer@example.com'
);
insert into public.polls(
  id, title, center_name, center_latitude, center_longitude, created_by_admin
) values (
  '92000000-0000-4000-8000-000000000001', 'Shared NRG poll', 'NRG office', 44, -63,
  'nrg-organizer@example.com'
);

select is(
  (select team_id from public.polls where id = '92000000-0000-4000-8000-000000000001'),
  (select team_id from public.organizer_email_allowlist where email = 'nrg-teammate@example.com'),
  'multiple allowlisted organizers share the same poll team'
);

select throws_ok(
  $$insert into public.lunch_centers(name, google_place_id, latitude, longitude, created_by_admin)
    values ('Duplicate NRG office', 'team-shared-office', 44, -63, 'nrg-teammate@example.com')$$,
  '23505',
  null,
  'a team cannot save the same center twice'
);
select lives_ok(
  $$insert into public.lunch_centers(name, google_place_id, latitude, longitude, created_by_admin)
    values ('Other office', 'team-shared-office', 44, -63, 'other-organizer@example.com')$$,
  'different teams can save the same center'
);

select public.add_manual_winner(
  'nrg-teammate@example.com', 'team-winner', 'Team winner', current_date, 'Team history'
);
select is(
  (select team_id from public.winner_history where notes = 'Team history'),
  '00000000-0000-4000-8000-000000000001'::uuid,
  'manual winner history belongs to the organizer team'
);

select throws_ok(
  $$update public.polls
    set team_id = '00000000-0000-4000-8000-000000000003'
    where id = '92000000-0000-4000-8000-000000000001'$$,
  '42501',
  'Workspace team is immutable',
  'polls cannot be transferred by editing their team id'
);
select ok(
  not has_table_privilege('anon', 'public.teams', 'SELECT')
  and not has_table_privilege('authenticated', 'public.teams', 'SELECT'),
  'browser roles cannot enumerate teams'
);
select ok(
  not has_function_privilege('authenticated', 'public.organizer_team_id_for_email(text)', 'EXECUTE'),
  'browser clients cannot resolve organizer teams'
);

select * from finish();
rollback;
