import {
  workoutDocumentSchema,
  type LoadUnit,
  type SetLog,
  type WorkoutDocument,
} from '@continuum/shared';

import { supabase } from './supabase';

/*
 * Workouts are built on the phone and saved in one go when the athlete finishes.
 *  - Drafts live on the device (SQLite-backed localStorage), so closing the app or losing
 *    signal mid-workout loses nothing.
 *  - If saving fails because the phone is offline, the workout goes into an outbox and is
 *    uploaded the next time the app loads data. Ids are fixed, so a retry never duplicates.
 */

const draftKey = (sessionId: string, date: string) => `workout-draft:${sessionId}:${date}`;
const OUTBOX_KEY = 'workout-outbox';
const UNIT_KEY = 'load-unit';

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function loadDraft(sessionId: string, date: string): WorkoutDocument | null {
  const parsed = workoutDocumentSchema.safeParse(readJson(draftKey(sessionId, date)));
  return parsed.success ? parsed.data : null;
}

export function saveDraft(doc: WorkoutDocument) {
  if (!doc.sessionId) return;
  localStorage.setItem(draftKey(doc.sessionId, doc.performedOn), JSON.stringify(doc));
}

export function clearDraft(sessionId: string, date: string) {
  localStorage.removeItem(draftKey(sessionId, date));
}

export function hasDraft(sessionId: string, date: string) {
  return localStorage.getItem(draftKey(sessionId, date)) !== null;
}

export function preferredUnit(): LoadUnit {
  return localStorage.getItem(UNIT_KEY) === 'lb' ? 'lb' : 'kg';
}

export function setPreferredUnit(unit: LoadUnit) {
  localStorage.setItem(UNIT_KEY, unit);
}

function outbox(): WorkoutDocument[] {
  return readJson<WorkoutDocument[]>(OUTBOX_KEY) ?? [];
}

function setOutbox(docs: WorkoutDocument[]) {
  if (docs.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(docs));
  else localStorage.removeItem(OUTBOX_KEY);
}

/** Network failures (no connection) as opposed to the server rejecting the data. */
function isNetworkError(error: { message?: string; code?: string } | null) {
  return Boolean(
    error && !error.code && /network|fetch|timed out|offline/i.test(error.message ?? ''),
  );
}

export type SaveOutcome =
  { status: 'saved' } | { status: 'queued' } | { status: 'error'; message: string };

export async function saveWorkout(doc: WorkoutDocument): Promise<SaveOutcome> {
  const parsed = workoutDocumentSchema.safeParse(doc);
  if (!parsed.success) return { status: 'error', message: 'Some of the numbers don’t look right.' };

  try {
    const { error } = await supabase.rpc('save_workout', { document: parsed.data });
    if (!error) return { status: 'saved' };
    if (!isNetworkError(error)) return { status: 'error', message: 'Couldn’t save your workout.' };
  } catch {
    // fetch itself threw: offline.
  }
  setOutbox([...outbox().filter((d) => d.id !== doc.id), parsed.data]);
  return { status: 'queued' };
}

/** Upload anything saved while offline. Returns how many are still waiting. */
export async function flushOutbox(): Promise<number> {
  const pending = outbox();
  const remaining: WorkoutDocument[] = [];
  for (const doc of pending) {
    try {
      const { error } = await supabase.rpc('save_workout', { document: doc });
      if (error && isNetworkError(error)) remaining.push(doc);
      // Rejected by the server: drop it rather than retrying forever.
    } catch {
      remaining.push(doc);
    }
  }
  setOutbox(remaining);
  return remaining.length;
}

export function pendingUploads(): WorkoutDocument[] {
  return outbox();
}

type SetRow = {
  id: string;
  session_exercise_id: string | null;
  exercise_id: string;
  position: number;
  set_number: number;
  reps: number | null;
  load: number | null;
  load_unit: LoadUnit;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  completed: boolean;
  notes: string | null;
};

function toSetLog(r: SetRow): SetLog {
  return {
    id: r.id,
    sessionExerciseId: r.session_exercise_id,
    exerciseId: r.exercise_id,
    position: r.position,
    setNumber: r.set_number,
    reps: r.reps,
    load: r.load,
    loadUnit: r.load_unit,
    durationSeconds: r.duration_seconds,
    distanceMeters: r.distance_meters,
    rpe: r.rpe,
    completed: r.completed,
    notes: r.notes,
  };
}

const SET_COLUMNS =
  'id, session_exercise_id, exercise_id, position, set_number, reps, load, load_unit, duration_seconds, distance_meters, rpe, completed, notes';

/** A workout already saved for this session and day (to view or edit it). */
export async function fetchWorkout(
  athleteProfileId: string,
  sessionId: string,
  date: string,
): Promise<WorkoutDocument | null> {
  const { data } = await supabase
    .from('workout_logs')
    .select(
      `id, session_name, performed_on, started_at, completed_at, rpe, notes, sets:set_logs(${SET_COLUMNS})`,
    )
    .eq('athlete_profile_id', athleteProfileId)
    .eq('session_id', sessionId)
    .eq('performed_on', date)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id,
    athleteProfileId,
    sessionId,
    sessionName: data.session_name,
    performedOn: data.performed_on,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    rpe: data.rpe,
    notes: data.notes,
    sets: (data.sets as SetRow[]).map(toSetLog).sort((a, b) => a.position - b.position),
  };
}

/** Which of these sessions have a completed workout, and on which day. */
export async function fetchCompletedSessions(
  athleteProfileId: string,
  sessionIds: string[],
): Promise<Map<string, string>> {
  const done = new Map<string, string>();
  if (!sessionIds.length) return done;
  const { data } = await supabase
    .from('workout_logs')
    .select('session_id, performed_on')
    .eq('athlete_profile_id', athleteProfileId)
    .in('session_id', sessionIds)
    .not('completed_at', 'is', null);
  for (const row of data ?? []) if (row.session_id) done.set(row.session_id, row.performed_on);
  // Workouts saved offline count as done too.
  for (const doc of outbox())
    if (doc.sessionId && doc.completedAt) done.set(doc.sessionId, doc.performedOn);
  return done;
}

/** The most recent completed sets for each exercise, before `beforeDate` ("last time"). */
export async function fetchLastSets(
  athleteProfileId: string,
  exerciseIds: string[],
  beforeDate: string,
): Promise<Map<string, { date: string; sets: SetLog[] }>> {
  const result = new Map<string, { date: string; sets: SetLog[] }>();
  if (!exerciseIds.length) return result;

  const { data } = await supabase
    .from('set_logs')
    .select(`${SET_COLUMNS}, workout:workout_logs!inner(performed_on, athlete_profile_id)`)
    .in('exercise_id', exerciseIds)
    .eq('completed', true)
    .eq('workout.athlete_profile_id', athleteProfileId)
    .lt('workout.performed_on', beforeDate)
    .limit(500);

  const rows = (data ?? []) as (SetRow & { workout: { performed_on: string } })[];
  rows.sort(
    (a, b) =>
      b.workout.performed_on.localeCompare(a.workout.performed_on) || a.position - b.position,
  );
  for (const row of rows) {
    const entry = result.get(row.exercise_id);
    if (!entry)
      result.set(row.exercise_id, { date: row.workout.performed_on, sets: [toSetLog(row)] });
    else if (entry.date === row.workout.performed_on) entry.sets.push(toSetLog(row));
  }
  return result;
}
