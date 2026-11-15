'use server';

import { targetFormSchema } from '@continuum/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '../../../actions';

/** Save one day type's target, or clear it when every field is blank. */
export async function saveNutritionTarget(
  athleteProfileId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const athleteId = z.guid().parse(athleteProfileId);
  const parsed = targetFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Use whole numbers for calories and grams.' };
  const t = parsed.data;

  await getCoachContext();
  const supabase = await createClient();
  const empty = [t.calories, t.proteinG, t.carbsG, t.fatG, t.notes].every((v) => v == null);

  const { error } = empty
    ? await supabase
        .from('nutrition_targets')
        .delete()
        .eq('athlete_profile_id', athleteId)
        .eq('day_type', t.dayType)
    : await supabase.from('nutrition_targets').upsert(
        {
          athlete_profile_id: athleteId,
          day_type: t.dayType,
          calories: t.calories,
          protein_g: t.proteinG,
          carbs_g: t.carbsG,
          fat_g: t.fatG,
          notes: t.notes,
        },
        { onConflict: 'athlete_profile_id,day_type' },
      );
  if (error) return { error: 'Couldn’t save the target.' };

  revalidatePath(`/dashboard/athletes/${athleteId}`);
  return { message: empty ? 'Cleared.' : 'Saved.' };
}
