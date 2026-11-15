import type { OrgRole } from '@continuum/shared';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

export type Membership = {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
};

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  memberships: Membership[];
};

/**
 * The signed-in user and the organizations they belong to.
 * Redirects to /login when nobody is signed in.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect('/login');

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', claims.sub).maybeSingle(),
    supabase
      .from('memberships')
      .select('organization_id, role, organizations(name)')
      .eq('user_id', claims.sub),
  ]);

  return {
    id: claims.sub,
    email: claims.email ?? '',
    fullName: profile?.full_name ?? null,
    memberships: (memberships ?? []).map((m) => ({
      organizationId: m.organization_id,
      organizationName: m.organizations?.name ?? '',
      role: m.role,
    })),
  };
}
