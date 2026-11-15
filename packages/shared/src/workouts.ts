import { z } from 'zod';
import { newId, type Prescription } from './programs';
import type { Tracking } from './exercises';

/**
 * A logged workout as the app builds it and save_workout() stores it.
 * Ids are generated in the app so a retried save updates instead of duplicating.
 */

export const LOAD_UNITS = ['kg', 'lb'] as const;
export type LoadUnit = (typeof LOAD_UNITS)[number];

export const setLogSchema = z.object({
  id: z.guid(),
  sessionExerciseId: z.guid().nullish(),
  exerciseId: z.guid(),
  position: z.number().int().min(0),
  setNumber: z.number().int().min(1).max(100),
  reps: z.number().int().min(0).max(1000).nullish(),
  load: z.number().min(0).max(99999).nullish(),
  loadUnit: z.enum(LOAD_UNITS).default('kg'),
  durationSeconds: z.number().int().min(0).max(86400).nullish(),
  distanceMeters: z.number().min(0).max(1_000_000).nullish(),
  rpe: z.number().min(1).max(10).nullish(),
  completed: z.boolean(),
  notes: z.string().max(500).nullish(),
});

export const workoutDocumentSchema = z.object({
  id: z.guid(),
  athleteProfileId: z.guid(),
  sessionId: z.guid().nullish(),
  sessionName: z.string().max(200).default(''),
  /** YYYY-MM-DD in the athlete's time zone. */
  performedOn: z.iso.date(),
  startedAt: z.iso.datetime({ offset: true }).nullish(),
  completedAt: z.iso.datetime({ offset: true }).nullish(),
  rpe: z.number().min(1).max(10).nullish(),
  notes: z.string().max(2000).nullish(),
  sets: z.array(setLogSchema),
});

export type SetLog = z.infer<typeof setLogSchema>;
export type WorkoutDocument = z.infer<typeof workoutDocumentSchema>;

/** First whole number in a reps target: "8-10" → 8, "AMRAP" → null. */
export function targetReps(reps: string | null | undefined): number | null {
  const match = reps?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

/** Seconds from a target like "45s", "2 min", "1:30" or "90". */
export function targetSeconds(value: string | null | undefined): number | null {
  if (!value) return null;
  const clock = value.match(/^(\d+):(\d{2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const minutes = value.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minutes)$/i);
  if (minutes) return Math.round(Number(minutes[1]) * 60);
  const seconds = value.match(/^(\d+)\s*(?:s|sec|secs|seconds)?$/i);
  return seconds ? Number(seconds[1]) : null;
}

/** Meters from a target like "400m", "1.5km" or "800". */
export function targetMeters(value: string | null | undefined): number | null {
  if (!value) return null;
  const km = value.match(/^(\d+(?:\.\d+)?)\s*km$/i);
  if (km) return Number(km[1]) * 1000;
  const m = value.match(/^(\d+(?:\.\d+)?)\s*m?$/i);
  return m ? Number(m[1]) : null;
}

/** The load to suggest for a set, when the coach prescribed an absolute weight. */
export function targetLoad(
  p: Pick<Prescription, 'loadType' | 'loadValue'>,
): { load: number; unit: LoadUnit } | null {
  if ((p.loadType === 'kg' || p.loadType === 'lb') && p.loadValue != null) {
    return { load: p.loadValue, unit: p.loadType };
  }
  return null;
}

/**
 * Empty sets for a prescribed exercise, one per prescribed set. Values start empty; the app shows
 * the target as a hint and fills it in when the athlete ticks a set off without typing.
 */
export function plannedSets(
  p: Prescription,
  defaultUnit: LoadUnit,
  startPosition: number,
): SetLog[] {
  const unit = targetLoad(p)?.unit ?? defaultUnit;
  return Array.from({ length: p.sets ?? 1 }, (_, i) => ({
    id: newId(),
    sessionExerciseId: p.id,
    exerciseId: p.exerciseId,
    position: startPosition + i,
    setNumber: i + 1,
    loadUnit: unit,
    completed: false,
  }));
}

/** What ticking off a set records when the athlete left fields blank: the coach's targets. */
export function fillFromTargets(
  set: SetLog,
  p: Prescription | undefined,
  tracking: Tracking,
): SetLog {
  if (!p) return { ...set, completed: true };
  const filled: SetLog = { ...set, completed: true };
  if (tracking === 'weight_reps' || tracking === 'reps') filled.reps ??= targetReps(p.reps);
  if (tracking === 'weight_reps') {
    const load = targetLoad(p);
    if (load && filled.load == null) {
      filled.load = load.load;
      filled.loadUnit = load.unit;
    }
  }
  if (tracking === 'time') filled.durationSeconds ??= targetSeconds(p.reps);
  if (tracking === 'distance') filled.distanceMeters ??= targetMeters(p.reps);
  filled.rpe ??= p.rpe ?? null;
  return filled;
}

/** "100 kg × 5", "45s", "400 m" */
export function describeSet(set: SetLog, tracking: Tracking): string {
  const parts: string[] = [];
  if (set.load != null && tracking === 'weight_reps') parts.push(`${set.load} ${set.loadUnit}`);
  if (set.reps != null) parts.push(parts.length ? `× ${set.reps}` : `${set.reps} reps`);
  if (set.durationSeconds != null) {
    const m = Math.floor(set.durationSeconds / 60);
    const s = set.durationSeconds % 60;
    parts.push(m ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`);
  }
  if (set.distanceMeters != null) {
    parts.push(
      set.distanceMeters >= 1000 ? `${set.distanceMeters / 1000} km` : `${set.distanceMeters} m`,
    );
  }
  if (set.rpe != null) parts.push(`@ RPE ${set.rpe}`);
  return parts.join(' ');
}

/** Total weight moved (load × reps) in kilograms, over completed sets. */
export function workoutVolumeKg(sets: SetLog[]): number {
  return Math.round(
    sets
      .filter((s) => s.completed && s.load != null && s.reps != null)
      .reduce((sum, s) => sum + s.load! * s.reps! * (s.loadUnit === 'lb' ? 0.4536 : 1), 0),
  );
}
