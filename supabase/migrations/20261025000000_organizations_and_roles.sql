-- Foundation: organizations, coaches, athletes, and who can see what.
--
-- Access rules (enforced with row-level security):
--   * Members see their organization and the other members in it.
--   * Owners and head coaches manage memberships and coach assignments.
--   * A coach sees only the athletes assigned to them; owners and head coaches see all athletes.
--   * An athlete sees and edits only their own profile.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.org_role as enum ('owner', 'head_coach', 'coach', 'athlete');
create type public.coach_assignment_role as enum ('primary', 'nutrition', 'assistant');

-- Helper functions live in a schema the API does not expose.
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Shared triggers
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per signed-up user, created automatically from auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

create table public.athlete_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date_of_birth date,
  goals text,
  training_history text,
  injuries text,
  equipment text,
  availability jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.coach_athletes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  coach_user_id uuid not null references public.profiles (id) on delete cascade,
  athlete_profile_id uuid not null references public.athlete_profiles (id) on delete cascade,
  role public.coach_assignment_role not null default 'primary',
  created_at timestamptz not null default now(),
  unique (athlete_profile_id, coach_user_id, role)
);

-- An athlete has at most one primary coach (their AI profile follows this coach).
create unique index coach_athletes_one_primary_idx
  on public.coach_athletes (athlete_profile_id)
  where role = 'primary';

create index coach_athletes_coach_user_id_idx on public.coach_athletes (coach_user_id);

-- Who changed what. Written only by triggers.
create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_org_created_idx on public.audit_log (organization_id, created_at desc);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger memberships_updated_at before update on public.memberships
  for each row execute function private.set_updated_at();
create trigger athlete_profiles_updated_at before update on public.athlete_profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Consistency checks
-- ---------------------------------------------------------------------------

-- Assigned coaches must hold a coaching role in the same organization,
-- and the athlete must belong to that organization.
-- Security definer so the check sees rows hidden from the caller by RLS.
create function private.check_coach_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.memberships m
    where m.organization_id = new.organization_id
      and m.user_id = new.coach_user_id
      and m.role in ('owner', 'head_coach', 'coach')
  ) then
    raise exception 'User % is not a coach in organization %', new.coach_user_id, new.organization_id;
  end if;

  if not exists (
    select 1 from public.athlete_profiles a
    where a.id = new.athlete_profile_id
      and a.organization_id = new.organization_id
  ) then
    raise exception 'Athlete % does not belong to organization %', new.athlete_profile_id, new.organization_id;
  end if;

  return new;
end;
$$;

create trigger coach_athletes_check before insert or update on public.coach_athletes
  for each row execute function private.check_coach_assignment();

-- Rows never move between organizations or users.
create function private.prevent_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.user_id is distinct from old.user_id then
    raise exception 'organization_id and user_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger memberships_prevent_owner_change before update on public.memberships
  for each row execute function private.prevent_owner_change();
create trigger athlete_profiles_prevent_owner_change before update on public.athlete_profiles
  for each row execute function private.prevent_owner_change();

-- ---------------------------------------------------------------------------
-- Auth hooks
-- ---------------------------------------------------------------------------

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Audit trigger
-- ---------------------------------------------------------------------------

create function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (organization_id, actor_id, table_name, record_id, action, old_data, new_data)
  values (
    (row_data ->> 'organization_id')::uuid,
    auth.uid(),
    tg_table_name,
    (row_data ->> 'id')::uuid,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger memberships_audit after insert or update or delete on public.memberships
  for each row execute function private.write_audit_log();
create trigger athlete_profiles_audit after insert or update or delete on public.athlete_profiles
  for each row execute function private.write_audit_log();
create trigger coach_athletes_audit after insert or update or delete on public.coach_athletes
  for each row execute function private.write_audit_log();

-- ---------------------------------------------------------------------------
-- Permission helpers (security definer so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------

create function private.has_org_role(org_id uuid, roles public.org_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id
      and m.user_id = (select auth.uid())
      and m.role = any (roles)
  );
$$;

create function private.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_role(org_id, enum_range(null::public.org_role));
$$;

create function private.shares_org_with(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = other_user_id
  );
$$;

create function private.is_assigned_coach(athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.coach_athletes ca
    where ca.athlete_profile_id = athlete_id
      and ca.coach_user_id = (select auth.uid())
  );
$$;

grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Creating an organization (the creator becomes its owner)
-- ---------------------------------------------------------------------------

create function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to create an organization';
  end if;

  insert into public.organizations (name) values (org_name) returning id into new_org_id;
  insert into public.memberships (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  return new_org_id;
end;
$$;

revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.athlete_profiles enable row level security;
alter table public.coach_athletes enable row level security;
alter table public.audit_log enable row level security;

-- organizations
create policy "Members can view their organization"
  on public.organizations for select to authenticated
  using (private.is_org_member(id));

create policy "Owners can update their organization"
  on public.organizations for update to authenticated
  using (private.has_org_role(id, array['owner']::public.org_role[]))
  with check (private.has_org_role(id, array['owner']::public.org_role[]));

-- profiles
create policy "Users can view themselves and people in their organizations"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_org_with(id));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- memberships
create policy "Members can view memberships in their organization"
  on public.memberships for select to authenticated
  using (private.is_org_member(organization_id));

-- Head coaches manage coaches and athletes; only owners can grant or change owner/head_coach.
create policy "Owners and head coaches can add members"
  on public.memberships for insert to authenticated
  with check (
    private.has_org_role(organization_id, array['owner']::public.org_role[])
    or (
      private.has_org_role(organization_id, array['head_coach']::public.org_role[])
      and role in ('coach', 'athlete')
    )
  );

create policy "Owners and head coaches can change members"
  on public.memberships for update to authenticated
  using (
    private.has_org_role(organization_id, array['owner']::public.org_role[])
    or (
      private.has_org_role(organization_id, array['head_coach']::public.org_role[])
      and role in ('coach', 'athlete')
    )
  )
  with check (
    private.has_org_role(organization_id, array['owner']::public.org_role[])
    or (
      private.has_org_role(organization_id, array['head_coach']::public.org_role[])
      and role in ('coach', 'athlete')
    )
  );

create policy "Owners and head coaches can remove members"
  on public.memberships for delete to authenticated
  using (
    private.has_org_role(organization_id, array['owner']::public.org_role[])
    or (
      private.has_org_role(organization_id, array['head_coach']::public.org_role[])
      and role in ('coach', 'athlete')
    )
  );

-- athlete_profiles
create policy "Athletes, their coaches, and org leads can view athlete profiles"
  on public.athlete_profiles for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_assigned_coach(id)
    or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
  );

create policy "Coaches can create athlete profiles in their organization"
  on public.athlete_profiles for insert to authenticated
  with check (
    private.has_org_role(organization_id, array['owner', 'head_coach', 'coach']::public.org_role[])
  );

create policy "Athletes, their coaches, and org leads can update athlete profiles"
  on public.athlete_profiles for update to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_assigned_coach(id)
    or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
  )
  with check (
    user_id = (select auth.uid())
    or private.is_assigned_coach(id)
    or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
  );

create policy "Org leads can delete athlete profiles"
  on public.athlete_profiles for delete to authenticated
  using (private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[]));

-- coach_athletes
create policy "Org leads, the coach, and the athlete can view assignments"
  on public.coach_athletes for select to authenticated
  using (
    coach_user_id = (select auth.uid())
    or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
    or exists (
      select 1 from public.athlete_profiles a
      where a.id = athlete_profile_id and a.user_id = (select auth.uid())
    )
  );

create policy "Org leads can assign coaches"
  on public.coach_athletes for insert to authenticated
  with check (private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[]));

create policy "Org leads can change assignments"
  on public.coach_athletes for update to authenticated
  using (private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[]))
  with check (private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[]));

create policy "Org leads can remove assignments"
  on public.coach_athletes for delete to authenticated
  using (private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[]));

-- audit_log: readable by org leads; no insert/update/delete policies, so only triggers write it.
create policy "Org leads can view the audit log"
  on public.audit_log for select to authenticated
  using (private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[]));
