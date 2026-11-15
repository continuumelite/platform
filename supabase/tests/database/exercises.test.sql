-- Row-level security for the exercise library.
-- Runs against the seed data: `pnpm db:test` (or `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Seed: org library has several exercises; Sam owns 'Sam Private Carry' (private)
-- and 'Sam Shared Sled Push' (shared); Riley owns 'Riley Private Row' (private).

-- Coach Sam: org library + own + shared, not Riley's private one.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select ok(
  exists (select 1 from public.exercises where name = 'Back Squat'),
  'a coach sees the organization library'
);
select ok(
  exists (select 1 from public.exercises where name = 'Sam Private Carry'),
  'a coach sees their own private exercises'
);
select ok(
  not exists (select 1 from public.exercises where name = 'Riley Private Row'),
  'a coach cannot see another coach''s private exercises'
);
select lives_ok(
  $$insert into public.exercises (organization_id, owner_coach_id, name)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Sam New Lunge')$$,
  'a coach can add their own exercise'
);
select throws_ok(
  $$insert into public.exercises (organization_id, name)
    values ('10000000-0000-0000-0000-000000000001', 'Org Thing')$$,
  '42501', null,
  'a coach cannot add to the organization library'
);
select is_empty(
  $$update public.exercises set name = 'hacked' where name = 'Back Squat' returning id$$,
  'a coach cannot edit the organization library'
);
select is_empty(
  $$delete from public.exercises where name = 'Sam New Lunge' returning id$$,
  'exercises cannot be deleted, only archived'
);

-- Coach Riley sees Sam's shared exercise but not Sam's private one.
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select ok(
  exists (select 1 from public.exercises where name = 'Sam Shared Sled Push')
  and not exists (select 1 from public.exercises where name = 'Sam Private Carry'),
  'coaches see each other''s shared exercises only'
);

-- Athlete Jordan (coached by Sam) sees Sam's exercises but not Riley's.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select ok(
  exists (select 1 from public.exercises where name = 'Sam Private Carry'),
  'an athlete sees their coach''s exercises'
);
select ok(
  not exists (select 1 from public.exercises where name = 'Riley Private Row'),
  'an athlete cannot see other coaches'' private exercises'
);
select throws_ok(
  $$insert into public.exercises (organization_id, owner_coach_id, name)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Mine')$$,
  null, null,
  'an athlete cannot add exercises'
);

-- The owner manages the organization library.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select lives_ok(
  $$insert into public.exercises (organization_id, name, muscle_groups)
    values ('10000000-0000-0000-0000-000000000001', 'Nordic Curl', '{hamstrings}')$$,
  'the owner can add to the organization library'
);
select throws_ok(
  $$insert into public.exercises (organization_id, name)
    values ('10000000-0000-0000-0000-000000000001', 'back squat')$$,
  '23505', null,
  'names are unique within a library'
);

select * from finish();
rollback;
