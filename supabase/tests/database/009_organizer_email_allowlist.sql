begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into public.organizer_email_allowlist(email, note)
values ('allowed@example.com', 'pgTAP fixture');

select ok(
  public.is_organizer_email_allowed('  ALLOWED@EXAMPLE.COM  '),
  'allowlist lookup normalizes email casing and whitespace'
);
select ok(
  not public.is_organizer_email_allowed('blocked@example.com'),
  'unlisted email is denied by default'
);

select is(
  public.hook_restrict_organizer_signup(
    '{"user":{"email":"allowed@example.com"}}'::jsonb
  ),
  '{}'::jsonb,
  'before-user-created hook allows a listed email'
);
select is(
  public.hook_restrict_organizer_signup(
    '{"user":{"email":"blocked@example.com"}}'::jsonb
  )->'error'->>'http_code',
  '403',
  'before-user-created hook rejects an unlisted email'
);

select is(
  public.hook_restrict_organizer_token(
    '{"claims":{"email":"allowed@example.com","sub":"user-id"}}'::jsonb
  )->'claims'->>'sub',
  'user-id',
  'access-token hook preserves claims for a listed email'
);
select is(
  public.hook_restrict_organizer_token(
    '{"claims":{"email":"blocked@example.com","sub":"user-id"}}'::jsonb
  )->'error'->>'http_code',
  '403',
  'access-token hook rejects an unlisted existing user'
);

select ok(
  has_table_privilege('supabase_auth_admin', 'public.organizer_email_allowlist', 'SELECT'),
  'Supabase Auth can read the allowlist'
);
select ok(
  has_function_privilege('supabase_auth_admin', 'public.hook_restrict_organizer_signup(jsonb)', 'EXECUTE')
  and has_function_privilege('supabase_auth_admin', 'public.hook_restrict_organizer_token(jsonb)', 'EXECUTE'),
  'Supabase Auth can execute both enforcement hooks'
);
select ok(
  not has_table_privilege('anon', 'public.organizer_email_allowlist', 'SELECT')
  and not has_table_privilege('authenticated', 'public.organizer_email_allowlist', 'SELECT'),
  'browser roles cannot read the allowlist'
);
select ok(
  not has_function_privilege('anon', 'public.hook_restrict_organizer_signup(jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.hook_restrict_organizer_token(jsonb)', 'EXECUTE'),
  'browser roles cannot invoke the Auth Hooks'
);

select * from finish();
rollback;
