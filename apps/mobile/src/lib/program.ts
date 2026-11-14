import {
  localDateString,
  pickCurrentProgram,
  type LoadType,
  type ProgramDocument,
} from '@continuum/shared';

import { supabase } from './supabase';

export type ExerciseInfo = {
  name: string;
  instructions: string | null;
  videoUrl: string | null;
};

export type CurrentProgram = {
  id: string;
  name: string;
  startDate: string | null;
  document: ProgramDocument;
  exercises: Map<string, ExerciseInfo>;
};

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/**
 * The signed-in athlete's current program, read from the program tables (athletes can't read
 * the coach's version history). Row-level security only returns programs that are no longer drafts.
 */
export async function fetchCurrentProgram(userId: string): Promise<CurrentProgram | null> {
  const { data, error } = await supabase
    .from('programs')
    .select(
      `id, name, description, start_date, status,
       athlete:athlete_profiles!inner(user_id),
       blocks:program_blocks(id, position, name, notes,
         weeks:program_weeks(id, position, is_deload, notes,
           sessions:program_sessions(id, position, name, day_of_week, notes,
             exercises:session_exercises(id, position, exercise_id, sets, reps, load_type, load_value,
               rpe, tempo, rest_seconds, superset, notes,
               exercise:exercises(name, instructions, video_url)))))`,
    )
    .eq('athlete.user_id', userId)
    .eq('status', 'active');

  if (error) throw error;
  if (!data?.length) return null;

  const current = pickCurrentProgram(
    data.map((p) => ({ ...p, startDate: p.start_date })),
    localDateString(),
  );
  if (!current) return null;

  const exercises = new Map<string, ExerciseInfo>();
  const document: ProgramDocument = {
    name: current.name,
    description: current.description,
    blocks: [...current.blocks].sort(byPosition).map((b) => ({
      id: b.id,
      name: b.name,
      notes: b.notes,
      weeks: [...b.weeks].sort(byPosition).map((w) => ({
        id: w.id,
        isDeload: w.is_deload,
        notes: w.notes,
        sessions: [...w.sessions].sort(byPosition).map((s) => ({
          id: s.id,
          name: s.name,
          dayOfWeek: s.day_of_week,
          notes: s.notes,
          exercises: [...s.exercises].sort(byPosition).map((e) => {
            if (e.exercise) {
              exercises.set(e.exercise_id, {
                name: e.exercise.name,
                instructions: e.exercise.instructions,
                videoUrl: e.exercise.video_url,
              });
            }
            return {
              id: e.id,
              exerciseId: e.exercise_id,
              sets: e.sets,
              reps: e.reps,
              loadType: e.load_type as LoadType,
              loadValue: e.load_value,
              rpe: e.rpe,
              tempo: e.tempo,
              restSeconds: e.rest_seconds,
              superset: e.superset,
              notes: e.notes,
            };
          }),
        })),
      })),
    })),
  };

  return { id: current.id, name: current.name, startDate: current.start_date, document, exercises };
}
