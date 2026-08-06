-- Local-only demo data. Production data must be created through the admin UI.

insert into public.lunch_centers (
  id,
  name,
  address_label,
  latitude,
  longitude,
  created_by_admin
) values (
  '10000000-0000-4000-8000-000000000001',
  'Demo office',
  'Halifax, Nova Scotia',
  44.6488,
  -63.5752,
  'admin@example.com'
)
on conflict (id) do nothing;

insert into public.polls (
  id,
  public_id,
  title,
  status,
  lunch_center_id,
  center_name,
  center_address,
  center_latitude,
  center_longitude,
  vote_limit,
  nominations_enabled,
  nominations_started_at,
  created_by_admin
) values (
  '20000000-0000-4000-8000-000000000001',
  'demo-lunch-poll',
  'Friday team lunch',
  'nominations',
  '10000000-0000-4000-8000-000000000001',
  'Demo office',
  'Halifax, Nova Scotia',
  44.6488,
  -63.5752,
  3,
  true,
  now(),
  'admin@example.com'
)
on conflict (id) do nothing;
