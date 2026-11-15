import {
  ATHLETE_PROGRAM_SELECT,
  entitlementsSchema,
  hasFeature,
  type FeatureKey,
  localDateString,
  pickCurrentProgram,
  toAthleteProgram,
  type AthleteProgram,
  type AthleteProgramRow,
  type Entitlements,
} from '@continuum/shared';
import { redirect } from 'next/navigation';
import { getCurrentUser, type CurrentUser } from './auth';
import { createClient } from './supabase/server';

export type AthleteContext = {
  user: CurrentUser;
  athleteProfileId: string;
  coachName: string | null;
  goals: string | null;
  program: AthleteProgram | null;
  entitlements: Entitlements | null;
};

/** The signed-in athlete. Coaches (and people without an athlete profile) go to /dashboard. */
export async function getAthleteContext(): Promise<AthleteContext> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: profile }, { data: programs }, { data: plan }] = await Promise.all([
    supabase
      .from('athlete_profiles')
      .select('id, goals, coaches:coach_athletes(role, coach:profiles(full_name))')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('programs')
      .select(ATHLETE_PROGRAM_SELECT)
      .eq('athlete.user_id', user.id)
      .eq('status', 'active'),
    supabase.rpc('my_plan'),
  ]);
  if (!profile) redirect('/dashboard');

  const current = pickCurrentProgram(
    (programs ?? []).map((p) => ({ ...p, startDate: p.start_date })),
    localDateString(),
  );

  return {
    user,
    athleteProfileId: profile.id,
    coachName: profile.coaches.find((c) => c.role === 'primary')?.coach?.full_name ?? null,
    goals: profile.goals,
    program: current ? toAthleteProgram(current as unknown as AthleteProgramRow) : null,
    entitlements: entitlementsSchema.safeParse(plan).data ?? null,
  };
}

/** Same rule as the app: when the plan can't be loaded, don't lock people out. */
export function canUse(entitlements: Entitlements | null, key: FeatureKey) {
  return entitlements == null || hasFeature(entitlements, key);
}

/** Session id → day it was completed, for the program's sessions. */
export async function completedSessions(athleteProfileId: string, program: AthleteProgram | null) {
  const done = new Map<string, string>();
  if (!program) return done;
  const supabase = await createClient();
  const { data } = await supabase
    .from('workout_logs')
    .select('session_id, performed_on')
    .eq('athlete_profile_id', athleteProfileId)
    .eq('program_id', program.id)
    .not('completed_at', 'is', null);
  for (const row of data ?? []) if (row.session_id) done.set(row.session_id, row.performed_on);
  return done;
}
