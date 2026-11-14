-- Access rules and saving for programs.
-- Runs against the seed data: `pnpm db:test` (or `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Exercise ids for building documents.
select set_config('test.squat', (select id::text from public.exercises where name = 'Back Squat'), true);
select set_config('test.bench', (select id::text from public.exercises where name = 'Bench Press'), true);

-- A one-session program document with the given exercises.
create function pg_temp.doc(prefix text, exercise_ids text[]) returns jsonb language sql as $$
  select jsonb_build_object(
    'name', 'Strength Block',
    'blocks', jsonb_build_array(jsonb_build_object(
      'id', (prefix || '0000-0000-0000-000000000001')::uuid, 'name', 'Accumulation',
      'weeks', jsonb_build_array(jsonb_build_object(
        'id', (prefix || '0000-0000-0000-000000000002')::uuid,
        'sessions', jsonb_build_array(jsonb_build_object(
          'id', (prefix || '0000-0000-0000-000000000003')::uuid, 'name', 'Lower A', 'dayOfWeek', 1,
          'exercises', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'id', (prefix || '0000-0000-0000-00000000001' || i)::uuid,
              'exerciseId', exercise_ids[i], 'sets', 3, 'reps', '5', 'loadType', 'percent_1rm',
              'loadValue', 75, 'rpe', 7.5, 'restSeconds', 180
            ) order by i), '[]'::jsonb)
            from generate_subscripts(exercise_ids, 1) as i
          )
        ))
      ))
    ))
  );
$$;

-- Coach Sam builds a template.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select lives_ok(
  $$insert into public.programs (id, organization_id, owner_coach_id, name)
    values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002', 'Sam Template')$$,
  'a coach can create their own template'
);
select is(
  public.save_program('40000000-0000-0000-0000-000000000001', 0,
    pg_temp.doc('41000000-', array[current_setting('test.squat'), current_setting('test.bench')]), 'first draft'),
  1,
  'saving a program returns the new version'
);
select is(
  (select count(*)::int from public.session_exercises where program_id = '40000000-0000-0000-0000-000000000001'),
  2,
  'the saved structure is stored as rows'
);
select throws_ok(
  $$select public.save_program('40000000-0000-0000-0000-000000000001', 0,
    pg_temp.doc('41000000-', array[current_setting('test.squat')]))$$,
  '40001', null,
  'a save based on an old version is rejected'
);
select throws_ok(
  $$update public.programs set current_version = 99 where id = '40000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'the version can only change through save_program'
);

-- Coach Riley can see and copy Sam's template, but not edit it.
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select is(
  (select count(*)::int from public.programs where id = '40000000-0000-0000-0000-000000000001'),
  1,
  'other coaches can see templates'
);
select throws_ok(
  $$select public.save_program('40000000-0000-0000-0000-000000000001', 1,
    pg_temp.doc('41000000-', array[current_setting('test.squat')]))$$,
  '42501', null,
  'other coaches cannot edit someone else''s template'
);
select throws_ok(
  $$insert into public.programs (organization_id, athlete_profile_id, name)
    values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'Not mine')$$,
  '42501', null,
  'a coach cannot create programs for another coach''s athlete'
);

-- Sam writes Jordan's program (draft first).
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select lives_ok(
  $$insert into public.programs (id, organization_id, athlete_profile_id, name, source_program_id)
    values ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
            '20000000-0000-0000-0000-000000000004', 'Jordan Block 1', '40000000-0000-0000-0000-000000000001')$$,
  'a coach can create a program for their athlete'
);
select isnt_empty(
  $$insert into public.programs (organization_id, athlete_profile_id, name)
    values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'Returned')
    returning id$$,
  'a coach gets the new program back from the insert'
);
select throws_ok(
  $$select public.save_program('40000000-0000-0000-0000-000000000002', 0,
    pg_temp.doc('41000000-', array[current_setting('test.squat')]))$$,
  'P0001', 'Program document contains items from another program',
  'a program cannot take over another program''s items'
);
select is(
  public.save_program('40000000-0000-0000-0000-000000000002', 0,
    pg_temp.doc('42000000-', array[current_setting('test.squat'), current_setting('test.bench')]), 'copied from template'),
  1,
  'the copy saves with fresh ids'
);

-- Jordan can't see the draft.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select is_empty(
  $$select id from public.programs where id = '40000000-0000-0000-0000-000000000002'$$,
  'an athlete cannot see a draft program'
);

-- Sam publishes it, then trims a lift with a reason.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
update public.programs set status = 'active', start_date = '2026-11-16'
where id = '40000000-0000-0000-0000-000000000002';
select is(
  public.save_program('40000000-0000-0000-0000-000000000002', 1,
    pg_temp.doc('42000000-', array[current_setting('test.squat')]), 'cut bench: shoulder irritation'),
  2,
  'the coach can keep adjusting the program'
);
select is(
  (select count(*)::int from public.session_exercises where program_id = '40000000-0000-0000-0000-000000000002'),
  1,
  'removed exercises are deleted'
);
select results_eq(
  $$select reason from public.program_versions
    where program_id = '40000000-0000-0000-0000-000000000002' order by version$$,
  array['copied from template', 'cut bench: shoulder irritation'],
  'every save is recorded with the coach''s reason'
);

-- Jordan now sees the active program, but not the coach's history, and can't change it.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select is(
  (select count(*)::int from public.session_exercises where program_id = '40000000-0000-0000-0000-000000000002'),
  1,
  'an athlete sees their active program'
);
select is_empty(
  $$select id from public.program_versions where program_id = '40000000-0000-0000-0000-000000000002'$$,
  'an athlete cannot see the coach''s version history'
);
select is_empty(
  $$update public.programs set name = 'easy week' where id = '40000000-0000-0000-0000-000000000002' returning id$$,
  'an athlete cannot edit their program'
);

select * from finish();
rollback;
