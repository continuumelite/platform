-- Coach <-> athlete messaging.
-- Runs against the seed data: `pnpm db:test` (or `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- Seed: Sam …02 coaches Jordan …04 (thread 9…01); Riley …03 coaches Casey …05.

select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select is((select count(*)::int from public.messages), 1, 'an athlete sees their conversation');
select is(
  (select unread from public.my_unread_messages() where thread_id = '90000000-0000-0000-0000-000000000001'),
  1,
  'the coach''s message is unread'
);
select lives_ok(
  $$insert into public.messages (id, thread_id, sender_id, body)
    values ('91000000-0000-0000-0000-0000000000a1', '90000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000004', 'Thanks coach!')$$,
  'an athlete can reply'
);
select is(
  (select unread from public.my_unread_messages() where thread_id = '90000000-0000-0000-0000-000000000001'),
  0,
  'replying marks the conversation read'
);
select throws_ok(
  $$insert into public.messages (id, thread_id, sender_id, body)
    values (gen_random_uuid(), '90000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002', 'Pretending to be the coach')$$,
  '42501',
  null,
  'nobody can send as someone else'
);
select throws_ok(
  $$select public.get_message_thread('20000000-0000-0000-0000-000000000005')$$,
  '42501',
  null,
  'an athlete cannot open someone else''s conversation'
);

select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.messages), 0, 'another athlete''s coach cannot read the conversation');
select isnt(public.get_message_thread('20000000-0000-0000-0000-000000000005'), null,
  'a coach can start a conversation with their athlete');

select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select is(
  (select unread from public.my_unread_messages() where thread_id = '90000000-0000-0000-0000-000000000001'),
  1,
  'the coach sees the athlete''s reply as unread'
);
select ok(
  (select last_message_at is not null from public.message_threads where id = '90000000-0000-0000-0000-000000000001'),
  'the conversation records its latest message'
);

-- Subscription levels: messaging included with a limit of 2 a week (Jordan has sent 1).
select pg_temp.as_postgres();
update public.organizations set feature_tiers_enabled = true where id = '10000000-0000-0000-0000-000000000001';
insert into public.plan_features (plan_id, feature_key, usage_limit)
select id, 'messaging', 2 from public.plans
where organization_id = '10000000-0000-0000-0000-000000000001' and level = 1;

select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select lives_ok(
  $$insert into public.messages (id, thread_id, sender_id, body)
    values (gen_random_uuid(), '90000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000004', 'Second message')$$,
  'an athlete can send up to their weekly limit'
);
select throws_ok(
  $$insert into public.messages (id, thread_id, sender_id, body)
    values (gen_random_uuid(), '90000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000004', 'Third message')$$,
  'P0002',
  null,
  'an athlete cannot go over their weekly limit'
);
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select lives_ok(
  $$insert into public.messages (id, thread_id, sender_id, body)
    values (gen_random_uuid(), '90000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002', 'Coaches have no limit')$$,
  'coaches are never limited'
);

select * from finish();
rollback;
