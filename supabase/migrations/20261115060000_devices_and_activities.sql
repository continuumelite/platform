-- Device connections (Strava first; Garmin, Apple Health and Health Connect later) and the
-- activities they bring in.
--
-- OAuth tokens live in private.device_tokens, which the API can't read: the athlete's session can
-- only write them (save_device_connection) and the server reads them with the service role key
-- to sync. Connecting needs the provider's feature (e.g. 'devices.strava').

create type public.device_provider as enum ('strava', 'garmin', 'apple_health', 'health_connect');
create type public.device_status as enum ('active', 'revoked', 'error');

create table public.device_connections (
  id uuid primary key default gen_random_uuid(),
  athlete_profile_id uuid not null references public.athlete_profiles (id) on delete cascade,
  provider public.device_provider not null,
  external_athlete_id text,
  scopes text,
  status public.device_status not null default 'active',
  last_synced_at timestamptz,
  last_error text,
  connected_at timestamptz not null default now(),
  unique (athlete_profile_id, provider)
);

create index device_connections_external_idx on public.device_connections (provider, external_athlete_id);

create table private.device_tokens (
  connection_id uuid primary key references public.device_connections (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on private.device_tokens from public, anon, authenticated;

-- Workouts from devices, in one shape whatever the source.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  athlete_profile_id uuid not null references public.athlete_profiles (id) on delete cascade,
  provider public.device_provider not null,
  external_id text not null,
  sport_type text not null default 'Workout',
  name text not null default '',
  started_at timestamptz not null,
  duration_seconds integer check (duration_seconds >= 0),
  moving_seconds integer check (moving_seconds >= 0),
  distance_meters numeric(10, 1) check (distance_meters >= 0),
  elevation_gain_meters numeric(8, 1),
  average_heart_rate integer,
  max_heart_rate integer,
  calories integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_id)
);

create index activities_athlete_idx on public.activities (athlete_profile_id, started_at desc);

create trigger activities_updated_at before update on public.activities
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Connecting (called by the web server as the signed-in athlete after OAuth)
-- ---------------------------------------------------------------------------

create function public.save_device_connection(
  device public.device_provider,
  external_athlete text,
  granted_scopes text,
  access text,
  refresh text,
  expires timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  athlete uuid;
  connection uuid;
begin
  select a.id into athlete from public.athlete_profiles a where a.user_id = (select auth.uid()) limit 1;
  if athlete is null then
    raise exception 'Only athletes can connect devices' using errcode = '42501';
  end if;
  if not private.has_feature(athlete, 'devices.' || device::text) then
    raise exception 'This device isn''t included in your plan' using errcode = '42501';
  end if;
  if coalesce(access, '') = '' then
    raise exception 'Missing access token';
  end if;

  insert into public.device_connections (athlete_profile_id, provider, external_athlete_id, scopes, status, last_error)
  values (athlete, device, external_athlete, granted_scopes, 'active', null)
  on conflict (athlete_profile_id, provider) do update
    set external_athlete_id = excluded.external_athlete_id,
        scopes = excluded.scopes,
        status = 'active',
        last_error = null,
        connected_at = now()
  returning id into connection;

  insert into private.device_tokens (connection_id, access_token, refresh_token, expires_at)
  values (connection, access, refresh, expires)
  on conflict (connection_id) do update
    set access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        updated_at = now();

  return connection;
end;
$$;

-- For the server's sync code (service role only): a connection's tokens.
create function public.device_tokens_for(target_connection_id uuid)
returns table (access_token text, refresh_token text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select t.access_token, t.refresh_token, t.expires_at
  from private.device_tokens t where t.connection_id = target_connection_id;
$$;

create function public.store_device_tokens(
  target_connection_id uuid,
  access text,
  refresh text,
  expires timestamptz
)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.device_tokens
  set access_token = access, refresh_token = refresh, expires_at = expires, updated_at = now()
  where connection_id = target_connection_id;
$$;

revoke execute on function public.device_tokens_for(uuid) from public, anon, authenticated;
revoke execute on function public.store_device_tokens(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.device_tokens_for(uuid) to service_role;
grant execute on function public.store_device_tokens(uuid, text, text, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- Row-level security (the service role bypasses it to write activities)
-- ---------------------------------------------------------------------------

alter table public.device_connections enable row level security;
alter table public.activities enable row level security;

create policy "Athletes and their coaches see device connections"
  on public.device_connections for select to authenticated
  using (private.can_view_athlete(athlete_profile_id));

create policy "Athletes disconnect their own devices"
  on public.device_connections for delete to authenticated
  using (private.is_own_athlete_profile(athlete_profile_id));

create policy "Athletes and their coaches see activities"
  on public.activities for select to authenticated
  using (private.can_view_athlete(athlete_profile_id));

create policy "Athletes delete their own activities"
  on public.activities for delete to authenticated
  using (private.is_own_athlete_profile(athlete_profile_id));
