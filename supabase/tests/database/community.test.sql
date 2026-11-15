-- Community feed access rules.
-- Runs against the seed data: `pnpm db:test` (or `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- Seed: owner …01, coach Sam …02, coach Riley …03, athletes Jordan …04 and Casey …05.
-- Posts: …01 pinned (Sam), …02 (Casey).

select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select is((select count(*)::int from public.community_posts), 2, 'an athlete sees the whole organization''s feed');
select is(
  (select author_role::text from public.community_posts where id = '70000000-0000-0000-0000-000000000001'),
  'coach',
  'coach posts are marked so they can be highlighted'
);

select lives_ok(
  $$insert into public.community_posts (id, organization_id, author_id, body, pinned)
    values ('70000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000004', 'Hello team', true)$$,
  'an athlete can post'
);
select ok(
  not (select pinned from public.community_posts where id = '70000000-0000-0000-0000-0000000000a1'),
  'an athlete''s post is never pinned'
);
select throws_ok(
  $$insert into public.community_posts (organization_id, author_id, body)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'Pretending')$$,
  '42501',
  null,
  'nobody can post as someone else'
);
select throws_ok(
  $$update public.community_posts set pinned = true where id = '70000000-0000-0000-0000-0000000000a1'$$,
  '42501',
  null,
  'an athlete cannot pin'
);
update public.community_posts set body = 'Hacked' where id = '70000000-0000-0000-0000-000000000002';
select pg_temp.as_postgres();
select is(
  (select body from public.community_posts where id = '70000000-0000-0000-0000-000000000002'),
  'First 10k under 50 minutes this morning! Legs are toast.',
  'an athlete cannot edit someone else''s post'
);

select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select lives_ok(
  $$insert into public.community_comments (post_id, author_id, body)
    values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'See you there')$$,
  'an athlete can comment'
);
select lives_ok(
  $$insert into public.community_reactions (post_id, user_id)
    values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004')$$,
  'an athlete can like a post'
);
select lives_ok(
  $$insert into public.community_reports (post_id, reporter_id, reason)
    values ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'test')$$,
  'an athlete can report a post'
);
select is((select count(*)::int from public.community_reports), 0, 'athletes cannot read reports');

-- Coaches moderate.
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.community_reports), 1, 'coaches see reports');
select lives_ok(
  $$update public.community_posts set hidden_at = now() where id = '70000000-0000-0000-0000-0000000000a1'$$,
  'a coach can hide a post'
);
select is(
  (select hidden_by::text from public.community_posts where id = '70000000-0000-0000-0000-0000000000a1'),
  '00000000-0000-0000-0000-000000000003',
  'hiding records who hid it'
);
select pg_temp.act_as('00000000-0000-0000-0000-000000000005');
select is(
  (select count(*)::int from public.community_posts where id = '70000000-0000-0000-0000-0000000000a1'),
  0,
  'athletes no longer see a hidden post'
);

-- Subscription levels: with levels on and community left out of Jordan's level.
select pg_temp.as_postgres();
update public.organizations set feature_tiers_enabled = true where id = '10000000-0000-0000-0000-000000000001';
insert into public.plan_features (plan_id, feature_key)
select id, 'community.view' from public.plans
where organization_id = '10000000-0000-0000-0000-000000000001' and level = 3;

select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select is((select count(*)::int from public.community_posts), 0, 'without community in their level, an athlete sees no feed');
select throws_ok(
  $$insert into public.community_posts (organization_id, author_id, body)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Let me in')$$,
  '42501',
  null,
  'without posting in their level, an athlete cannot post'
);
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select ok((select count(*) from public.community_posts) >= 2, 'coaches always see the feed');

select * from finish();
rollback;
