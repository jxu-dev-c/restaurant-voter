-- Give removed voters a gentler explanation and a clear way to continue.

create or replace function public.prevent_blocked_voter_registration()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.poll_voter_blocks pvb
    where pvb.poll_id = new.poll_id and pvb.device_hash = new.device_hash
  ) then
    raise exception using
      errcode = '42501',
      message = 'This voter entry was removed as a duplicate. To continue, open the poll in a different browser profile.';
  end if;

  return new;
end;
$$;
