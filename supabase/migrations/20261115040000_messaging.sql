-- Coach <-> athlete messaging. One conversation per athlete, shared by the athlete, their
-- assigned coaches and the organization's leads. Athletes need the 'messaging' feature to send,
-- and a plan can cap how many messages an athlete sends per week (the feature's usage limit).

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  athlete_profile_id uuid not null unique references public.athlete_profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

-- Ids come from the app so a message sent while offline can be retried without duplicating.
create table public.messages (
  id uuid primary key,
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index messages_thread_idx on public.messages (thread_id, created_at);
create index messages_sender_idx on public.messages (sender_id, created_at);

create table public.message_reads (
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function private.thread_athlete(target_thread_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.athlete_profile_id from public.message_threads t where t.id = target_thread_id;
$$;

-- The athlete themselves, their coaches and the org's leads.
create function private.can_access_thread(target_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_own_athlete_profile(private.thread_athlete(target_thread_id))
    or private.can_manage_athlete(private.thread_athlete(target_thread_id));
$$;

-- The 'messaging' limit on the athlete's plan, when tiers are on (null = unlimited).
create function private.weekly_message_limit(target_athlete_profile_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select pf.usage_limit
  from public.athlete_profiles a
  join public.organizations o on o.id = a.organization_id and o.feature_tiers_enabled
  join public.plan_features pf
    on pf.plan_id = private.athlete_plan(a.id) and pf.feature_key = 'messaging'
  where a.id = target_athlete_profile_id;
$$;

-- Before a message: athletes need the feature and must be under their weekly limit.
-- After: bump the thread so inboxes sort by latest message.
create function private.check_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  athlete uuid := private.thread_athlete(new.thread_id);
  week_limit integer;
  sent integer;
begin
  if private.is_own_athlete_profile(athlete) and new.sender_id = (select auth.uid()) then
    if not private.has_feature(athlete, 'messaging') then
      raise exception 'Messaging isn''t included in your plan' using errcode = '42501';
    end if;
    week_limit := private.weekly_message_limit(athlete);
    if week_limit is not null then
      select count(*) into sent from public.messages m
      where m.thread_id = new.thread_id and m.sender_id = new.sender_id
        and m.created_at > now() - interval '7 days';
      if sent >= week_limit then
        raise exception 'You''ve reached your plan''s limit of % messages this week', week_limit
          using errcode = 'P0002';
      end if;
    end if;
  end if;
  new.created_at := now();
  return new;
end;
$$;

create trigger messages_check before insert on public.messages
  for each row execute function private.check_message();

create function private.touch_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.message_threads set last_message_at = new.created_at where id = new.thread_id;
  -- Sending a message means you've read the thread.
  insert into public.message_reads (thread_id, user_id, last_read_at)
  values (new.thread_id, new.sender_id, new.created_at)
  on conflict (thread_id, user_id) do update set last_read_at = excluded.last_read_at;
  return new;
end;
$$;

create trigger messages_touch_thread after insert on public.messages
  for each row execute function private.touch_thread();

-- The athlete's conversation, created on first use.
create function public.get_message_thread(target_athlete_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread uuid;
begin
  if not (private.is_own_athlete_profile(target_athlete_profile_id)
          or private.can_manage_athlete(target_athlete_profile_id)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.message_threads (athlete_profile_id) values (target_athlete_profile_id)
  on conflict (athlete_profile_id) do nothing;
  select id into thread from public.message_threads where athlete_profile_id = target_athlete_profile_id;
  return thread;
end;
$$;

-- Unread counts for the signed-in person, per thread they can see.
create function public.my_unread_messages()
returns table (thread_id uuid, athlete_profile_id uuid, unread integer, last_message_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.id, t.athlete_profile_id,
    (select count(*)::int from public.messages m
     where m.thread_id = t.id and m.sender_id <> (select auth.uid())
       and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)),
    t.last_message_at
  from public.message_threads t
  left join public.message_reads r on r.thread_id = t.id and r.user_id = (select auth.uid())
  order by t.last_message_at desc nulls last;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

create policy "Participants see the conversation"
  on public.message_threads for select to authenticated
  using (
    private.is_own_athlete_profile(athlete_profile_id) or private.can_manage_athlete(athlete_profile_id)
  );

create policy "Participants see messages"
  on public.messages for select to authenticated
  using (private.can_access_thread(thread_id));

create policy "Participants send messages as themselves"
  on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.can_access_thread(thread_id));

create policy "People see their own read markers"
  on public.message_reads for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People mark threads read"
  on public.message_reads for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_access_thread(thread_id));

create policy "People update their read markers"
  on public.message_reads for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.can_access_thread(thread_id));

-- Live updates in the apps (Supabase Realtime respects row-level security).
alter publication supabase_realtime add table public.messages;
