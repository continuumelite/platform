-- Nutrition: targets set by the coach and food logged by the athlete.
--
-- Targets can differ by day type: 'any' applies every day, and 'training' / 'rest' override it
-- on days with or without a planned session. Seeing targets needs the 'nutrition.targets'
-- feature and logging food needs 'nutrition.logging' (see plans). Coaches always have access.

create type public.nutrition_day_type as enum ('any', 'training', 'rest');
create type public.meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');

create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  athlete_profile_id uuid not null references public.athlete_profiles (id) on delete cascade,
  day_type public.nutrition_day_type not null default 'any',
  calories integer check (calories between 0 and 20000),
  protein_g integer check (protein_g between 0 and 2000),
  carbs_g integer check (carbs_g between 0 and 3000),
  fat_g integer check (fat_g between 0 and 1000),
  notes text check (char_length(notes) <= 1000),
  set_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_profile_id, day_type)
);

-- Ids come from the app so entries logged offline can be retried without duplicates.
create table public.food_logs (
  id uuid primary key,
  athlete_profile_id uuid not null references public.athlete_profiles (id) on delete cascade,
  logged_on date not null,
  meal public.meal_slot not null,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  quantity text check (char_length(quantity) <= 100),
  calories integer not null default 0 check (calories between 0 and 10000),
  protein_g numeric(6, 1) not null default 0 check (protein_g between 0 and 1000),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g between 0 and 2000),
  fat_g numeric(6, 1) not null default 0 check (fat_g between 0 and 1000),
  created_at timestamptz not null default now()
);

create index food_logs_day_idx on public.food_logs (athlete_profile_id, logged_on);

create trigger nutrition_targets_updated_at before update on public.nutrition_targets
  for each row execute function private.set_updated_at();
create trigger nutrition_targets_audit after insert or update or delete on public.nutrition_targets
  for each row execute function private.write_audit_log();

-- Record who set the target, and never move it to another athlete.
create function private.prepare_nutrition_target()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.athlete_profile_id is distinct from old.athlete_profile_id then
    raise exception 'A target cannot move to another athlete';
  end if;
  new.set_by := coalesce((select auth.uid()), new.set_by);
  return new;
end;
$$;

create trigger nutrition_targets_prepare before insert or update on public.nutrition_targets
  for each row execute function private.prepare_nutrition_target();

create function private.prevent_food_log_move()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.athlete_profile_id is distinct from old.athlete_profile_id then
    raise exception 'A food log cannot move to another athlete';
  end if;
  return new;
end;
$$;

create trigger food_logs_prevent_move before update on public.food_logs
  for each row execute function private.prevent_food_log_move();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.nutrition_targets enable row level security;
alter table public.food_logs enable row level security;

create policy "Coaches, and athletes whose level includes targets, see targets"
  on public.nutrition_targets for select to authenticated
  using (
    private.can_manage_athlete(athlete_profile_id)
    or (private.is_own_athlete_profile(athlete_profile_id)
        and private.has_feature(athlete_profile_id, 'nutrition.targets'))
  );

create policy "Coaches set targets"
  on public.nutrition_targets for insert to authenticated
  with check (private.can_manage_athlete(athlete_profile_id));

create policy "Coaches change targets"
  on public.nutrition_targets for update to authenticated
  using (private.can_manage_athlete(athlete_profile_id))
  with check (private.can_manage_athlete(athlete_profile_id));

create policy "Coaches remove targets"
  on public.nutrition_targets for delete to authenticated
  using (private.can_manage_athlete(athlete_profile_id));

create policy "Athletes and their coaches see food logs"
  on public.food_logs for select to authenticated
  using (private.can_view_athlete(athlete_profile_id));

create policy "Athletes log their own food"
  on public.food_logs for insert to authenticated
  with check (
    private.is_own_athlete_profile(athlete_profile_id)
    and private.has_feature(athlete_profile_id, 'nutrition.logging')
  );

create policy "Athletes edit their own food logs"
  on public.food_logs for update to authenticated
  using (private.is_own_athlete_profile(athlete_profile_id))
  with check (
    private.is_own_athlete_profile(athlete_profile_id)
    and private.has_feature(athlete_profile_id, 'nutrition.logging')
  );

create policy "Athletes delete their own food logs"
  on public.food_logs for delete to authenticated
  using (private.is_own_athlete_profile(athlete_profile_id));
