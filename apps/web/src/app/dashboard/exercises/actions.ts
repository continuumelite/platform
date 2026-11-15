'use server';

import { exerciseInputSchema } from '@continuum/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '../../actions';

function parseExercise(formData: FormData) {
  return exerciseInputSchema.safeParse({
    name: formData.get('name') ?? '',
    instructions: formData.get('instructions') ?? '',
    videoUrl: formData.get('videoUrl') ?? '',
    tracking: formData.get('tracking'),
    muscleGroups: formData.getAll('muscleGroups'),
    equipment: formData.getAll('equipment'),
    isShared: formData.get('isShared') === 'on',
  });
}

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Please check the form.';
}

export async function createExercise(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseExercise(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { user, membership, isLead } = await getCoachContext();
  const toLibrary = isLead && formData.get('library') === 'organization';
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from('exercises').insert({
    organization_id: membership.organizationId,
    owner_coach_id: toLibrary ? null : user.id,
    is_shared: toLibrary ? false : input.isShared,
    name: input.name,
    instructions: input.instructions,
    video_url: input.videoUrl,
    tracking: input.tracking,
    muscle_groups: input.muscleGroups,
    equipment: input.equipment,
  });

  if (error) {
    if (error.code === '23505')
      return { error: `There’s already an exercise called “${input.name}”.` };
    return { error: 'Couldn’t save the exercise. Please try again.' };
  }

  revalidatePath('/dashboard/exercises');
  redirect('/dashboard/exercises');
}

export async function updateExercise(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseExercise(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;

  await getCoachContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('exercises')
    .update({
      name: input.name,
      instructions: input.instructions,
      video_url: input.videoUrl,
      tracking: input.tracking,
      muscle_groups: input.muscleGroups,
      equipment: input.equipment,
      // Library exercises can't be "shared"; the database rejects it.
      ...(formData.get('library') === 'organization' ? {} : { is_shared: input.isShared }),
    })
    .eq('id', z.guid().parse(id))
    .select('id');

  if (error) {
    if (error.code === '23505')
      return { error: `There’s already an exercise called “${input.name}”.` };
    return { error: 'Couldn’t save the exercise. Please try again.' };
  }
  if (!data?.length) return { error: 'You don’t have permission to edit this exercise.' };

  revalidatePath('/dashboard/exercises');
  redirect('/dashboard/exercises');
}

export async function archiveExercise(id: string) {
  await getCoachContext();
  const supabase = await createClient();
  await supabase.from('exercises').update({ is_archived: true }).eq('id', z.guid().parse(id));

  revalidatePath('/dashboard/exercises');
  redirect('/dashboard/exercises');
}
