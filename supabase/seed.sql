-- Local development data only. Never run against staging or production.
-- Every seeded user signs in with the password: password123

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name),
  now(), now(), '', '', '', ''
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'owner@example.test', 'Olivia Owner'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'coach.sam@example.test', 'Sam Coach'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'coach.riley@example.test', 'Riley Coach'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'athlete.jordan@example.test', 'Jordan Athlete'),
  ('00000000-0000-0000-0000-000000000005'::uuid, 'athlete.casey@example.test', 'Casey Athlete')
) as u (id, email, full_name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users;

insert into public.organizations (id, name)
values ('10000000-0000-0000-0000-000000000001', 'Continuum Elite (dev)');

insert into public.memberships (organization_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'coach'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'coach'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'athlete'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'athlete');

insert into public.athlete_profiles (id, organization_id, user_id, goals) values
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000004', 'Squat 2x bodyweight by spring'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000005', 'Half marathon under 1:45');

-- Sam coaches Jordan; Riley coaches Casey.
insert into public.coach_athletes (organization_id, coach_user_id, athlete_profile_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000004', 'primary'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000005', 'primary');

-- Exercise library: organization-level exercises plus a few coach-owned ones.
insert into public.exercises (organization_id, owner_coach_id, is_shared, name, instructions, tracking, muscle_groups, equipment, created_by)
select '10000000-0000-0000-0000-000000000001', e.owner, e.shared, e.name, e.instructions,
       e.tracking::public.exercise_tracking, e.muscles, e.equipment,
       coalesce(e.owner, '00000000-0000-0000-0000-000000000001')
from (values
  (null::uuid, false, 'Back Squat', 'Brace, sit between the hips, knees track over toes. Drive up through mid-foot.',
   'weight_reps', '{quads,glutes,core}'::text[], '{barbell}'::text[]),
  (null, false, 'Bench Press', 'Shoulder blades pinned, bar to lower chest, press back over the shoulders.',
   'weight_reps', '{chest,triceps,shoulders}', '{barbell}'),
  (null, false, 'Trap Bar Deadlift', 'Hips back, chest tall, push the floor away.',
   'weight_reps', '{glutes,hamstrings,quads,back}', '{trap_bar}'),
  (null, false, 'Romanian Deadlift', 'Soft knees, hinge until hamstrings load, keep the bar close.',
   'weight_reps', '{hamstrings,glutes}', '{barbell}'),
  (null, false, 'Pull-up', 'Full hang to chin over bar. Control the way down.',
   'reps', '{back,biceps}', '{bodyweight}'),
  (null, false, 'Dumbbell Walking Lunge', 'Long stride, back knee kisses the floor.',
   'weight_reps', '{quads,glutes}', '{dumbbell}'),
  (null, false, 'Plank', 'Ribs down, squeeze glutes, straight line head to heel.',
   'time', '{core}', '{bodyweight}'),
  (null, false, 'Assault Bike', 'Steady effort unless the session says otherwise.',
   'distance', '{full_body}', '{machine}'),
  ('00000000-0000-0000-0000-000000000002'::uuid, false, 'Sam Private Carry', 'Sam''s farmer carry variation.',
   'distance', '{forearms,core}', '{kettlebell}'),
  ('00000000-0000-0000-0000-000000000002'::uuid, true, 'Sam Shared Sled Push', 'Low hips, drive through the balls of the feet.',
   'distance', '{quads,glutes}', '{other}'),
  ('00000000-0000-0000-0000-000000000003'::uuid, false, 'Riley Private Row', 'Riley''s chest-supported row.',
   'weight_reps', '{back}', '{dumbbell}')
) as e (owner, shared, name, instructions, tracking, muscles, equipment);

-- Programs: a 4-week organization template, and Jordan's active program copied from it.
-- Saved through save_program() (acting as the coach) so versions and rows stay consistent.
do $$
declare
  ex jsonb := (select jsonb_object_agg(name, id) from public.exercises where owner_coach_id is null);
  sessions_template jsonb := jsonb_build_array(
    jsonb_build_object('name', 'Lower', 'day', 1, 'items', jsonb_build_array(
      jsonb_build_array('Back Squat', 4, '5', 'percent_1rm', 75, 7, 180),
      jsonb_build_array('Romanian Deadlift', 3, '8', 'none', null, 7, 120),
      jsonb_build_array('Dumbbell Walking Lunge', 3, '10', 'none', null, 7, 90),
      jsonb_build_array('Plank', 3, '45s', 'none', null, null, 60))),
    jsonb_build_object('name', 'Upper', 'day', 3, 'items', jsonb_build_array(
      jsonb_build_array('Bench Press', 4, '5', 'percent_1rm', 75, 7, 180),
      jsonb_build_array('Pull-up', 4, '6-8', 'none', null, 8, 120))),
    jsonb_build_object('name', 'Full body', 'day', 5, 'items', jsonb_build_array(
      jsonb_build_array('Trap Bar Deadlift', 4, '4', 'percent_1rm', 80, 7.5, 180),
      jsonb_build_array('Assault Bike', 6, '200m', 'none', null, 8, 60)))
  );
  doc jsonb;
  weeks jsonb;
  sessions jsonb;
  items jsonb;
  s jsonb;
  i jsonb;
  w int;
  template_id uuid := '50000000-0000-0000-0000-000000000001';
  jordan_program_id uuid := '50000000-0000-0000-0000-000000000002';
begin
  for pass in 1..2 loop
    weeks := '[]';
    for w in 1..4 loop
      sessions := '[]';
      for s in select * from jsonb_array_elements(sessions_template) loop
        items := '[]';
        for i in select * from jsonb_array_elements(s -> 'items') loop
          items := items || jsonb_build_object(
            'id', gen_random_uuid(), 'exerciseId', ex ->> (i ->> 0),
            -- Week 4 is a deload: fewer sets, lighter.
            'sets', case when w = 4 then greatest((i ->> 1)::int - 1, 1) else (i ->> 1)::int end,
            'reps', i ->> 2, 'loadType', i ->> 3,
            'loadValue', case when i -> 4 = 'null' then null
                              when w = 4 then (i ->> 4)::numeric - 10
                              else (i ->> 4)::numeric + (w - 1) * 2.5 end,
            'rpe', case when i -> 5 = 'null' then null else (i ->> 5)::numeric end,
            'restSeconds', (i ->> 6)::int);
        end loop;
        sessions := sessions || jsonb_build_object(
          'id', gen_random_uuid(), 'name', s ->> 'name', 'dayOfWeek', (s ->> 'day')::int, 'exercises', items);
      end loop;
      weeks := weeks || jsonb_build_object('id', gen_random_uuid(), 'isDeload', w = 4, 'sessions', sessions);
    end loop;
    doc := jsonb_build_object(
      'name', case when pass = 1 then 'Foundations Strength (4 weeks)' else 'Jordan – Foundations' end,
      'description', '3 days a week. Build to week 3, deload in week 4.',
      'blocks', jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Foundation', 'weeks', weeks)));

    if pass = 1 then
      perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
      insert into public.programs (id, organization_id, name)
      values (template_id, '10000000-0000-0000-0000-000000000001', 'Foundations Strength (4 weeks)');
      perform public.save_program(template_id, 0, doc, 'Initial template');
    else
      perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
      insert into public.programs (id, organization_id, athlete_profile_id, name, status, start_date, source_program_id)
      values (jordan_program_id, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004',
              'Jordan – Foundations', 'active', date_trunc('week', current_date)::date, template_id);
      perform public.save_program(jordan_program_id, 0, doc, 'Copied from Foundations Strength');
    end if;
  end loop;
  perform set_config('request.jwt.claims', '', true);
end;
$$;
