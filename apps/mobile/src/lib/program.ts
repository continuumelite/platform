import {
  ATHLETE_PROGRAM_SELECT,
  localDateString,
  pickCurrentProgram,
  toAthleteProgram,
  type AthleteProgram,
  type AthleteProgramRow,
  type ExerciseInfo,
} from '@continuum/shared';

import { supabase } from './supabase';

export type { ExerciseInfo };
export type CurrentProgram = AthleteProgram;

// The last program loaded, so the workout screen can open instantly from Today.
let lastLoaded: CurrentProgram | null = null;
export function cachedProgram() {
  return lastLoaded;
}

/**
 * The signed-in athlete's current program. Row-level security only returns programs that are no
 * longer drafts.
 */
export async function fetchCurrentProgram(userId: string): Promise<CurrentProgram | null> {
  const { data, error } = await supabase
    .from('programs')
    .select(ATHLETE_PROGRAM_SELECT)
    .eq('athlete.user_id', userId)
    .eq('status', 'active');

  if (error) throw error;
  if (!data?.length) return null;

  const current = pickCurrentProgram(
    data.map((p) => ({ ...p, startDate: p.start_date })),
    localDateString(),
  );
  if (!current) return null;

  lastLoaded = toAthleteProgram(current as unknown as AthleteProgramRow);
  return lastLoaded;
}
