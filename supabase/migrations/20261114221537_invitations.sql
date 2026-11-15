-- Invitations: how coaches and athletes join an organization.
--
-- Access rules:
--   * Any coach can invite athletes. The invited athlete gets that coach as primary coach;
--     only owners and head coaches can pick a different coach.
--   * Head coaches can also invite coaches; only owners can invite head coaches.
--   * Coaches see and revoke the invitations they sent; owners and head coaches see all.
--   * Invitations are accepted only through accept_invitation(), by the invited email address.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%_@_%'),
  role public.org_role not null check (role <> 'owner'),
  -- For athlete invitations: who becomes the athlete's primary coach.
  coach_user_id uuid references public.profiles (id) on delete set null,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (role = 'athlete' or coach_user_id is null)
);

create index invitations_org_idx on public.invitations (organization_id, created_at desc);

-- Only one open invitation per email per organization.
create unique index invitations_one_open_idx
  on public.invitations (organization_id, email)
  where accepted_at is null;

create trigger invitations_audit after insert or update or delete on public.invitations
  for each row execute function private.write_audit_log();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.invitations enable row level security;

create policy "Inviters and org leads can view invitations"
  on public.invitations for select to authenticated
  using (
    invited_by = (select auth.uid())
    or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
  );

create policy "Coaches can invite athletes; leads can invite coaches"
  on public.invitations for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and accepted_at is null
    and (
      -- Owners invite anyone (except another owner, blocked by the column check).
      private.has_org_role(organization_id, array['owner']::public.org_role[])
      -- Head coaches invite coaches and athletes.
      or (
        private.has_org_role(organization_id, array['head_coach']::public.org_role[])
        and role in ('coach', 'athlete')
      )
      -- Coaches invite athletes for themselves.
      or (
        private.has_org_role(organization_id, array['coach']::public.org_role[])
        and role = 'athlete'
        and coach_user_id = (select auth.uid())
      )
    )
  );

create policy "Inviters and org leads can revoke open invitations"
  on public.invitations for delete to authenticated
  using (
    accepted_at is null
    and (
      invited_by = (select auth.uid())
      or private.has_org_role(organization_id, array['owner', 'head_coach']::public.org_role[])
    )
  );

-- No update policy: acceptance goes through accept_invitation() below.

-- ---------------------------------------------------------------------------
-- Looking up and accepting an invitation by its token
-- ---------------------------------------------------------------------------

-- Shown on the invite page before the person has an account, so it is callable by anon.
-- The token is the secret; only what the page needs is returned.
create function public.get_invitation(invite_token text)
returns table (
  organization_name text,
  email text,
  role public.org_role,
  invited_by_name text,
  is_expired boolean,
  is_accepted boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, i.email, i.role, p.full_name,
         i.expires_at < now(), i.accepted_at is not null
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = invite_token;
$$;

revoke execute on function public.get_invitation(text) from public;
grant execute on function public.get_invitation(text) to anon, authenticated;

create function public.accept_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.invitations;
  caller_email text;
  new_athlete_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to accept an invitation';
  end if;

  select * into invite from public.invitations where token = invite_token for update;

  if invite.id is null then
    raise exception 'Invitation not found';
  end if;
  if invite.accepted_at is not null then
    raise exception 'Invitation has already been used';
  end if;
  if invite.expires_at < now() then
    raise exception 'Invitation has expired';
  end if;

  select lower(u.email) into caller_email from auth.users u where u.id = auth.uid();
  if caller_email is distinct from invite.email then
    raise exception 'This invitation was sent to a different email address';
  end if;

  if exists (
    select 1 from public.memberships m
    where m.organization_id = invite.organization_id and m.user_id = auth.uid()
  ) then
    raise exception 'You are already a member of this organization';
  end if;

  insert into public.memberships (organization_id, user_id, role)
  values (invite.organization_id, auth.uid(), invite.role);

  if invite.role = 'athlete' then
    insert into public.athlete_profiles (organization_id, user_id)
    values (invite.organization_id, auth.uid())
    returning id into new_athlete_id;

    if invite.coach_user_id is not null then
      insert into public.coach_athletes (organization_id, coach_user_id, athlete_profile_id, role)
      values (invite.organization_id, invite.coach_user_id, new_athlete_id, 'primary');
    end if;
  end if;

  update public.invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invite.id;

  return invite.organization_id;
end;
$$;

revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;
