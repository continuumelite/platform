-- Row-level security checks for the organization/coach/athlete rules.
-- Runs against the seed data: `pnpm db:test` (or `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Coach Sam sees only their own athlete.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select results_eq(
  'select user_id from public.athlete_profiles',
  array['00000000-0000-0000-0000-000000000004'::uuid],
  'a coach sees only athletes assigned to them'
);
select is_empty(
  $$update public.athlete_profiles set goals = 'hacked'
    where id = '20000000-0000-0000-0000-000000000005' returning id$$,
  'a coach cannot edit another coach''s athlete'
);
select throws_ok(
  $$insert into public.coach_athletes (organization_id, coach_user_id, athlete_profile_id, role)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
            '20000000-0000-0000-0000-000000000005', 'assistant')$$,
  '42501', null,
  'a coach cannot assign athletes to themselves'
);

-- Athlete Jordan sees only their own profile and cannot change roles.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select results_eq(
  'select user_id from public.athlete_profiles',
  array['00000000-0000-0000-0000-000000000004'::uuid],
  'an athlete sees only their own profile'
);
select is_empty(
  $$update public.memberships set role = 'owner'
    where user_id = '00000000-0000-0000-0000-000000000004' returning id$$,
  'an athlete cannot promote themselves'
);
select is_empty(
  'select id from public.audit_log',
  'an athlete cannot read the audit log'
);

-- The owner sees every athlete and the audit trail.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select is(
  (select count(*)::int from public.athlete_profiles),
  2,
  'the owner sees all athletes'
);
select isnt_empty(
  'select id from public.audit_log',
  'the owner can read the audit log'
);

-- Signed-out visitors see nothing.
select set_config('role', 'anon', true);
select is_empty(
  'select id from public.organizations',
  'anonymous users see no organizations'
);

select * from finish();
rollback;
