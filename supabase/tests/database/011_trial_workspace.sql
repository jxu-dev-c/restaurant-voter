begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select is((select count(*) from public.teams where is_trial), 1::bigint, 'exactly one reserved trial team');
select ok(not has_table_privilege('anon', 'public.trial_workspace', 'SELECT'), 'browser roles cannot read trial state');
select ok(not has_function_privilege('authenticated', 'public.ensure_trial_workspace()', 'EXECUTE'), 'browser roles cannot initialize trials');
select ok(not has_function_privilege('service_role', 'public.reset_trial_workspace()', 'EXECUTE'), 'no directly exposed reset RPC');
select ok(has_function_privilege('service_role', 'public.ensure_trial_workspace()', 'EXECUTE'), 'only server entry point is granted');
select throws_ok($$insert into public.organizer_email_allowlist (email) values ('trial@lunchpick.invalid')$$,
  '23514', null, 'trial audit email cannot receive normal account access');

-- A normal team's closed poll shares one sample restaurant identifier. Its
-- complete lifecycle supplies meaningful isolation coverage on fresh CI DBs.
insert into public.teams (id, slug, name) values ('00000000-0000-4000-8000-00000000fc01', 'trial-control', 'Normal control team');
insert into public.organizer_email_allowlist (email, team_id)
values ('trial-control@example.com', '00000000-0000-4000-8000-00000000fc01');
insert into public.lunch_centers (id, name, latitude, longitude, created_by_admin)
values ('00000000-0000-4000-8000-00000000fc02', 'Normal office', 44, -63, 'trial-control@example.com');
insert into public.polls (id, title, lunch_center_id, center_name, center_latitude, center_longitude, created_by_admin)
values ('00000000-0000-4000-8000-00000000fc03', 'Normal control poll', '00000000-0000-4000-8000-00000000fc02', 'Normal office', 44, -63, 'trial-control@example.com');
select public.seed_poll_candidate('00000000-0000-4000-8000-00000000fc03', 'trial-control@example.com', 'lunchpick-trial-sample-1', 'Normal team label');
select public.transition_poll('00000000-0000-4000-8000-00000000fc03', 'trial-control@example.com', 'nominations');
select public.transition_poll('00000000-0000-4000-8000-00000000fc03', 'trial-control@example.com', 'voting');
select public.register_poll_voter('00000000-0000-4000-8000-00000000fc03', repeat('a', 43), 'Normal voter');
select public.save_ballot('00000000-0000-4000-8000-00000000fc03',
  (select id from public.poll_voters where poll_id = '00000000-0000-4000-8000-00000000fc03'),
  array[(select id from public.poll_candidates where poll_id = '00000000-0000-4000-8000-00000000fc03')], 0);
select public.close_poll('00000000-0000-4000-8000-00000000fc03', 'trial-control@example.com');

select set_config('restaurant_voter.trial_reset_poll_ids', '{00000000-0000-4000-8000-00000000fc03}', true);
select throws_ok($$delete from public.poll_results where poll_id = '00000000-0000-4000-8000-00000000fc03'$$,
  '55000', 'poll_results rows are immutable', 'trial exception cannot bypass normal results immutability');
select throws_ok($$delete from public.poll_events where poll_id = '00000000-0000-4000-8000-00000000fc03'$$,
  '55000', 'poll_events rows are immutable', 'trial exception cannot bypass normal audit immutability');
select set_config('restaurant_voter.trial_reset_poll_ids', '', true);

-- Snapshot every normal team's workspace, including closed results and audit
-- rows, and shared restaurants. Compare exact rows after repeated resets.
create temporary table normal_snapshot as
select 'polls' as kind, to_jsonb(p) as row from public.polls p where team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'centers', to_jsonb(c) from public.lunch_centers c where team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'history', to_jsonb(h) from public.winner_history h where team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'restaurants', to_jsonb(r) from public.restaurants r
union all select 'candidates', to_jsonb(c) from public.poll_candidates c join public.polls p on p.id = c.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'voters', to_jsonb(v) from public.poll_voters v join public.polls p on p.id = v.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'ballots', to_jsonb(b) from public.ballots b join public.polls p on p.id = b.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'choices', to_jsonb(b) from public.ballot_choices b join public.polls p on p.id = b.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'results', to_jsonb(r) from public.poll_results r join public.polls p on p.id = r.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'events', to_jsonb(e) from public.poll_events e join public.polls p on p.id = e.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01';
create temporary view current_normal_data as
select 'polls' as kind, to_jsonb(p) as row from public.polls p where team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'centers', to_jsonb(c) from public.lunch_centers c where team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'history', to_jsonb(h) from public.winner_history h where team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'restaurants', to_jsonb(r) from public.restaurants r
union all select 'candidates', to_jsonb(c) from public.poll_candidates c join public.polls p on p.id = c.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'voters', to_jsonb(v) from public.poll_voters v join public.polls p on p.id = v.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'ballots', to_jsonb(b) from public.ballots b join public.polls p on p.id = b.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'choices', to_jsonb(b) from public.ballot_choices b join public.polls p on p.id = b.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'results', to_jsonb(r) from public.poll_results r join public.polls p on p.id = r.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01'
union all select 'events', to_jsonb(e) from public.poll_events e join public.polls p on p.id = e.poll_id where p.team_id <> '00000000-0000-4000-8000-00000000ff01';

create temporary table old_trial as select * from public.trial_workspace;
create temporary table old_trial_polls as select id, public_id from public.polls where team_id = '00000000-0000-4000-8000-00000000ff01';
select lives_ok('select public.ensure_trial_workspace()', 'reentry succeeds without resetting current data');
select is((select generation from public.trial_workspace), (select generation from old_trial), 'reentry preserves generation');

update public.trial_workspace set resets_at = now() - interval '1 second';
select lives_ok('select public.ensure_trial_workspace()', 'overdue reset succeeds even with closed polls and immutable records');
select isnt((select generation from public.trial_workspace), (select generation from old_trial), 'reset revokes previous organizer sessions');
select ok(not exists(select 1 from public.polls p join old_trial_polls old on old.id = p.id or old.public_id = p.public_id), 'old polls and referral targets are gone');
select is((select count(distinct status) from public.polls where team_id = '00000000-0000-4000-8000-00000000ff01'), 4::bigint, 'all lifecycle stages are seeded');
select results_eq('select kind, row from current_normal_data order by kind, row', 'select kind, row from normal_snapshot order by kind, row', 'reset leaves all normal teams and shared identifiers exactly unchanged');
update public.trial_workspace set resets_at = now() - interval '1 second';
select lives_ok('select public.reset_trial_workspace()', 'repeated weekly cleanup remains safe');
select results_eq('select kind, row from current_normal_data order by kind, row', 'select kind, row from normal_snapshot order by kind, row', 'repeated reset also preserves normal team rows exactly');
select is((select resets_at from public.trial_workspace), (date_trunc('week', now() at time zone 'UTC') + interval '1 week') at time zone 'UTC', 'reset boundary is next Monday UTC');
select is(current_setting('restaurant_voter.trial_reset_poll_ids', true), '', 'reset clears the transaction-local deletion exception');

-- Close the voter sample and confirm entry repairs only that sample.
select public.close_poll((select voting_poll_id from public.trial_workspace), 'trial@lunchpick.invalid');
select lives_ok('select public.ensure_trial_workspace()', 'voter entry replaces an organizer-closed example vote');
select is((select p.status::text from public.polls p join public.trial_workspace tw on tw.voting_poll_id = p.id), 'voting', 'voter entry always points to an open vote');

select throws_ok($$insert into public.organizer_email_allowlist (email, team_id) values ('misconfigured@example.com', '00000000-0000-4000-8000-00000000ff01')$$,
  '23514', null, 'normal organizers cannot be assigned to the public trial team');
-- Even if a privileged operator removes the membership constraint, cleanup
-- independently refuses the resulting unsafe configuration.
alter table public.organizer_email_allowlist drop constraint organizer_no_trial_team;
insert into public.organizer_email_allowlist (email, team_id) values ('misconfigured@example.com', '00000000-0000-4000-8000-00000000ff01');
update public.trial_workspace set resets_at = now() - interval '1 second';
select throws_ok('select public.reset_trial_workspace()', '42501', 'Trial reset refused: reserved team is not isolated', 'reset refuses a team with a normal organizer');
delete from public.organizer_email_allowlist where email = 'misconfigured@example.com';
update public.teams set is_trial = false where slug = 'trial';
select throws_ok('select public.reset_trial_workspace()', '42501', 'Trial reset refused: reserved team is not isolated', 'missing trial marker fails closed');

select is((select schedule from cron.job where jobname = 'restaurant-voter-reset-trial'), '0 0 * * 1', 'weekly cleanup is scheduled');
select * from finish();
rollback;
