-- Exercise library.
--
-- Two kinds of exercise:
--   * Organization library (owner_coach_id is null): shared methodology, managed by owners and head coaches.
--   * A coach's own exercises (owner_coach_id = the coach): private unless the coach shares them.
--
-- Access rules:
--   * Everyone in the organization sees the organization library.
--   * A coach sees their own exercises and other coaches' shared ones; owners and head coaches see all.
--   * An athlete sees the exercises of the coaches assigned to them (so their programs can show them).
--   * Exercises are archived, never deleted, so past programs and logs keep their history.

create type public.exercise_tracking as enum ('weight_reps', 'reps', 'time', 'distance');

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_coach_id uuid references public.profiles (id) on delete cascade,
  is_shared boolean not null default false,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  instructions text check (char_length(instructions) <= 5000),
  video_url text check (video_url ~ '^https://'),
  tracking public.exercise_tracking not null default 'weight_reps',
  muscle_groups text[] not null default '{}' check (
    muscle_groups <@ array['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core',
                           'glutes', 'quads', 'hamstrings', 'calves', 'full_body']::text[]
  ),
  equipment text[] not null default '{}' check (
    equipment <@ array['barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'bodyweight',
                       'band', 'trap_bar', 'other']::text[]
  ),
  is_archived boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Organization exercises are shared by definition.
  check (owner_coach_id is not null or is_shared = false)
);

-- No two active exercises with the same name in the same library.
create unique index exercises_unique_name_idx on public.exercises (
  organization_id,
  coalesce(owner_coach_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(btrim(name))
) where not is_archived;

create index exercises_org_idx on public.exercises (organization_id) where not is_archived;
create index exercises_owner_idx on public.exercises (owner_coach_id);

create trigger exercises_updated_at before update on public.exercises
  for each row execute function private.set_updated_at();

create trigger exercises_audit after insert or update or delete on public.exercises
  for each row execute function private.write_audit_log();

-- Exercises never move between organizations or owners.
create function private.prevent_exercise_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.owner_coach_id is distinct from old.owner_coach_id then
    raise exception 'organization_id and owner_coach_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger exercises_prevent_owner_change before update on public.exercises
  for each row execute function private.prevent_exercise_owner_change();

-- The owning coach must coach in the same organization.
create function private.check_exercise_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create trigger exercises_check_owner before insert on public.exercises
  for each row execute function private.check_exercise_owner();

-- Is this coach assigned to the signed-in athlete?
create function private.is_my_coach(coach_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.coach_athletes ca
    join public.athlete_profiles ap on ap.id = ca.athlete_profile_id
    where ap.user_id = (select auth.uid())
      and ca.coach_user_id = coach_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.exercises enable row level security;

create policy "Members see the library, their own, shared, and their coaches' exercises"
  on public.exercises for select to authenticated
  using (
    private.is_org_member(organization_id)
    and (
      owner_coach_id is null
      or owner_coach_id = (select auth.uid())
      or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
      or (is_shared and private.has_org_role(organization_id, array['coach']::public.org_role[]))
      or private.is_my_coach(owner_coach_id)
    )
  );

create policy "Coaches add their own exercises; leads add to the organization library"
  on public.exercises for insert to authenticated
  with check (
    (
      owner_coach_id = (select auth.uid())
      and private.has_org_role(organization_id, array['owner', 'head_coach', 'coach']::public.org_role[])
    )
    or (
      owner_coach_id is null
      and private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
    )
  );

create policy "Coaches edit their own exercises; leads edit any"
  on public.exercises for update to authenticated
  using (
    owner_coach_id = (select auth.uid())
    or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
  )
  with check (
    owner_coach_id = (select auth.uid())
    or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
  );

-- No delete policy: exercises are archived instead (is_archived = true).
