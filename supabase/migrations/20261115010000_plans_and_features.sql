-- Subscription levels and the features each one includes.
--
-- Every organization has three plans (levels 1-3). Which features a plan includes is data in
-- plan_features, edited by the owner, so the mapping can change without a release. Feature
-- keys are listed in packages/shared/src/features.ts.
--
-- Until the owner turns tiers on (organizations.feature_tiers_enabled), every athlete has every
-- feature. Coaches and owners always have every feature.

alter table public.organizations
  add column feature_tiers_enabled boolean not null default false;

create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled');
create type public.subscription_source as enum ('manual', 'stripe', 'app_store', 'play_store');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  level smallint not null check (level between 1 and 3),
  name text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 500),
  -- For display until payments exist; Stripe / the stores become the source of truth later.
  price_cents integer check (price_cents >= 0),
  -- Athletes without a subscription get the default plan.
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, level)
);

create unique index plans_one_default on public.plans (organization_id) where is_default;

create table public.plan_features (
  plan_id uuid not null references public.plans (id) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$'),
  -- Null means unlimited (e.g. "messages per week").
  usage_limit integer check (usage_limit >= 0),
  primary key (plan_id, feature_key)
);

-- An athlete's current plan. Coaches set it by hand ('manual') until payments exist; payment
-- webhooks (Stripe, RevenueCat) will update the same row with the service role.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  athlete_profile_id uuid not null unique references public.athlete_profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status public.subscription_status not null default 'active',
  source public.subscription_source not null default 'manual',
  current_period_end timestamptz,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_plan_idx on public.subscriptions (plan_id);

create trigger plans_updated_at before update on public.plans
  for each row execute function private.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();

create trigger plans_audit after insert or update or delete on public.plans
  for each row execute function private.write_audit_log();
create trigger subscriptions_audit after insert or update or delete on public.subscriptions
  for each row execute function private.write_audit_log();

-- ---------------------------------------------------------------------------
-- Integrity
-- ---------------------------------------------------------------------------

-- Plans never move between organizations or change level.
create function private.prevent_plan_move()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id or new.level is distinct from old.level then
    raise exception 'A plan''s organization and level cannot be changed';
  end if;
  return new;
end;
$$;

create trigger plans_prevent_move before update on public.plans
  for each row execute function private.prevent_plan_move();

-- The plan must belong to the athlete's organization.
create function private.check_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.plans p
    join public.athlete_profiles a on a.organization_id = p.organization_id
    where p.id = new.plan_id and a.id = new.athlete_profile_id
  ) then
    raise exception 'That plan is not part of this athlete''s organization';
  end if;
  return new;
end;
$$;

create trigger subscriptions_check before insert or update on public.subscriptions
  for each row execute function private.check_subscription();

-- Every new organization starts with three plans. Every plan includes every feature until the
-- owner sets up the mapping, which only matters once tiers are turned on.
create function private.create_default_plans()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.plans (organization_id, level, name, is_default)
  values (new.id, 1, 'Level 1', true), (new.id, 2, 'Level 2', false), (new.id, 3, 'Level 3', false);
  return new;
end;
$$;

create trigger organizations_default_plans after insert on public.organizations
  for each row execute function private.create_default_plans();

-- Plans for organizations that already exist.
insert into public.plans (organization_id, level, name, is_default)
select o.id, l.level, 'Level ' || l.level, l.level = 1
from public.organizations o
cross join (values (1), (2), (3)) as l (level);

-- ---------------------------------------------------------------------------
-- Feature checks
-- ---------------------------------------------------------------------------

-- The plan an athlete is on: their subscription if it's live, otherwise the default plan.
create function private.athlete_plan(target_athlete_profile_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.plan_id from public.subscriptions s
     where s.athlete_profile_id = target_athlete_profile_id
       and s.status in ('active', 'trialing', 'past_due')
       and (s.current_period_end is null or s.current_period_end > now())),
    (select p.id from public.plans p
     join public.athlete_profiles a on a.organization_id = p.organization_id
     where a.id = target_athlete_profile_id and p.is_default)
  );
$$;

-- Can this athlete use the feature? Use it in row-level security so a locked feature is
-- enforced by the database, not just hidden in the app.
create function private.has_feature(target_athlete_profile_id uuid, key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select not o.feature_tiers_enabled
      or exists (
        select 1 from public.plan_features pf
        where pf.plan_id = private.athlete_plan(a.id) and pf.feature_key = key
      )
    from public.athlete_profiles a
    join public.organizations o on o.id = a.organization_id
    where a.id = target_athlete_profile_id
  ), false);
$$;

-- What the signed-in person can use, for the apps (matches entitlementsSchema).
create function public.my_plan()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select m.organization_id, m.role from public.memberships m
    where m.user_id = (select auth.uid())
    order by m.created_at
    limit 1
  ),
  athlete as (
    select a.id from public.athlete_profiles a, me
    where a.user_id = (select auth.uid()) and a.organization_id = me.organization_id
  ),
  plan as (
    select p.id, p.name, p.level from public.plans p
    where p.id = private.athlete_plan((select id from athlete))
  )
  select jsonb_build_object(
    'tiersEnabled', coalesce((select o.feature_tiers_enabled from public.organizations o, me
                              where o.id = me.organization_id), false),
    'staff', coalesce((select role in ('owner', 'head_coach', 'coach') from me), false),
    'plan', (select jsonb_build_object('id', id, 'name', name, 'level', level) from plan),
    'features', coalesce((select jsonb_object_agg(pf.feature_key, pf.usage_limit)
                          from public.plan_features pf where pf.plan_id = (select id from plan)),
                         '{}'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.subscriptions enable row level security;

create function private.plan_org(target_plan_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id from public.plans p where p.id = target_plan_id;
$$;

-- Coaches who may change an athlete's plan: their assigned coaches and the org's leads.
create function private.can_manage_athlete(target_athlete_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_assigned_coach(target_athlete_profile_id)
    or exists (
      select 1 from public.athlete_profiles a
      where a.id = target_athlete_profile_id
        and private.has_org_role(a.organization_id, array['owner', 'head_coach']::public.org_role[])
    );
$$;

create policy "Members can view their organization's plans"
  on public.plans for select to authenticated
  using (private.is_org_member(organization_id));

-- Plans are created with the organization; owners rename and price them.
create policy "Owners can edit plans"
  on public.plans for update to authenticated
  using (private.has_org_role(organization_id, array['owner']::public.org_role[]))
  with check (private.has_org_role(organization_id, array['owner']::public.org_role[]));

create policy "Members can view what each plan includes"
  on public.plan_features for select to authenticated
  using (private.is_org_member(private.plan_org(plan_id)));

create policy "Owners can add features to plans"
  on public.plan_features for insert to authenticated
  with check (private.has_org_role(private.plan_org(plan_id), array['owner']::public.org_role[]));

create policy "Owners can change plan features"
  on public.plan_features for update to authenticated
  using (private.has_org_role(private.plan_org(plan_id), array['owner']::public.org_role[]))
  with check (private.has_org_role(private.plan_org(plan_id), array['owner']::public.org_role[]));

create policy "Owners can remove features from plans"
  on public.plan_features for delete to authenticated
  using (private.has_org_role(private.plan_org(plan_id), array['owner']::public.org_role[]));

create policy "Athletes and their coaches see the athlete's subscription"
  on public.subscriptions for select to authenticated
  using (private.can_view_athlete(athlete_profile_id));

-- Coaches can only set plans by hand; paid subscriptions are written by payment webhooks.
create policy "Coaches set their athletes' plans"
  on public.subscriptions for insert to authenticated
  with check (private.can_manage_athlete(athlete_profile_id) and source = 'manual');

create policy "Coaches change their athletes' manual plans"
  on public.subscriptions for update to authenticated
  using (private.can_manage_athlete(athlete_profile_id) and source = 'manual')
  with check (private.can_manage_athlete(athlete_profile_id) and source = 'manual');

create policy "Coaches remove their athletes' manual plans"
  on public.subscriptions for delete to authenticated
  using (private.can_manage_athlete(athlete_profile_id) and source = 'manual');

-- ---------------------------------------------------------------------------
-- Saving the owner's tier settings in one go
-- ---------------------------------------------------------------------------

-- Document shape (validated in the app with planSettingsSchema in @continuum/shared):
-- { tiersEnabled, plans: [{ id, name, description, priceCents, features: [{ key, limit }] }] }
-- Runs as the caller: row-level security limits it to owners.
create function public.save_plan_settings(org_id uuid, document jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan jsonb;
  saved int;
begin
  if not private.has_org_role(org_id, array['owner']::public.org_role[]) then
    raise exception 'Only the owner can change plans' using errcode = '42501';
  end if;

  update public.organizations
  set feature_tiers_enabled = coalesce((document ->> 'tiersEnabled')::boolean, false)
  where id = org_id;

  for plan in select * from jsonb_array_elements(document -> 'plans') loop
    update public.plans
    set name = plan ->> 'name',
        description = nullif(plan ->> 'description', ''),
        price_cents = (plan ->> 'priceCents')::integer
    where id = (plan ->> 'id')::uuid and organization_id = org_id;
    get diagnostics saved = row_count;
    if saved = 0 then
      raise exception 'Plan % is not part of this organization', plan ->> 'id';
    end if;

    delete from public.plan_features where plan_id = (plan ->> 'id')::uuid;
    insert into public.plan_features (plan_id, feature_key, usage_limit)
    select (plan ->> 'id')::uuid, f ->> 'key', (f ->> 'limit')::integer
    from jsonb_array_elements(plan -> 'features') as f;
  end loop;
end;
$$;
