begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(22);

select has_table('public', 'lunch_centers', 'lunch_centers exists');
select has_table('public', 'polls', 'polls exists');
select has_column('public', 'polls', 'nomination_limit', 'polls nomination limit exists');
select has_table('public', 'restaurants', 'restaurants exists');
select has_table('public', 'poll_candidates', 'poll_candidates exists');
select has_table('public', 'poll_voters', 'poll_voters exists');
select has_table('public', 'poll_voter_blocks', 'poll_voter_blocks exists');
select has_table('public', 'ballots', 'ballots exists');
select has_table('public', 'ballot_choices', 'ballot_choices exists');
select has_table('public', 'poll_results', 'poll_results exists');
select has_table('public', 'winner_history', 'winner_history exists');
select has_table('public', 'poll_events', 'poll_events exists');

select is(
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'lunch_centers',
        'polls',
        'restaurants',
        'poll_candidates',
        'poll_voters',
        'poll_voter_blocks',
        'ballots',
        'ballot_choices',
        'poll_results',
        'winner_history',
        'poll_events'
      )
      and c.relrowsecurity
  ),
  11::bigint,
  'RLS is enabled on every application table'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'lunch_centers',
        'polls',
        'restaurants',
        'poll_candidates',
        'poll_voters',
        'poll_voter_blocks',
        'ballots',
        'ballot_choices',
        'poll_results',
        'winner_history',
        'poll_events'
      )
  ),
  0::bigint,
  'no browser-facing table policies exist'
);

select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
      and table_name in (
        'lunch_centers', 'polls', 'restaurants', 'poll_candidates', 'poll_voters', 'poll_voter_blocks',
        'ballots', 'ballot_choices', 'poll_results', 'winner_history', 'poll_events'
      )
  ),
  0::bigint,
  'anon has no direct table privileges'
);

select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and table_name in (
        'lunch_centers', 'polls', 'restaurants', 'poll_candidates', 'poll_voters', 'poll_voter_blocks',
        'ballots', 'ballot_choices', 'poll_results', 'winner_history', 'poll_events'
      )
  ),
  0::bigint,
  'authenticated has no direct table privileges'
);

select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('save_ballot', 'withdraw_ballot', 'transition_poll', 'close_poll', 'resolve_tie', 'remove_poll_voter', 'remove_voter_nomination')
  ),
  7::bigint,
  'all required transactional RPCs exist'
);

select ok(
  has_function_privilege('service_role', 'public.save_ballot(uuid,uuid,uuid[],integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.withdraw_ballot(uuid,uuid,integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.transition_poll(uuid,text,public.poll_status)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.close_poll(uuid,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.resolve_tie(uuid,text,uuid)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.remove_poll_voter(uuid,text,uuid)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.remove_voter_nomination(uuid,uuid,uuid)', 'EXECUTE'),
  'service_role can execute lifecycle RPCs'
);

select ok(
  not has_function_privilege('anon', 'public.save_ballot(uuid,uuid,uuid[],integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.close_poll(uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.remove_poll_voter(uuid,text,uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.remove_poll_voter(uuid,text,uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.remove_voter_nomination(uuid,uuid,uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.remove_voter_nomination(uuid,uuid,uuid)', 'EXECUTE'),
  'browser roles cannot execute lifecycle RPCs'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.poll_results'::regclass
      and tgname = 'poll_results_immutable'
      and not tgisinternal
  ),
  'closed result snapshots have an immutability trigger'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.poll_events'::regclass
      and tgname = 'poll_events_immutable'
      and not tgisinternal
  ),
  'audit events have an immutability trigger'
);

select ok(
  exists (
    select 1
    from cron.job
    where jobname = 'restaurant-voter-anonymize-closed-polls'
      and schedule = '15 3 * * *'
  ),
  'daily 90-day retention job is scheduled'
);

select * from finish();
rollback;
