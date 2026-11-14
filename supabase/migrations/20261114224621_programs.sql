-- Programs: templates and athletes' personalized programs.
--
-- Structure: program → blocks → weeks → sessions → session exercises (the prescription).
-- A template has no athlete. An athlete program is usually copied from a template, then personalized.
--
-- Writing: the structure is only ever written through save_program(), which saves the whole
-- program in one transaction, rejects stale edits (two coaches editing at once), and records
-- a version with the coach's reason. Those versions are the history the AI learns from later.
--
-- Access rules:
--   * Templates: every coach in the organization can view and copy them. Organization templates
--     (no owner) are edited by owners and head coaches; a coach's own templates by that coach and leads.
--   * Athlete programs: viewed and edited by the athlete's assigned coaches and org leads.
--     The athlete sees their programs once they're no longer drafts.
--   * Version history (with coaches' reasons) is visible to people who can edit the program.

create type public.program_status as enum ('draft', 'active', 'completed', 'archived');
create type public.load_type as enum ('none', 'kg', 'lb', 'percent_1rm');

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Set for athlete programs; null for templates.
  athlete_profile_id uuid references public.athlete_profiles (id) on delete cascade,
  -- Templates only: the coach who owns it, or null for an organization template.
  owner_coach_id uuid references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text check (char_length(description) <= 5000),
  status public.program_status not null default 'draft',
  start_date date,
  -- The program (or template) this one was copied from.
  source_program_id uuid references public.programs (id) on delete set null,
  current_version integer not null default 0 check (current_version >= 0),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (athlete_profile_id is null or owner_coach_id is null)
);

create index programs_org_idx on public.programs (organization_id);
create index programs_athlete_idx on public.programs (athlete_profile_id);

create table public.program_blocks (
  id uuid primary key,
  program_id uuid not null references public.programs (id) on delete cascade,
  position integer not null,
  name text not null default '',
  notes text
);

create table public.program_weeks (
  id uuid primary key,
  program_id uuid not null references public.programs (id) on delete cascade,
  block_id uuid not null references public.program_blocks (id) on delete cascade,
  position integer not null,
  is_deload boolean not null default false,
  notes text
);

create table public.program_sessions (
  id uuid primary key,
  program_id uuid not null references public.programs (id) on delete cascade,
  week_id uuid not null references public.program_weeks (id) on delete cascade,
  position integer not null,
  name text not null default '',
  -- 1 = Monday … 7 = Sunday; null when the athlete picks the day.
  day_of_week smallint check (day_of_week between 1 and 7),
  notes text
);

create table public.session_exercises (
  id uuid primary key,
  program_id uuid not null references public.programs (id) on delete cascade,
  session_id uuid not null references public.program_sessions (id) on delete cascade,
  position integer not null,
  exercise_id uuid not null references public.exercises (id),
  sets smallint check (sets between 1 and 50),
  -- Free text so coaches can write "8", "8-10", "AMRAP", "30s" or "400m".
  reps text check (char_length(reps) <= 40),
  load_type public.load_type not null default 'none',
  load_value numeric(7, 2) check (load_value >= 0),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  tempo text check (char_length(tempo) <= 20),
  rest_seconds integer check (rest_seconds between 0 and 3600),
  -- Exercises sharing a label (e.g. "A") are done as a superset.
  superset text check (char_length(superset) <= 4),
  notes text check (char_length(notes) <= 1000)
);

create index program_blocks_program_idx on public.program_blocks (program_id, position);
create index program_weeks_program_idx on public.program_weeks (program_id);
create index program_weeks_block_idx on public.program_weeks (block_id, position);
create index program_sessions_program_idx on public.program_sessions (program_id);
create index program_sessions_week_idx on public.program_sessions (week_id, position);
create index session_exercises_program_idx on public.session_exercises (program_id);
create index session_exercises_session_idx on public.session_exercises (session_id, position);
create index session_exercises_exercise_idx on public.session_exercises (exercise_id);

-- Every save, with the full program as it was saved and the coach's reason.
create table public.program_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  version integer not null,
  document jsonb not null,
  reason text check (char_length(reason) <= 1000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (program_id, version)
);

create trigger programs_updated_at before update on public.programs
  for each row execute function private.set_updated_at();

create trigger programs_audit after insert or update or delete on public.programs
  for each row execute function private.write_audit_log();

-- An athlete program's athlete must belong to the same organization; a template owner must coach there.
create function private.check_program()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.athlete_profile_id is not null and not exists (
    select 1 from public.athlete_profiles a
    where a.id = new.athlete_profile_id and a.organization_id = new.organization_id
  ) then
    raise exception 'Athlete % does not belong to organization %', new.athlete_profile_id, new.organization_id;
  end if;

  if new.owner_coach_id is not null and not exists (
    select 1 from public.memberships m
    where m.organization_id = new.organization_id
      and m.user_id = new.owner_coach_id
      and m.role in ('owner', 'head_coach', 'coach')
  ) then
    raise exception 'User % is not a coach in organization %', new.owner_coach_id, new.organization_id;
  end if;

  return new;
end;
$$;

create trigger programs_check before insert on public.programs
  for each row execute function private.check_program();

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------

create function private.can_view_program(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.programs p
    where p.id = target_program_id
      and (
        -- Templates: any coach in the organization.
        (p.athlete_profile_id is null
          and private.has_org_role(p.organization_id, array['owner', 'head_coach', 'coach']::public.org_role[]))
        or (p.athlete_profile_id is not null and (
          private.is_assigned_coach(p.athlete_profile_id)
          or private.has_org_role(p.organization_id, array['owner', 'head_coach']::public.org_role[])
          or (p.status <> 'draft' and exists (
            select 1 from public.athlete_profiles a
            where a.id = p.athlete_profile_id and a.user_id = (select auth.uid())
          ))
        ))
      )
  );
$$;

create function private.can_edit_program(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.programs p
    where p.id = target_program_id
      and (
        private.has_org_role(p.organization_id, array['owner', 'head_coach']::public.org_role[])
        or (p.athlete_profile_id is null and p.owner_coach_id = (select auth.uid()))
        or (p.athlete_profile_id is not null and private.is_assigned_coach(p.athlete_profile_id))
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.programs enable row level security;
alter table public.program_blocks enable row level security;
alter table public.program_weeks enable row level security;
alter table public.program_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.program_versions enable row level security;

-- Same rule as private.can_view_program(), written against the row's own columns so it also
-- works for a row that's just been inserted (insert … returning).
create policy "People who can view a program see it"
  on public.programs for select to authenticated
  using (
    (athlete_profile_id is null
      and private.has_org_role(organization_id, array['owner', 'head_coach', 'coach']::public.org_role[]))
    or (athlete_profile_id is not null and (
      private.is_assigned_coach(athlete_profile_id)
      or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
      or (status <> 'draft' and exists (
        select 1 from public.athlete_profiles a
        where a.id = athlete_profile_id and a.user_id = (select auth.uid())
      ))
    ))
  );

create policy "Coaches create templates and programs for their athletes"
  on public.programs for insert to authenticated
  with check (
    current_version = 0
    and (
      -- A coach's own template.
      (athlete_profile_id is null and owner_coach_id = (select auth.uid())
        and private.has_org_role(organization_id, array['owner', 'head_coach', 'coach']::public.org_role[]))
      -- An organization template.
      or (athlete_profile_id is null and owner_coach_id is null
        and private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[]))
      -- A program for an athlete the coach works with.
      or (athlete_profile_id is not null and (
        private.is_assigned_coach(athlete_profile_id)
        or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
      ))
    )
  );

create policy "Editors can update program details"
  on public.programs for update to authenticated
  using (private.can_edit_program(id))
  with check (private.can_edit_program(id));

-- Only these details can be changed directly; the structure and version go through save_program().
revoke update on public.programs from authenticated;
grant update (name, description, status, start_date) on public.programs to authenticated;

-- No delete policy: programs are archived (status = 'archived').

create policy "Program viewers see blocks"
  on public.program_blocks for select to authenticated using (private.can_view_program(program_id));
create policy "Program viewers see weeks"
  on public.program_weeks for select to authenticated using (private.can_view_program(program_id));
create policy "Program viewers see sessions"
  on public.program_sessions for select to authenticated using (private.can_view_program(program_id));
create policy "Program viewers see session exercises"
  on public.session_exercises for select to authenticated using (private.can_view_program(program_id));

-- Editors see a program's history. Template versions are visible to every coach who can see the
-- template, so they can copy it; athlete programs' history (with coaches' reasons) stays with editors.
create policy "Editors see the history; coaches see template versions"
  on public.program_versions for select to authenticated
  using (
    private.can_edit_program(program_id)
    or exists (
      select 1 from public.programs p
      where p.id = program_id and p.athlete_profile_id is null and private.can_view_program(p.id)
    )
  );

-- ---------------------------------------------------------------------------
-- Saving a program
-- ---------------------------------------------------------------------------

-- Unpack a program document into rows, one function per level.
create function private.doc_blocks(document jsonb)
returns table (id uuid, pos integer, name text, notes text, weeks jsonb)
language sql
immutable
set search_path = ''
as $$
  select (b ->> 'id')::uuid, (ord - 1)::integer, coalesce(b ->> 'name', ''),
         nullif(b ->> 'notes', ''), coalesce(b -> 'weeks', '[]'::jsonb)
  from jsonb_array_elements(coalesce(document -> 'blocks', '[]'::jsonb)) with ordinality as t (b, ord);
$$;

create function private.doc_weeks(document jsonb)
returns table (id uuid, block_id uuid, pos integer, is_deload boolean, notes text, sessions jsonb)
language sql
immutable
set search_path = ''
as $$
  select (w ->> 'id')::uuid, blk.id, (ord - 1)::integer,
         coalesce((w ->> 'isDeload')::boolean, false), nullif(w ->> 'notes', ''),
         coalesce(w -> 'sessions', '[]'::jsonb)
  from private.doc_blocks(document) blk,
       jsonb_array_elements(blk.weeks) with ordinality as t (w, ord);
$$;

create function private.doc_sessions(document jsonb)
returns table (id uuid, week_id uuid, pos integer, name text, day_of_week smallint, notes text, exercises jsonb)
language sql
immutable
set search_path = ''
as $$
  select (s ->> 'id')::uuid, wk.id, (ord - 1)::integer, coalesce(s ->> 'name', ''),
         (s ->> 'dayOfWeek')::smallint, nullif(s ->> 'notes', ''),
         coalesce(s -> 'exercises', '[]'::jsonb)
  from private.doc_weeks(document) wk,
       jsonb_array_elements(wk.sessions) with ordinality as t (s, ord);
$$;

create function private.doc_exercises(document jsonb)
returns table (
  id uuid, session_id uuid, pos integer, exercise_id uuid, sets smallint, reps text,
  load_type public.load_type, load_value numeric, rpe numeric, tempo text, rest_seconds integer,
  superset text, notes text
)
language sql
immutable
set search_path = ''
as $$
  select (e ->> 'id')::uuid, ses.id, (ord - 1)::integer, (e ->> 'exerciseId')::uuid,
         (e ->> 'sets')::smallint, nullif(e ->> 'reps', ''),
         coalesce(e ->> 'loadType', 'none')::public.load_type,
         (e ->> 'loadValue')::numeric, (e ->> 'rpe')::numeric, nullif(e ->> 'tempo', ''),
         (e ->> 'restSeconds')::integer, nullif(e ->> 'superset', ''), nullif(e ->> 'notes', '')
  from private.doc_sessions(document) ses,
       jsonb_array_elements(ses.exercises) with ordinality as t (e, ord);
$$;

-- Document shape (validated in the app with programDocumentSchema in @continuum/shared):
-- { name, description, blocks: [{ id, name, notes, weeks: [{ id, isDeload, notes,
--   sessions: [{ id, name, dayOfWeek, notes, exercises: [{ id, exerciseId, sets, reps, loadType,
--   loadValue, rpe, tempo, restSeconds, superset, notes }] }] }] }] }
-- Item ids are generated by the client and stay stable across saves, so logged workouts can
-- point at sessions and exercises that keep existing when the program is edited.
create function public.save_program(
  target_program_id uuid,
  expected_version integer,
  document jsonb,
  reason text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  program public.programs;
  new_version integer;
begin
  select * into program from public.programs where id = target_program_id for update;

  if program.id is null or not private.can_edit_program(target_program_id) then
    raise exception 'You don''t have permission to edit this program' using errcode = '42501';
  end if;

  if program.current_version <> expected_version then
    raise exception 'This program was changed by someone else. Reload to see the latest version.'
      using errcode = '40001';
  end if;

  -- Ids must not belong to another program.
  if exists (select 1 from public.program_blocks x join private.doc_blocks(document) i using (id) where x.program_id <> target_program_id)
     or exists (select 1 from public.program_weeks x join private.doc_weeks(document) i using (id) where x.program_id <> target_program_id)
     or exists (select 1 from public.program_sessions x join private.doc_sessions(document) i using (id) where x.program_id <> target_program_id)
     or exists (select 1 from public.session_exercises x join private.doc_exercises(document) i using (id) where x.program_id <> target_program_id)
  then
    raise exception 'Program document contains items from another program';
  end if;

  -- Exercises must come from this organization.
  if exists (
    select 1 from private.doc_exercises(document) i
    left join public.exercises ex on ex.id = i.exercise_id and ex.organization_id = program.organization_id
    where ex.id is null
  ) then
    raise exception 'Program uses an exercise that isn''t in this organization';
  end if;

  -- Remove what's no longer in the document (deepest first).
  delete from public.session_exercises
  where program_id = target_program_id and id not in (select id from private.doc_exercises(document));
  delete from public.program_sessions
  where program_id = target_program_id and id not in (select id from private.doc_sessions(document));
  delete from public.program_weeks
  where program_id = target_program_id and id not in (select id from private.doc_weeks(document));
  delete from public.program_blocks
  where program_id = target_program_id and id not in (select id from private.doc_blocks(document));

  -- Insert or update everything else (outermost first).
  insert into public.program_blocks (id, program_id, position, name, notes)
  select id, target_program_id, pos, name, notes from private.doc_blocks(document)
  on conflict (id) do update
    set position = excluded.position, name = excluded.name, notes = excluded.notes;

  insert into public.program_weeks (id, program_id, block_id, position, is_deload, notes)
  select id, target_program_id, block_id, pos, is_deload, notes from private.doc_weeks(document)
  on conflict (id) do update
    set block_id = excluded.block_id, position = excluded.position,
        is_deload = excluded.is_deload, notes = excluded.notes;

  insert into public.program_sessions (id, program_id, week_id, position, name, day_of_week, notes)
  select id, target_program_id, week_id, pos, name, day_of_week, notes from private.doc_sessions(document)
  on conflict (id) do update
    set week_id = excluded.week_id, position = excluded.position, name = excluded.name,
        day_of_week = excluded.day_of_week, notes = excluded.notes;

  insert into public.session_exercises (
    id, program_id, session_id, position, exercise_id, sets, reps, load_type, load_value,
    rpe, tempo, rest_seconds, superset, notes
  )
  select id, target_program_id, session_id, pos, exercise_id, sets, reps, load_type, load_value,
         rpe, tempo, rest_seconds, superset, notes
  from private.doc_exercises(document)
  on conflict (id) do update
    set session_id = excluded.session_id, position = excluded.position,
        exercise_id = excluded.exercise_id, sets = excluded.sets, reps = excluded.reps,
        load_type = excluded.load_type, load_value = excluded.load_value, rpe = excluded.rpe,
        tempo = excluded.tempo, rest_seconds = excluded.rest_seconds,
        superset = excluded.superset, notes = excluded.notes;

  new_version := program.current_version + 1;

  update public.programs
  set name = coalesce(nullif(btrim(document ->> 'name'), ''), program.name),
      description = nullif(btrim(coalesce(document ->> 'description', '')), ''),
      current_version = new_version
  where id = target_program_id;

  insert into public.program_versions (program_id, version, document, reason, created_by)
  values (target_program_id, new_version, document, nullif(btrim(reason), ''), auth.uid());

  return new_version;
end;
$$;

revoke execute on function public.save_program(uuid, integer, jsonb, text) from public, anon;
grant execute on function public.save_program(uuid, integer, jsonb, text) to authenticated;
