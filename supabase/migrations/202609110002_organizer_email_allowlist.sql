-- Supabase Auth is the enforcement boundary for organizer access. New accounts
-- and new access tokens are denied unless the normalized email is listed here.
create table public.organizer_email_allowlist (
  email text primary key,
  added_at timestamptz not null default now(),
  note text,
  constraint organizer_email_allowlist_normalized_email check (
    email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and char_length(email) <= 320
  ),
  constraint organizer_email_allowlist_note_length check (
    note is null or char_length(note) <= 500
  )
);

alter table public.organizer_email_allowlist enable row level security;
revoke all on table public.organizer_email_allowlist from public, anon, authenticated;
grant select, insert, update, delete on table public.organizer_email_allowlist to service_role;

-- Auth Hook functions run as supabase_auth_admin. Give that role only the
-- narrow read access needed to evaluate the allowlist.
grant usage on schema public to supabase_auth_admin;
grant select on table public.organizer_email_allowlist to supabase_auth_admin;
create policy "Auth hooks can read organizer allowlist"
  on public.organizer_email_allowlist
  for select
  to supabase_auth_admin
  using (true);

create function public.is_organizer_email_allowed(candidate_email text)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select coalesce(
    exists (
      select 1
      from public.organizer_email_allowlist allowlist
      where allowlist.email = lower(btrim(candidate_email))
    ),
    false
  );
$$;

create function public.hook_restrict_organizer_signup(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
begin
  if public.is_organizer_email_allowed(event->'user'->>'email') then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'This email address is not authorized to organize polls.'
    )
  );
end;
$$;

create function public.hook_restrict_organizer_token(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
begin
  if public.is_organizer_email_allowed(event->'claims'->>'email') then
    return jsonb_build_object('claims', event->'claims');
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'This email address is not authorized to organize polls.'
    )
  );
end;
$$;

revoke execute on function public.is_organizer_email_allowed(text) from public, anon, authenticated, service_role;
revoke execute on function public.hook_restrict_organizer_signup(jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.hook_restrict_organizer_token(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.is_organizer_email_allowed(text) to supabase_auth_admin;
grant execute on function public.hook_restrict_organizer_signup(jsonb) to supabase_auth_admin;
grant execute on function public.hook_restrict_organizer_token(jsonb) to supabase_auth_admin;
