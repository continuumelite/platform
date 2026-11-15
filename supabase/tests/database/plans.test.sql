-- Subscription levels, the feature mapping and feature checks.
-- Runs against the seed data: `pnpm db:test` (or `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- Seed ids: owner …01, coach Sam …02 (coaches Jordan), coach Riley …03, athlete Jordan …04.
select set_config('test.org', '10000000-0000-0000-0000-000000000001', true);
select set_config('test.jordan', '20000000-0000-0000-0000-000000000004', true);
select set_config('test.level1',
  (select id::text from public.plans where organization_id = current_setting('test.org')::uuid and level = 1), true);
select set_config('test.level2',
  (select id::text from public.plans where organization_id = current_setting('test.org')::uuid and level = 2), true);
select set_config('test.level3',
  (select id::text from public.plans where organization_id = current_setting('test.org')::uuid and level = 3), true);

create function pg_temp.settings(tiers boolean) returns jsonb language sql as $$
  select jsonb_build_object(
    'tiersEnabled', tiers,
    'plans', jsonb_build_array(
      jsonb_build_object('id', current_setting('test.level1'), 'name', 'Base', 'description', null,
        'priceCents', 4900, 'features', jsonb_build_array(
          jsonb_build_object('key', 'training.logging', 'limit', null))),
      jsonb_build_object('id', current_setting('test.level2'), 'name', 'Plus', 'description', null,
        'priceCents', 9900, 'features', jsonb_build_array(
          jsonb_build_object('key', 'training.logging', 'limit', null),
          jsonb_build_object('key', 'community.post', 'limit', null),
          jsonb_build_object('key', 'messaging', 'limit', 5))),
      jsonb_build_object('id', current_setting('test.level3'), 'name', 'Elite', 'description', null,
        'priceCents', 19900, 'features', '[]'::jsonb)
    )
  );
$$;

select is(
  (select count(*)::int from public.plans where organization_id = current_setting('test.org')::uuid),
  3,
  'an organization has three plans'
);
select ok(
  private.has_feature(current_setting('test.jordan')::uuid, 'community.post'),
  'with tiers off, an athlete has every feature'
);

-- Only the owner can change tiers.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
update public.plans set name = 'Hacked' where id = current_setting('test.level1')::uuid;
select is(
  (select name from public.plans where id = current_setting('test.level1')::uuid),
  'Level 1',
  'an athlete cannot rename a plan'
);
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select throws_ok(
  $$select public.save_plan_settings(current_setting('test.org')::uuid, pg_temp.settings(true))$$,
  '42501',
  null,
  'a coach cannot change the plan settings'
);
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select lives_ok(
  $$select public.save_plan_settings(current_setting('test.org')::uuid, pg_temp.settings(true))$$,
  'the owner can save the plan settings'
);
select is(
  (select name from public.plans where id = current_setting('test.level2')::uuid),
  'Plus',
  'the plan names are saved'
);

-- With tiers on, Jordan (no subscription) gets the default plan, level 1.
select ok(
  private.has_feature(current_setting('test.jordan')::uuid, 'training.logging'),
  'the default plan includes its features'
);
select ok(
  not private.has_feature(current_setting('test.jordan')::uuid, 'community.post'),
  'with tiers on, features outside the plan are locked'
);

-- Setting an athlete's plan.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select throws_ok(
  $$insert into public.subscriptions (athlete_profile_id, plan_id)
    values (current_setting('test.jordan')::uuid, current_setting('test.level3')::uuid)$$,
  '42501',
  null,
  'an athlete cannot set their own plan'
);
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select throws_ok(
  $$insert into public.subscriptions (athlete_profile_id, plan_id, source)
    values (current_setting('test.jordan')::uuid, current_setting('test.level3')::uuid, 'stripe')$$,
  '42501',
  null,
  'a coach cannot create a paid subscription'
);
select lives_ok(
  $$insert into public.subscriptions (athlete_profile_id, plan_id)
    values (current_setting('test.jordan')::uuid, current_setting('test.level2')::uuid)$$,
  'a coach can put their athlete on a plan'
);
select ok(
  private.has_feature(current_setting('test.jordan')::uuid, 'community.post'),
  'the athlete gets the features of their plan'
);

select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
update public.subscriptions set plan_id = current_setting('test.level3')::uuid
where athlete_profile_id = current_setting('test.jordan')::uuid;
select pg_temp.as_postgres();
select is(
  (select plan_id::text from public.subscriptions where athlete_profile_id = current_setting('test.jordan')::uuid),
  current_setting('test.level2'),
  'another athlete''s coach cannot change the plan'
);

-- What the apps see.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select is(
  public.my_plan() - 'plan',
  jsonb_build_object('tiersEnabled', true, 'staff', false,
    'features', jsonb_build_object('training.logging', null, 'community.post', null, 'messaging', 5)),
  'my_plan() lists the athlete''s features and limits'
);
select is((public.my_plan() -> 'plan' ->> 'name'), 'Plus', 'my_plan() names the athlete''s plan');
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select is((public.my_plan() ->> 'staff')::boolean, true, 'coaches are staff (every feature)');

-- A canceled subscription falls back to the default plan.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
update public.subscriptions set status = 'canceled'
where athlete_profile_id = current_setting('test.jordan')::uuid;
select ok(
  not private.has_feature(current_setting('test.jordan')::uuid, 'community.post'),
  'a canceled subscription falls back to the default plan'
);

-- Integrity.
select pg_temp.as_postgres();
insert into public.organizations (id, name) values ('10000000-0000-0000-0000-0000000000ff', 'Other org');
select is(
  (select count(*)::int from public.plans where organization_id = '10000000-0000-0000-0000-0000000000ff'),
  3,
  'a new organization starts with three plans'
);
select throws_ok(
  $$update public.subscriptions
    set plan_id = (select id from public.plans
                   where organization_id = '10000000-0000-0000-0000-0000000000ff' and level = 1)
    where athlete_profile_id = current_setting('test.jordan')::uuid$$,
  'P0001',
  'That plan is not part of this athlete''s organization',
  'an athlete cannot be put on another organization''s plan'
);

select * from finish();
rollback;
