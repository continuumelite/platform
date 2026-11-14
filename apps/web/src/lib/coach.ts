import { isCoachingRole } from '@continuum/shared';
import { redirect } from 'next/navigation';
import { getCurrentUser, type CurrentUser, type Membership } from './auth';

export type CoachContext = {
  user: CurrentUser;
  membership: Membership;
  /** Owners and head coaches manage the organization library. */
  isLead: boolean;
};

/** The signed-in coach. Athletes and people without an organization are sent to /dashboard. */
export async function getCoachContext(): Promise<CoachContext> {
  const user = await getCurrentUser();
  const membership = user.memberships[0];
  if (!membership || !isCoachingRole(membership.role)) redirect('/dashboard');

  return {
    user,
    membership,
    isLead: membership.role === 'owner' || membership.role === 'head_coach',
  };
}
