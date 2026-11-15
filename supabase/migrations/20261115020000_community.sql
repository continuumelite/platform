-- Community: one feed across the whole organization. Athletes and coaches post; coach posts
-- are highlighted (author_role) and coaches can pin and hide. Seeing the feed needs the
-- 'community.view' feature and posting/commenting needs 'community.post' (see plans), so
-- both can be tied to subscription levels. Coaches always have access.

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- The author's role when they posted, so coach posts can be highlighted. Set by trigger.
  author_role public.org_role not null default 'athlete', -- overwritten by trigger
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  pinned boolean not null default false,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_posts_feed_idx
  on public.community_posts (organization_id, pinned desc, created_at desc);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_role public.org_role not null default 'athlete', -- overwritten by trigger
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);

create index community_comments_post_idx on public.community_comments (post_id, created_at);

create table public.community_reactions (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'like' check (kind in ('like')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  comment_id uuid references public.community_comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (post_id, comment_id, reporter_id)
);

create trigger community_posts_updated_at before update on public.community_posts
  for each row execute function private.set_updated_at();
create trigger community_posts_audit after update or delete on public.community_posts
  for each row execute function private.write_audit_log();

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create function private.is_org_staff(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_role(org_id, array['owner', 'head_coach', 'coach']::public.org_role[]);
$$;

-- Coaches always; athletes when their level includes the feature.
create function private.has_community_access(org_id uuid, feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_org_staff(org_id)
    or exists (
      select 1 from public.athlete_profiles a
      where a.organization_id = org_id
        and a.user_id = (select auth.uid())
        and private.has_feature(a.id, feature)
    );
$$;

create function private.post_org(target_post_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id from public.community_posts p where p.id = target_post_id;
$$;

-- A post is visible to people with access, unless hidden (coaches still see hidden posts).
create function private.can_view_post(target_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_posts p
    where p.id = target_post_id
      and private.has_community_access(p.organization_id, 'community.view')
      and (p.hidden_at is null or private.is_org_staff(p.organization_id))
  );
$$;

-- ---------------------------------------------------------------------------
-- Integrity: authorship, role snapshot, and who may pin or hide
-- ---------------------------------------------------------------------------

create function private.prepare_community_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- No signed-in user means the service role or a migration/seed, which is trusted.
  staff boolean := private.is_org_staff(new.organization_id) or (select auth.uid()) is null;
begin
  if tg_op = 'INSERT' then
    select m.role into new.author_role from public.memberships m
    where m.organization_id = new.organization_id and m.user_id = new.author_id;
    if new.author_role is null then
      raise exception 'The author is not a member of this organization';
    end if;
    if not staff then
      new.pinned := false;
      new.hidden_at := null;
      new.hidden_by := null;
    end if;
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id
     or new.author_id is distinct from old.author_id
     or new.author_role is distinct from old.author_role
     or new.created_at is distinct from old.created_at then
    raise exception 'A post''s author and organization cannot be changed';
  end if;
  -- Only coaches pin or hide; only the author edits the text.
  if not staff and (new.pinned is distinct from old.pinned
                    or new.hidden_at is distinct from old.hidden_at
                    or new.hidden_by is distinct from old.hidden_by) then
    raise exception 'Only coaches can pin or hide posts' using errcode = '42501';
  end if;
  if new.body is distinct from old.body and old.author_id is distinct from (select auth.uid())
     and (select auth.uid()) is not null then
    raise exception 'Only the author can edit a post' using errcode = '42501';
  end if;
  if new.hidden_at is not null and old.hidden_at is null then
    new.hidden_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger community_posts_prepare before insert or update on public.community_posts
  for each row execute function private.prepare_community_post();

create function private.prepare_community_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select m.role into new.author_role
    from public.memberships m
    where m.user_id = new.author_id and m.organization_id = private.post_org(new.post_id);
    if new.author_role is null then
      raise exception 'The author is not a member of this organization';
    end if;
    if not private.is_org_staff(private.post_org(new.post_id)) then
      new.hidden_at := null;
    end if;
    return new;
  end if;

  if new.post_id is distinct from old.post_id or new.author_id is distinct from old.author_id
     or new.author_role is distinct from old.author_role or new.body is distinct from old.body then
    raise exception 'Comments can only be hidden, not edited';
  end if;
  return new;
end;
$$;

create trigger community_comments_prepare before insert or update on public.community_comments
  for each row execute function private.prepare_community_comment();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_reports enable row level security;

create policy "Members with access see the feed"
  on public.community_posts for select to authenticated
  using (
    private.has_community_access(organization_id, 'community.view')
    and (hidden_at is null or private.is_org_staff(organization_id))
  );

create policy "Members with posting access post as themselves"
  on public.community_posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and private.has_community_access(organization_id, 'community.post')
  );

create policy "Authors and coaches update posts"
  on public.community_posts for update to authenticated
  using (author_id = (select auth.uid()) or private.is_org_staff(organization_id))
  with check (author_id = (select auth.uid()) or private.is_org_staff(organization_id));

create policy "Authors and coaches delete posts"
  on public.community_posts for delete to authenticated
  using (author_id = (select auth.uid()) or private.is_org_staff(organization_id));

create policy "Members who can see the post see its comments"
  on public.community_comments for select to authenticated
  using (
    private.can_view_post(post_id)
    and (hidden_at is null or private.is_org_staff(private.post_org(post_id)))
  );

create policy "Members with posting access comment as themselves"
  on public.community_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and private.can_view_post(post_id)
    and private.has_community_access(private.post_org(post_id), 'community.post')
  );

create policy "Coaches hide comments"
  on public.community_comments for update to authenticated
  using (private.is_org_staff(private.post_org(post_id)))
  with check (private.is_org_staff(private.post_org(post_id)));

create policy "Authors and coaches delete comments"
  on public.community_comments for delete to authenticated
  using (author_id = (select auth.uid()) or private.is_org_staff(private.post_org(post_id)));

create policy "Members who can see the post see its reactions"
  on public.community_reactions for select to authenticated
  using (private.can_view_post(post_id));

create policy "Members react as themselves"
  on public.community_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_view_post(post_id));

create policy "Members remove their own reactions"
  on public.community_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Members report what they can see"
  on public.community_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and private.can_view_post(post_id));

create policy "Coaches see reports"
  on public.community_reports for select to authenticated
  using (private.is_org_staff(private.post_org(post_id)));

create policy "Coaches resolve reports"
  on public.community_reports for update to authenticated
  using (private.is_org_staff(private.post_org(post_id)))
  with check (private.is_org_staff(private.post_org(post_id)));
