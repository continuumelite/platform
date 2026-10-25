-- Local development data only. Never run against staging or production.
-- Every seeded user signs in with the password: password123

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name),
  now(), now(), '', '', '', ''
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'owner@example.test', 'Olivia Owner'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'coach.sam@example.test', 'Sam Coach'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'coach.riley@example.test', 'Riley Coach'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'athlete.jordan@example.test', 'Jordan Athlete'),
  ('00000000-0000-0000-0000-000000000005'::uuid, 'athlete.casey@example.test', 'Casey Athlete')
) as u (id, email, full_name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users;

insert into public.organizations (id, name)
values ('10000000-0000-0000-0000-000000000001', 'Continuum Elite (dev)');

insert into public.memberships (organization_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'coach'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'coach'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'athlete'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'athlete');

insert into public.athlete_profiles (id, organization_id, user_id, goals) values
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000004', 'Squat 2x bodyweight by spring'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000005', 'Half marathon under 1:45');

-- Sam coaches Jordan; Riley coaches Casey.
insert into public.coach_athletes (organization_id, coach_user_id, athlete_profile_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000004', 'primary'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000005', 'primary');
