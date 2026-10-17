begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select has_column('public', 'winner_history', 'hidden_at', 'winner history can be hidden');
select col_is_null('public', 'winner_history', 'hidden_at', 'winners are visible unless hidden');
select col_type_is('public', 'winner_history', 'hidden_at', 'timestamp with time zone', 'hidden_at records when a winner was hidden');

select * from finish();
rollback;
