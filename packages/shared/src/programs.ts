import { z } from 'zod';

/**
 * A program as the editor works with it, and as save_program() stores it.
 * Item ids are generated on the client and stay stable across saves.
 */

export const LOAD_TYPES = {
  none: 'No load',
  kg: 'kg',
  lb: 'lb',
  percent_1rm: '% 1RM',
} as const;
export type LoadType = keyof typeof LOAD_TYPES;

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const id = z.guid();
const optionalText = (max: number) => z.string().max(max).nullish();

export const prescriptionSchema = z.object({
  id,
  exerciseId: id,
  sets: z.number().int().min(1).max(50).nullish(),
  reps: optionalText(40),
  loadType: z.enum(['none', 'kg', 'lb', 'percent_1rm']).default('none'),
  loadValue: z.number().min(0).max(99999).nullish(),
  rpe: z.number().min(1).max(10).nullish(),
  tempo: optionalText(20),
  restSeconds: z.number().int().min(0).max(3600).nullish(),
  superset: optionalText(4),
  notes: optionalText(1000),
});

export const sessionSchema = z.object({
  id,
  name: z.string().max(200).default(''),
  dayOfWeek: z.number().int().min(1).max(7).nullish(),
  notes: optionalText(2000),
  exercises: z.array(prescriptionSchema),
});

export const weekSchema = z.object({
  id,
  isDeload: z.boolean().default(false),
  notes: optionalText(2000),
  sessions: z.array(sessionSchema),
});

export const blockSchema = z.object({
  id,
  name: z.string().max(200).default(''),
  notes: optionalText(2000),
  weeks: z.array(weekSchema),
});

export const programDocumentSchema = z.object({
  name: z.string().trim().min(1, 'Give the program a name').max(200),
  description: optionalText(5000),
  blocks: z.array(blockSchema),
});

export type Prescription = z.infer<typeof prescriptionSchema>;
export type ProgramSession = z.infer<typeof sessionSchema>;
export type ProgramWeek = z.infer<typeof weekSchema>;
export type ProgramBlock = z.infer<typeof blockSchema>;
export type ProgramDocument = z.infer<typeof programDocumentSchema>;

type MaybeCrypto = { crypto?: { randomUUID?: () => string } };

/** A v4 UUID. Uses the platform's crypto when available (web, Node); falls back for React Native. */
export function newId(): string {
  const native = (globalThis as MaybeCrypto).crypto?.randomUUID;
  if (native) return native.call((globalThis as MaybeCrypto).crypto);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function newPrescription(exerciseId: string): Prescription {
  return { id: newId(), exerciseId, sets: 3, reps: '10', loadType: 'none', restSeconds: 90 };
}

export function newSession(name = ''): ProgramSession {
  return { id: newId(), name, dayOfWeek: null, exercises: [] };
}

export function newWeek(): ProgramWeek {
  return { id: newId(), isDeload: false, sessions: [] };
}

export function newBlock(name = ''): ProgramBlock {
  return { id: newId(), name, weeks: [newWeek()] };
}

export function emptyProgram(name: string): ProgramDocument {
  return { name, description: null, blocks: [newBlock('Block 1')] };
}

/** Deep copy with fresh ids everywhere, e.g. when copying a template to an athlete. */
export function cloneWithNewIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => cloneWithNewIds(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = key === 'id' ? newId() : cloneWithNewIds(v);
    }
    return out as T;
  }
  return value;
}

function formatRest(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
}

/** "4 × 5 @ 75% 1RM · RPE 7 · rest 3 min" */
export function describePrescription(p: Prescription): string {
  const parts: string[] = [];
  let main = [p.sets, p.reps].filter((v) => v !== null && v !== undefined && v !== '').join(' × ');
  if (p.loadType !== 'none' && p.loadValue != null) {
    main += `${main ? ' @ ' : ''}${p.loadValue}${p.loadType === 'percent_1rm' ? '% 1RM' : ` ${p.loadType}`}`;
  }
  if (main) parts.push(main);
  if (p.rpe != null) parts.push(`RPE ${p.rpe}`);
  if (p.tempo) parts.push(`tempo ${p.tempo}`);
  if (p.restSeconds != null) parts.push(`rest ${formatRest(p.restSeconds)}`);
  return parts.join(' · ');
}

/** Counts used in summaries, e.g. "1 block · 4 weeks · 12 sessions". */
export function programStats(doc: ProgramDocument) {
  const weeks = doc.blocks.flatMap((b) => b.weeks);
  const sessions = weeks.flatMap((w) => w.sessions);
  return {
    blocks: doc.blocks.length,
    weeks: weeks.length,
    sessions: sessions.length,
    exercises: sessions.reduce((n, s) => n + s.exercises.length, 0),
  };
}
