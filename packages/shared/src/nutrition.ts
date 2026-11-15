import { z } from 'zod';

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export const DAY_TYPES = ['any', 'training', 'rest'] as const;
export type NutritionDayType = (typeof DAY_TYPES)[number];
export const DAY_TYPE_LABELS: Record<NutritionDayType, string> = {
  any: 'Every day',
  training: 'Training days',
  rest: 'Rest days',
};

export type Macros = { calories: number; proteinG: number; carbsG: number; fatG: number };

export type NutritionTarget = {
  dayType: NutritionDayType;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  notes: string | null;
};

const optionalAmount = (max: number) =>
  z
    .union([z.literal('').transform(() => null), z.coerce.number().int().min(0).max(max)])
    .nullable();

/** The coach's target form (one day type). */
export const targetFormSchema = z.object({
  dayType: z.enum(DAY_TYPES),
  calories: optionalAmount(20000),
  proteinG: optionalAmount(2000),
  carbsG: optionalAmount(3000),
  fatG: optionalAmount(1000),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || null),
});

/** A food entry as the app saves it. Ids come from the app so offline retries don't duplicate. */
export const foodEntrySchema = z.object({
  id: z.guid(),
  athleteProfileId: z.guid(),
  loggedOn: z.iso.date(),
  meal: z.enum(MEAL_SLOTS),
  name: z.string().trim().min(1, 'Name the food').max(200),
  quantity: z.string().trim().max(100).nullable(),
  calories: z.number().int().min(0).max(10000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(2000),
  fatG: z.number().min(0).max(1000),
});
export type FoodEntry = z.infer<typeof foodEntrySchema>;

/** Calories from macros (4 / 4 / 9 kcal per gram), for when only macros are entered. */
export function caloriesFromMacros(m: Pick<Macros, 'proteinG' | 'carbsG' | 'fatG'>): number {
  return Math.round(m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9);
}

export function sumMacros(entries: Macros[]): Macros {
  const total = entries.reduce(
    (t, e) => ({
      calories: t.calories + e.calories,
      proteinG: t.proteinG + e.proteinG,
      carbsG: t.carbsG + e.carbsG,
      fatG: t.fatG + e.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
  return {
    calories: Math.round(total.calories),
    proteinG: Math.round(total.proteinG),
    carbsG: Math.round(total.carbsG),
    fatG: Math.round(total.fatG),
  };
}

/** The target that applies today: the training/rest one if set, otherwise "every day". */
export function targetFor(
  targets: NutritionTarget[],
  isTrainingDay: boolean,
): NutritionTarget | null {
  const specific = targets.find((t) => t.dayType === (isTrainingDay ? 'training' : 'rest'));
  return specific ?? targets.find((t) => t.dayType === 'any') ?? null;
}
