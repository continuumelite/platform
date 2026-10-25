import { z } from 'zod';

/** Roles a user can hold within an organization. Mirrors the `org_role` enum in the database. */
export const orgRoleSchema = z.enum(['owner', 'head_coach', 'coach', 'athlete']);
export type OrgRole = z.infer<typeof orgRoleSchema>;

/** How a coach works with an athlete. Mirrors the `coach_assignment_role` enum in the database. */
export const coachAssignmentRoleSchema = z.enum(['primary', 'nutrition', 'assistant']);
export type CoachAssignmentRole = z.infer<typeof coachAssignmentRoleSchema>;

const COACHING_ROLES: readonly OrgRole[] = ['owner', 'head_coach', 'coach'];

export function isCoachingRole(role: OrgRole): boolean {
  return COACHING_ROLES.includes(role);
}
