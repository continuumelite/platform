-- Nutrition targets and food logs.
-- Runs against the seed data: `pnpm db:test` (or `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- Seed: coach Sam …02 coaches Jordan …04 (profile 2…04); coach Riley …03 coaches Casey.

select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select is((select count(*)::int from public.nutrition_targets), 2, 'an athlete sees their targets');
select lives_ok(
  $$insert into public.food_logs (id, athlete_profile_id, logged_on, meal, name, calories, protein_g)
    values ('80000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000004',
            current_date, 'lunch', 'Chicken wrap', 610, 45)$$,
  'an athlete can log food'
);
select lives_ok(
  $$insert into public.food_logs (id, athlete_profile_id, logged_on, meal, name, calories, protein_g)
    values ('80000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000004',
            current_date, 'lunch', 'Chicken wrap', 650, 45)
    on conflict (id) do update set calories = excluded.calories$$,
  'retrying the same entry updates it instead of duplicating'
);
select is(
  (select count(*)::int from public.food_logs where id = '80000000-0000-0000-0000-0000000000a1'),
  1,
  'no duplicate entry'
);
select throws_ok(
  $$insert into public.food_logs (id, athlete_profile_id, logged_on, meal, name)
    values (gen_random_uuid(), '20000000-0000-0000-0000-000000000005', current_date, 'snack', 'Not mine')$$,
  '42501',
  null,
  'an athlete cannot log food for someone else'
);
update public.nutrition_targets set calories = 9999;
select pg_temp.as_postgres();
select is(
  (select calories from public.nutrition_targets
   where athlete_profile_id = '20000000-0000-0000-0000-000000000004' and day_type = 'any'),
  2400,
  'an athlete cannot change their own targets'
);

-- Coaches.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.food_logs
           where athlete_profile_id = '20000000-0000-0000-0000-000000000004'), 2,
  'the coach sees their athlete''s food log');
select lives_ok(
  $$update public.nutrition_targets set calories = 2500
    where athlete_profile_id = '20000000-0000-0000-0000-000000000004' and day_type = 'any'$$,
  'the coach can change targets'
);
select is(
  (select set_by::text from public.nutrition_targets
   where athlete_profile_id = '20000000-0000-0000-0000-000000000004' and day_type = 'any'),
  '00000000-0000-0000-0000-000000000002',
  'targets record who set them'
);
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.food_logs
           where athlete_profile_id = '20000000-0000-0000-0000-000000000004'), 0,
  'another athlete''s coach cannot see the food log');

-- Subscription levels.
select pg_temp.as_postgres();
update public.organizations set feature_tiers_enabled = true where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select is((select count(*)::int from public.nutrition_targets), 0,
  'without targets in their level, an athlete doesn''t see them');
select throws_ok(
  $$insert into public.food_logs (id, athlete_profile_id, logged_on, meal, name)
    values (gen_random_uuid(), '20000000-0000-0000-0000-000000000004', current_date, 'snack', 'Apple')$$,
  '42501',
  null,
  'without logging in their level, an athlete cannot log food'
);

select * from finish();
rollback;
