-- Access rules and saving for workout logs.
-- Runs against the seed data: `pnpm db:test` (or `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Jordan's first planned session (seeded program) and its first exercise.
select set_config('test.session',
  (select s.id::text from public.program_sessions s
   join public.program_weeks w on w.id = s.week_id
   where s.program_id = '50000000-0000-0000-0000-000000000002'
   order by w.position, s.position limit 1), true);
select set_config('test.exercise',
  (select se.exercise_id::text from public.session_exercises se
   where se.session_id = current_setting('test.session')::uuid order by se.position limit 1), true);
select set_config('test.template_session',
  (select id::text from public.program_sessions
   where program_id = '50000000-0000-0000-0000-000000000001' limit 1), true);

create function pg_temp.workout(log_id text, session text, set_ids text[]) returns jsonb language sql as $$
  select jsonb_build_object(
    'id', log_id,
    'athleteProfileId', '20000000-0000-0000-0000-000000000004',
    'sessionId', session,
    'sessionName', 'Lower',
    'performedOn', '2026-11-09',
    'completedAt', '2026-11-09T18:00:00Z',
    'rpe', 7,
    'sets', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', set_ids[i], 'exerciseId', current_setting('test.exercise'),
      'position', i - 1, 'setNumber', i, 'reps', 5, 'load', 100, 'loadUnit', 'kg'
    ) order by i), '[]'::jsonb) from generate_subscripts(set_ids, 1) as i)
  );
$$;

-- Jordan logs a workout.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
select lives_ok(
  $$select public.save_workout(pg_temp.workout('60000000-0000-0000-0000-000000000001',
      current_setting('test.session'),
      array['61000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000002',
            '61000000-0000-0000-0000-000000000003']))$$,
  'an athlete can log a workout'
);
select is(
  (select count(*)::int from public.set_logs where workout_log_id = '60000000-0000-0000-0000-000000000001'),
  3,
  'the sets are saved'
);
select is(
  (select program_id::text from public.workout_logs where id = '60000000-0000-0000-0000-000000000001'),
  '50000000-0000-0000-0000-000000000002',
  'the log is linked to the program the session belongs to'
);

-- Saving again (e.g. a retry, or an edit with one set removed) updates rather than duplicates.
select lives_ok(
  $$select public.save_workout(pg_temp.workout('60000000-0000-0000-0000-000000000001',
      current_setting('test.session'),
      array['61000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000002']))$$,
  'saving the same workout again works'
);
select is(
  (select count(*)::int from public.workout_logs where athlete_profile_id = '20000000-0000-0000-0000-000000000004'),
  1,
  'a retry does not create a duplicate workout'
);
select is(
  (select count(*)::int from public.set_logs where workout_log_id = '60000000-0000-0000-0000-000000000001'),
  2,
  'removed sets are deleted'
);

select throws_ok(
  $$select public.save_workout(pg_temp.workout('60000000-0000-0000-0000-000000000002',
      current_setting('test.template_session'), array[]::text[]))$$,
  'P0001', null,
  'a workout can only link to the athlete''s own program sessions'
);

-- Coaches: Sam (Jordan's coach) can read but not write; Riley can't see it.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select is(
  (select count(*)::int from public.set_logs where workout_log_id = '60000000-0000-0000-0000-000000000001'),
  2,
  'the athlete''s coach sees their sets'
);
select is_empty(
  $$update public.set_logs set reps = 20 where workout_log_id = '60000000-0000-0000-0000-000000000001' returning id$$,
  'a coach cannot change an athlete''s logged sets'
);

select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
select is_empty(
  $$select id from public.workout_logs where id = '60000000-0000-0000-0000-000000000001'$$,
  'other coaches cannot see the workout'
);

-- Casey can't see Jordan's workout or log one as Jordan.
select pg_temp.act_as('00000000-0000-0000-0000-000000000005');
select is_empty(
  $$select id from public.set_logs where workout_log_id = '60000000-0000-0000-0000-000000000001'$$,
  'another athlete cannot see the sets'
);
select throws_ok(
  $$select public.save_workout(pg_temp.workout('60000000-0000-0000-0000-000000000003', null, array[]::text[]))$$,
  '42501', null,
  'an athlete cannot log a workout for someone else'
);

select * from finish();
rollback;
