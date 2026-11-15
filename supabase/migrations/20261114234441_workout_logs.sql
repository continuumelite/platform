-- Workout logs: what the athlete actually did.
--
-- A workout_log is one training session on one day, usually linked to a planned program
-- session. set_logs are the individual sets. Logs keep working if the coach later edits or
-- removes the planned session (links are set to null; the exercise and numbers stay).
--
-- Access rules:
--   * Athletes create, edit and delete their own logs.
--   * The athlete's assigned coaches and org leads can read them.
--
-- Writing: the app saves a whole workout at once through save_workout(), which runs as the
-- signed-in user, so the row-level security below applies to every write.

create type public.load_unit as enum ('kg', 'lb');

create table public.workout_logs (
  id uuid primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  athlete_profile_id uuid not null references public.athlete_profiles (id) on delete cascade,
  program_id uuid references public.programs (id) on delete set null,
  session_id uuid references public.program_sessions (id) on delete set null,
  -- Copied from the plan so history reads well even if the session is renamed or removed.
  session_name text not null default '' check (char_length(session_name) <= 200),
  performed_on date not null,
  started_at timestamptz,
  completed_at timestamptz,
  -- Session RPE (how hard the whole workout felt).
  rpe numeric(3, 1) check (rpe between 1 and 10),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_logs_athlete_idx on public.workout_logs (athlete_profile_id, performed_on desc);
create index workout_logs_session_idx on public.workout_logs (session_id);

-- One log per planned session per day.
create unique index workout_logs_one_per_session_day_idx
  on public.workout_logs (athlete_profile_id, session_id, performed_on)
  where session_id is not null;

create table public.set_logs (
  id uuid primary key,
  workout_log_id uuid not null references public.workout_logs (id) on delete cascade,
  session_exercise_id uuid references public.session_exercises (id) on delete set null,
  exercise_id uuid not null references public.exercises (id),
  position integer not null,
  set_number smallint not null check (set_number between 1 and 100),
  reps smallint check (reps between 0 and 1000),
  load numeric(7, 2) check (load >= 0),
  load_unit public.load_unit not null default 'kg',
  duration_seconds integer check (duration_seconds between 0 and 86400),
  distance_meters numeric(9, 1) check (distance_meters >= 0),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  completed boolean not null default true,
  notes text check (char_length(notes) <= 500)
);

create index set_logs_workout_idx on public.set_logs (workout_log_id, position);
create index set_logs_exercise_idx on public.set_logs (exercise_id);

create trigger workout_logs_updated_at before update on public.workout_logs
  for each row execute function private.set_updated_at();

create trigger workout_logs_audit after insert or update or delete on public.workout_logs
  for each row execute function private.write_audit_log();

-- Fill in the organization from the athlete, keep the athlete fixed, and make sure a linked
-- session belongs to one of this athlete's programs.
create function private.check_workout_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.athlete_profile_id is distinct from old.athlete_profile_id then
    raise exception 'athlete_profile_id cannot be changed';
  end if;

  select a.organization_id into new.organization_id
  from public.athlete_profiles a where a.id = new.athlete_profile_id;

  if new.session_id is not null then
    select s.program_id into new.program_id
    from public.program_sessions s
    join public.programs p on p.id = s.program_id
    where s.id = new.session_id and p.athlete_profile_id = new.athlete_profile_id;

    if new.program_id is null then
      raise exception 'Session % is not part of this athlete''s programs', new.session_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger workout_logs_check before insert or update on public.workout_logs
  for each row execute function private.check_workout_log();

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------

create function private.is_own_athlete_profile(target_athlete_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.athlete_profiles a
    where a.id = target_athlete_profile_id and a.user_id = (select auth.uid())
  );
$$;

create function private.can_view_athlete(target_athlete_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_own_athlete_profile(target_athlete_profile_id)
    or private.is_assigned_coach(target_athlete_profile_id)
    or exists (
      select 1 from public.athlete_profiles a
      where a.id = target_athlete_profile_id
        and private.has_org_role(a.organization_id, array['owner', 'head_coach']::public.org_role[])
    );
$$;

create function private.workout_athlete(target_workout_log_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select w.athlete_profile_id from public.workout_logs w where w.id = target_workout_log_id;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.workout_logs enable row level security;
alter table public.set_logs enable row level security;

create policy "Athletes and their coaches see workout logs"
  on public.workout_logs for select to authenticated
  using (private.can_view_athlete(athlete_profile_id));

create policy "Athletes log their own workouts"
  on public.workout_logs for insert to authenticated
  with check (private.is_own_athlete_profile(athlete_profile_id));

create policy "Athletes edit their own workouts"
  on public.workout_logs for update to authenticated
  using (private.is_own_athlete_profile(athlete_profile_id))
  with check (private.is_own_athlete_profile(athlete_profile_id));

create policy "Athletes delete their own workouts"
  on public.workout_logs for delete to authenticated
  using (private.is_own_athlete_profile(athlete_profile_id));

create policy "Athletes and their coaches see set logs"
  on public.set_logs for select to authenticated
  using (private.can_view_athlete(private.workout_athlete(workout_log_id)));

create policy "Athletes log their own sets"
  on public.set_logs for insert to authenticated
  with check (private.is_own_athlete_profile(private.workout_athlete(workout_log_id)));

create policy "Athletes edit their own sets"
  on public.set_logs for update to authenticated
  using (private.is_own_athlete_profile(private.workout_athlete(workout_log_id)))
  with check (private.is_own_athlete_profile(private.workout_athlete(workout_log_id)));

create policy "Athletes delete their own sets"
  on public.set_logs for delete to authenticated
  using (private.is_own_athlete_profile(private.workout_athlete(workout_log_id)));

-- ---------------------------------------------------------------------------
-- Saving a workout
-- ---------------------------------------------------------------------------

-- Document shape (validated in the app with workoutDocumentSchema in @continuum/shared):
-- { id, athleteProfileId, sessionId, sessionName, performedOn, startedAt, completedAt, rpe, notes,
--   sets: [{ id, sessionExerciseId, exerciseId, position, setNumber, reps, load, loadUnit,
--            durationSeconds, distanceMeters, rpe, completed, notes }] }
-- Ids come from the app, so saving the same workout twice (e.g. a retry after going offline)
-- updates it instead of creating a duplicate. Runs as the caller: row-level security applies.
create function public.save_workout(document jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  log_id uuid := (document ->> 'id')::uuid;
begin
  insert into public.workout_logs (
    id, organization_id, athlete_profile_id, session_id, session_name, performed_on,
    started_at, completed_at, rpe, notes
  )
  values (
    log_id,
    -- Placeholder; the check trigger sets the real organization from the athlete.
    (select a.organization_id from public.athlete_profiles a
     where a.id = (document ->> 'athleteProfileId')::uuid),
    (document ->> 'athleteProfileId')::uuid,
    (document ->> 'sessionId')::uuid,
    coalesce(document ->> 'sessionName', ''),
    (document ->> 'performedOn')::date,
    (document ->> 'startedAt')::timestamptz,
    (document ->> 'completedAt')::timestamptz,
    (document ->> 'rpe')::numeric,
    nullif(document ->> 'notes', '')
  )
  on conflict (id) do update
    set session_name = excluded.session_name,
        performed_on = excluded.performed_on,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        rpe = excluded.rpe,
        notes = excluded.notes;

  delete from public.set_logs
  where workout_log_id = log_id
    and id not in (
      select s.id from jsonb_to_recordset(coalesce(document -> 'sets', '[]'::jsonb)) as s (id uuid)
    );

  insert into public.set_logs (
    id, workout_log_id, session_exercise_id, exercise_id, position, set_number, reps, load,
    load_unit, duration_seconds, distance_meters, rpe, completed, notes
  )
  select s.id, log_id, s."sessionExerciseId", s."exerciseId", s.position, s."setNumber", s.reps,
         s.load, coalesce(s."loadUnit", 'kg')::public.load_unit, s."durationSeconds",
         s."distanceMeters", s.rpe, coalesce(s.completed, true), nullif(s.notes, '')
  from jsonb_to_recordset(coalesce(document -> 'sets', '[]'::jsonb)) as s (
    id uuid, "sessionExerciseId" uuid, "exerciseId" uuid, position integer, "setNumber" smallint,
    reps smallint, load numeric, "loadUnit" text, "durationSeconds" integer,
    "distanceMeters" numeric, rpe numeric, completed boolean, notes text
  )
  on conflict (id) do update
    set session_exercise_id = excluded.session_exercise_id,
        exercise_id = excluded.exercise_id,
        position = excluded.position,
        set_number = excluded.set_number,
        reps = excluded.reps,
        load = excluded.load,
        load_unit = excluded.load_unit,
        duration_seconds = excluded.duration_seconds,
        distance_meters = excluded.distance_meters,
        rpe = excluded.rpe,
        completed = excluded.completed,
        notes = excluded.notes;

  return log_id;
end;
$$;

revoke execute on function public.save_workout(jsonb) from public, anon;
grant execute on function public.save_workout(jsonb) to authenticated;
