import type { Tracking } from './exercises';
import type { LoadType, ProgramDocument } from './programs';
import type { SetLog } from './workouts';

/**
 * Reading an athlete's program from the program tables (athletes can't read the coach's version
 * history). Both apps run ATHLETE_PROGRAM_SELECT and turn the row into a document here.
 */
export const ATHLETE_PROGRAM_SELECT = `id, name, description, start_date, status,
  athlete:athlete_profiles!inner(id, user_id),
  blocks:program_blocks(id, position, name, notes,
    weeks:program_weeks(id, position, is_deload, notes,
      sessions:program_sessions(id, position, name, day_of_week, notes,
        exercises:session_exercises(id, position, exercise_id, sets, reps, load_type, load_value,
          rpe, tempo, rest_seconds, superset, notes,
          exercise:exercises(name, instructions, video_url, tracking)))))`;

export type ExerciseInfo = {
  name: string;
  instructions: string | null;
  videoUrl: string | null;
  tracking: Tracking;
};

export type AthleteProgram = {
  id: string;
  athleteProfileId: string;
  name: string;
  startDate: string | null;
  document: ProgramDocument;
  exercises: Map<string, ExerciseInfo>;
};

type Positioned = { position: number };
const byPosition = <T extends Positioned>(a: T, b: T) => a.position - b.position;

export type AthleteProgramRow = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  athlete: { id: string };
  blocks: (Positioned & {
    id: string;
    name: string;
    notes: string | null;
    weeks: (Positioned & {
      id: string;
      is_deload: boolean;
      notes: string | null;
      sessions: (Positioned & {
        id: string;
        name: string;
        day_of_week: number | null;
        notes: string | null;
        exercises: (Positioned & {
          id: string;
          exercise_id: string;
          sets: number | null;
          reps: string | null;
          load_type: string;
          load_value: number | null;
          rpe: number | null;
          tempo: string | null;
          rest_seconds: number | null;
          superset: string | null;
          notes: string | null;
          exercise: {
            name: string;
            instructions: string | null;
            video_url: string | null;
            tracking: Tracking;
          } | null;
        })[];
      })[];
    })[];
  })[];
};

export function toAthleteProgram(row: AthleteProgramRow): AthleteProgram {
  const exercises = new Map<string, ExerciseInfo>();
  const document: ProgramDocument = {
    name: row.name,
    description: row.description,
    blocks: [...row.blocks].sort(byPosition).map((b) => ({
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
                tracking: e.exercise.tracking,
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
  return {
    id: row.id,
    athleteProfileId: row.athlete.id,
    name: row.name,
    startDate: row.start_date,
    document,
    exercises,
  };
}

/** Columns for reading set_logs back into SetLog (see toSetLog). */
export const SET_LOG_COLUMNS =
  'id, session_exercise_id, exercise_id, position, set_number, reps, load, load_unit, duration_seconds, distance_meters, rpe, completed, notes';

export type SetLogRow = {
  id: string;
  session_exercise_id: string | null;
  exercise_id: string;
  position: number;
  set_number: number;
  reps: number | null;
  load: number | null;
  load_unit: 'kg' | 'lb';
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  completed: boolean;
  notes: string | null;
};

export function setLogFromRow(r: SetLogRow): SetLog {
  return {
    id: r.id,
    sessionExerciseId: r.session_exercise_id,
    exerciseId: r.exercise_id,
    position: r.position,
    setNumber: r.set_number,
    reps: r.reps,
    load: r.load == null ? null : Number(r.load),
    loadUnit: r.load_unit,
    durationSeconds: r.duration_seconds,
    distanceMeters: r.distance_meters == null ? null : Number(r.distance_meters),
    rpe: r.rpe == null ? null : Number(r.rpe),
    completed: r.completed,
    notes: r.notes,
  };
}
