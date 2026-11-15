'use server';

import { planSettingsSchema } from '@continuum/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '../../actions';

/** Save the owner's tier settings: tiers on/off, plan names and prices, and the feature grid. */
export async function savePlanSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get('settings') ?? ''));
  } catch {
    return { error: 'Couldn’t read the form. Please refresh and try again.' };
  }
  const parsed = planSettingsSchema.safeParse(raw);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form.' };

  const { membership } = await getCoachContext();
  if (membership.role !== 'owner') return { error: 'Only the owner can change plans.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('save_plan_settings', {
    org_id: membership.organizationId,
    document: parsed.data,
  });
  if (error) return { error: 'Couldn’t save the plans.' };

  revalidatePath('/dashboard/plans');
  return { message: 'Saved.' };
}

/** Put an athlete on a plan by hand ('' = back to the default plan). */
export async function setAthletePlan(
  athleteProfileId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const athleteId = z.guid().parse(athleteProfileId);
  const planId = z.union([z.literal(''), z.guid()]).safeParse(formData.get('planId'));
  if (!planId.success) return { error: 'Choose a plan.' };

  await getCoachContext();
  const supabase = await createClient();

  if (!planId.data) {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('athlete_profile_id', athleteId)
      .eq('source', 'manual');
    if (error) return { error: 'Couldn’t change the plan.' };
  } else {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(
        { athlete_profile_id: athleteId, plan_id: planId.data, status: 'active', source: 'manual' },
        { onConflict: 'athlete_profile_id' },
      )
      .select('id');
    if (error || !data?.length) return { error: 'Couldn’t change the plan.' };
  }

  revalidatePath(`/dashboard/athletes/${athleteId}`);
  return { message: 'Saved.' };
}
