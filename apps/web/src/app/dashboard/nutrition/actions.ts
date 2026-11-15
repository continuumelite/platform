'use server';

import { caloriesFromMacros, foodEntrySchema, MEAL_SLOTS, newId } from '@continuum/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAthleteContext } from '@/lib/athlete';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '../../actions';

const amount = z.union([z.literal('').transform(() => null), z.coerce.number().min(0)]);

const formSchema = z.object({
  date: z.iso.date(),
  meal: z.enum(MEAL_SLOTS),
  name: z.string().trim().min(1, 'Name the food').max(200),
  quantity: z.string().trim().max(100),
  calories: amount,
  proteinG: amount,
  carbsG: amount,
  fatG: amount,
});

export async function addFood(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = formSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the numbers.' };
  const f = parsed.data;
  const macros = { proteinG: f.proteinG ?? 0, carbsG: f.carbsG ?? 0, fatG: f.fatG ?? 0 };
  const { athleteProfileId } = await getAthleteContext();

  const entry = foodEntrySchema.safeParse({
    id: newId(),
    athleteProfileId,
    loggedOn: f.date,
    meal: f.meal,
    name: f.name,
    quantity: f.quantity || null,
    calories: Math.round(f.calories ?? caloriesFromMacros(macros)),
    ...macros,
  });
  if (!entry.success) return { error: 'Check the numbers.' };

  const e = entry.data;
  const supabase = await createClient();
  const { error } = await supabase.from('food_logs').insert({
    id: e.id,
    athlete_profile_id: e.athleteProfileId,
    logged_on: e.loggedOn,
    meal: e.meal,
    name: e.name,
    quantity: e.quantity,
    calories: e.calories,
    protein_g: e.proteinG,
    carbs_g: e.carbsG,
    fat_g: e.fatG,
  });
  if (error) return { error: 'Couldn’t save. Your plan may not include food logging.' };
  revalidatePath('/dashboard/nutrition');
  return null;
}

export async function removeFood(id: string) {
  const supabase = await createClient();
  await supabase.from('food_logs').delete().eq('id', z.guid().parse(id));
  revalidatePath('/dashboard/nutrition');
}
