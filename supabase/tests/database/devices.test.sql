-- Device connections, token secrecy and activities.
-- Runs against the seed data: `pnpm db:test` (or `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- Seed: Casey …05 (profile 2…05) has Strava connected; Riley …03 coaches Casey; Sam …02 coaches Jordan …04.

select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select isnt(
  public.save_device_connection('strava', '999', 'read', 'token-a', 'token-r', now() + interval '6 hours'),
  null,
  'an athlete can connect Strava'
);
select is(
  (select count(*)::int from public.device_connections where athlete_profile_id = '20000000-0000-0000-0000-000000000004'),
  1,
  'the connection is saved'
);
select throws_ok(
  $$select * from private.device_tokens$$,
  '42501',
  null,
  'athletes cannot read tokens'
);
select throws_ok(
  $$select * from public.device_tokens_for((select id from public.device_connections limit 1))$$,
  '42501',
  null,
  'athletes cannot call the token reader'
);
select throws_ok(
  $$insert into public.activities (athlete_profile_id, provider, external_id, started_at)
    values ('20000000-0000-0000-0000-000000000004', 'strava', 'fake', now())$$,
  '42501',
  null,
  'athletes cannot write activities directly'
);
select is((select count(*)::int from public.activities), 0, 'an athlete doesn''t see other athletes'' activities');

select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.activities), 3, 'a coach sees their athlete''s activities');
select is((select count(*)::int from public.device_connections), 1, 'a coach sees only their athletes'' connections');

select pg_temp.act_as('00000000-0000-0000-0000-000000000005');
select lives_ok(
  $$delete from public.device_connections where provider = 'strava'$$,
  'an athlete can disconnect'
);
select pg_temp.as_postgres();
select is((select count(*)::int from private.device_tokens
           where connection_id = 'a0000000-0000-0000-0000-000000000001'), 0,
  'disconnecting deletes the tokens');

-- Subscription levels: Strava left out of Jordan's level.
update public.organizations set feature_tiers_enabled = true where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select throws_ok(
  $$select public.save_device_connection('strava', '999', 'read', 'token-b', null, null)$$,
  '42501',
  null,
  'without Strava in their level, an athlete cannot connect it'
);

select * from finish();
rollback;
