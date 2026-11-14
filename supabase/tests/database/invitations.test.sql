-- Row-level security and acceptance rules for invitations.
-- Runs against the seed data: `pnpm db:test` (or `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Two people who have signed up but belong to no organization yet.
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000098',
   'authenticated', 'authenticated', 'new.athlete@example.test', '{"full_name":"New Athlete"}'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000099',
   'authenticated', 'authenticated', 'someone.else@example.test', '{"full_name":"Someone Else"}');

-- Coach Sam invites an athlete for themselves.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select lives_ok(
  $$insert into public.invitations (id, organization_id, email, role, coach_user_id, token)
    values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
            'new.athlete@example.test', 'athlete', '00000000-0000-0000-0000-000000000002', 'test-token')$$,
  'a coach can invite an athlete for themselves'
);
select throws_ok(
  $$insert into public.invitations (organization_id, email, role)
    values ('10000000-0000-0000-0000-000000000001', 'new.coach@example.test', 'coach')$$,
  '42501', null,
  'a coach cannot invite another coach'
);
select throws_ok(
  $$insert into public.invitations (organization_id, email, role, coach_user_id)
    values ('10000000-0000-0000-0000-000000000001', 'other@example.test', 'athlete',
            '00000000-0000-0000-0000-000000000003')$$,
  '42501', null,
  'a coach cannot invite an athlete for a different coach'
);

-- Coach Riley does not see Sam's invitation; the owner does.
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select is_empty('select id from public.invitations', 'a coach cannot see other coaches'' invitations');
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.invitations), 1, 'the owner sees all invitations');

-- Athletes cannot see or create invitations.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select is_empty('select id from public.invitations', 'an athlete cannot see invitations');
select throws_ok(
  $$insert into public.invitations (organization_id, email, role)
    values ('10000000-0000-0000-0000-000000000001', 'friend@example.test', 'athlete')$$,
  '42501', null,
  'an athlete cannot invite anyone'
);

-- Anyone with the token can see what the invitation is for.
select set_config('role', 'anon', true);
select is(
  (select organization_name from public.get_invitation('test-token')),
  'Continuum Elite (dev)',
  'the invite page can look up an invitation by token'
);

-- Only the invited email address can accept.
select pg_temp.act_as('00000000-0000-0000-0000-000000000099');
select throws_ok(
  $$select public.accept_invitation('test-token')$$,
  'P0001', 'This invitation was sent to a different email address',
  'someone else cannot accept the invitation'
);

select pg_temp.act_as('00000000-0000-0000-0000-000000000098');
select lives_ok($$select public.accept_invitation('test-token')$$, 'the invited person can accept');
select throws_ok(
  $$select public.accept_invitation('test-token')$$,
  'P0001', 'Invitation has already been used',
  'an invitation works only once'
);
select results_eq(
  'select role::text from public.memberships where user_id = auth.uid()',
  array['athlete'],
  'accepting makes the person an athlete in the organization'
);

-- Sam now sees the new athlete as one of theirs.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select is(
  (select count(*)::int from public.athlete_profiles
   where user_id = '00000000-0000-0000-0000-000000000098'),
  1,
  'the inviting coach becomes the new athlete''s coach'
);

select * from finish();
rollback;
