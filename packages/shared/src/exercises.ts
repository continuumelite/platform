import { z } from 'zod';

/** Mirrors the muscle_groups check on `exercises` in the database. */
export const MUSCLE_GROUPS = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  core: 'Core',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  full_body: 'Full body',
} as const;

/** Mirrors the equipment check on `exercises` in the database. */
export const EQUIPMENT = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  band: 'Band',
  trap_bar: 'Trap bar',
  other: 'Other',
} as const;

/** How sets of this exercise are logged. Mirrors the `exercise_tracking` enum. */
export const TRACKING = {
  weight_reps: 'Weight × reps',
  reps: 'Reps only',
  time: 'Time',
  distance: 'Distance',
} as const;

export type MuscleGroup = keyof typeof MUSCLE_GROUPS;
export type Equipment = keyof typeof EQUIPMENT;
export type Tracking = keyof typeof TRACKING;

const keys = <T extends Record<string, string>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const exerciseInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  instructions: z
    .string()
    .trim()
    .max(5000)
    .transform((v) => v || null),
  videoUrl: z
    .string()
    .trim()
    .transform((v) => v || null)
    .refine((v) => v === null || /^https:\/\/\S+$/.test(v), 'Video link must start with https://'),
  tracking: z.enum(keys(TRACKING)),
  muscleGroups: z.array(z.enum(keys(MUSCLE_GROUPS))),
  equipment: z.array(z.enum(keys(EQUIPMENT))),
  isShared: z.boolean(),
});

export type ExerciseInput = z.infer<typeof exerciseInputSchema>;
