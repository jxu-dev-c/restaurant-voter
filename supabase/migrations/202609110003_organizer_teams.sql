-- Organizer access is scoped to a predefined team. Existing allowlist entries
-- and workspace data are assigned to the default NRG team.
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  constraint teams_slug_format check (
    slug = lower(btrim(slug))
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) <= 80
  ),
  constraint teams_name_format check (
    btrim(name) <> '' and char_length(name) <= 120
  )
);

insert into public.teams (id, slug, name)
values ('00000000-0000-4000-8000-000000000001', 'nrg', 'NRG');

alter table public.teams enable row level security;
revoke all on table public.teams from public, anon, authenticated;
grant select, insert, update, delete on table public.teams to service_role;

alter table public.organizer_email_allowlist
  add column team_id uuid references public.teams(id) on delete restrict
  default '00000000-0000-4000-8000-000000000001';
update public.organizer_email_allowlist
set team_id = '00000000-0000-4000-8000-000000000001'
where team_id is null;
alter table public.organizer_email_allowlist alter column team_id set not null;
create index organizer_email_allowlist_team_idx
  on public.organizer_email_allowlist(team_id, email);

alter table public.lunch_centers add column team_id uuid references public.teams(id) on delete restrict;
alter table public.polls add column team_id uuid references public.teams(id) on delete restrict;
alter table public.winner_history add column team_id uuid references public.teams(id) on delete restrict;

update public.lunch_centers set team_id = '00000000-0000-4000-8000-000000000001';
update public.polls set team_id = '00000000-0000-4000-8000-000000000001';
update public.winner_history set team_id = '00000000-0000-4000-8000-000000000001';

alter table public.lunch_centers alter column team_id set not null;
alter table public.polls alter column team_id set not null;
alter table public.winner_history alter column team_id set not null;

create index lunch_centers_team_idx on public.lunch_centers(team_id);
create index polls_team_created_idx on public.polls(team_id, created_at desc);
create index winner_history_team_restaurant_idx
  on public.winner_history(team_id, restaurant_id, won_on desc);

drop index public.lunch_centers_owner_place_key;
create unique index lunch_centers_team_place_key
  on public.lunch_centers(team_id, google_place_id) nulls not distinct
  where google_place_id is not null;

create function public.organizer_team_id_for_email(p_email text)
returns uuid language sql stable security definer
set search_path = pg_catalog, public
as $$
  select team_id
  from public.organizer_email_allowlist
  where email = lower(btrim(p_email));
$$;

create or replace function public.set_workspace_owner()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  listed_team_id uuid;
begin
  if tg_op = 'UPDATE' and old.owner_id is not null and new.owner_id is distinct from old.owner_id then
    raise exception using errcode = '42501', message = 'Workspace ownership is immutable';
  end if;
  if tg_op = 'UPDATE' and new.team_id is distinct from old.team_id then
    raise exception using errcode = '42501', message = 'Workspace team is immutable';
  end if;

  if new.owner_id is null then
    new.owner_id := public.organizer_id_for_email(new.created_by_admin);
  end if;

  if tg_op = 'INSERT' then
    listed_team_id := public.organizer_team_id_for_email(new.created_by_admin);
    if new.team_id is null then
      new.team_id := coalesce(
        listed_team_id,
        '00000000-0000-4000-8000-000000000001'::uuid
      );
    elsif listed_team_id is not null and new.team_id is distinct from listed_team_id then
      raise exception using errcode = '42501', message = 'Workspace team does not match organizer';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.set_winner_workspace()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  listed_team_id uuid;
begin
  if new.source_poll_id is not null then
    select p.owner_id, p.team_id into new.owner_id, new.team_id
    from public.polls p where p.id = new.source_poll_id;
    if tg_op = 'INSERT' then
      select c.fallback_label into new.fallback_label from public.poll_candidates c
      where c.poll_id = new.source_poll_id and c.restaurant_id = new.restaurant_id;
    end if;
  elsif new.owner_id is null then
    new.owner_id := public.organizer_id_for_email(new.created_by_admin);
  end if;

  if tg_op = 'INSERT' and new.source_poll_id is null then
    listed_team_id := public.organizer_team_id_for_email(new.created_by_admin);
    if new.team_id is null then
      new.team_id := coalesce(
        listed_team_id,
        '00000000-0000-4000-8000-000000000001'::uuid
      );
    elsif listed_team_id is not null and new.team_id is distinct from listed_team_id then
      raise exception using errcode = '42501', message = 'Workspace team does not match organizer';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.owner_id is not null and new.owner_id is distinct from old.owner_id then
    raise exception using errcode = '42501', message = 'Workspace ownership is immutable';
  end if;
  if tg_op = 'UPDATE' and new.team_id is distinct from old.team_id then
    raise exception using errcode = '42501', message = 'Workspace team is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.organizer_team_id_for_email(text)
  from public, anon, authenticated, service_role;
