'use server';

import { workoutDocumentSchema } from '@continuum/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '../../actions';

/** Save a workout logged on the web (same save_workout function as the app). */
export async function saveWebWorkout(_prev: FormState, formData: FormData): Promise<FormState> {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get('workout') ?? ''));
  } catch {
    return { error: 'Couldn’t read the workout. Please refresh and try again.' };
  }
  const parsed = workoutDocumentSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Some of the numbers don’t look right.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('save_workout', { document: parsed.data });
  if (error) return { error: 'Couldn’t save your workout. Your plan may not include logging.' };

  revalidatePath('/dashboard/training');
  revalidatePath('/dashboard');
  redirect('/dashboard/training');
}
