'use server';

import {
  cloneWithNewIds,
  emptyProgram,
  programDocumentSchema,
  type ProgramDocument,
} from '@continuum/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '../../actions';

const createSchema = z.object({
  // 'template:mine', 'template:organization' or 'athlete:<athlete profile id>'
  target: z.string().regex(/^(template:(mine|organization)|athlete:[0-9a-f-]{36})$/),
  name: z.string().trim().min(1, 'Give the program a name').max(200),
  sourceProgramId: z.union([z.literal(''), z.guid()]),
  startDate: z.union([z.literal(''), z.iso.date()]),
});

export async function createProgram(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  const { target, name, sourceProgramId, startDate } = parsed.data;

  const { user, membership } = await getCoachContext();
  const supabase = await createClient();

  // Start from a copy of another program, or from scratch.
  let document: ProgramDocument = emptyProgram(name);
  let reason = 'Created';
  if (sourceProgramId) {
    const { data: source } = await supabase
      .from('programs')
      .select('name, current_version')
      .eq('id', sourceProgramId)
      .maybeSingle();
    const { data: version } = source
      ? await supabase
          .from('program_versions')
          .select('document')
          .eq('program_id', sourceProgramId)
          .eq('version', source.current_version)
          .maybeSingle()
      : { data: null };
    const sourceDoc = programDocumentSchema.safeParse(version?.document);
    if (!source || !sourceDoc.success) return { error: 'Couldn’t copy that program.' };
    document = { ...cloneWithNewIds(sourceDoc.data), name };
    reason = `Copied from ${source.name}`;
  }

  const [kind, value] = target.split(':') as ['template' | 'athlete', string];
  const { data: program, error } = await supabase
    .from('programs')
    .insert({
      organization_id: membership.organizationId,
      name,
      athlete_profile_id: kind === 'athlete' ? value : null,
      owner_coach_id: kind === 'template' && value === 'mine' ? user.id : null,
      start_date: kind === 'athlete' && startDate ? startDate : null,
      source_program_id: sourceProgramId || null,
    })
    .select('id')
    .single();

  if (error || !program) {
    return { error: 'You can’t create that program. Check that the athlete is assigned to you.' };
  }

  const { error: saveError } = await supabase.rpc('save_program', {
    target_program_id: program.id,
    expected_version: 0,
    document,
    reason,
  });
  if (saveError) return { error: 'The program was created but its content couldn’t be saved.' };

  revalidatePath('/dashboard/programs');
  redirect(`/dashboard/programs/${program.id}`);
}

export type SaveResult =
  { ok: true; version: number } | { ok: false; error: string; conflict?: boolean };

export async function saveProgram(
  programId: string,
  expectedVersion: number,
  document: unknown,
  reason: string,
): Promise<SaveResult> {
  const parsed = programDocumentSchema.safeParse(document);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue ? `${issue.message} (${issue.path.join(' › ')})` : 'Invalid program.',
    };
  }

  await getCoachContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('save_program', {
    target_program_id: z.guid().parse(programId),
    expected_version: expectedVersion,
    document: parsed.data,
    reason: reason.trim().slice(0, 1000) || undefined,
  });

  if (error) {
    if (error.code === '40001') return { ok: false, conflict: true, error: error.message };
    if (error.code === '42501')
      return { ok: false, error: 'You don’t have permission to edit this program.' };
    return { ok: false, error: 'Couldn’t save the program. Please try again.' };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath('/dashboard/programs');
  return { ok: true, version: data };
}

const detailsSchema = z.object({
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  startDate: z.union([z.literal(''), z.iso.date()]),
});

export async function updateProgramDetails(
  programId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please check the status and start date.' };

  await getCoachContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('programs')
    .update({ status: parsed.data.status, start_date: parsed.data.startDate || null })
    .eq('id', z.guid().parse(programId))
    .select('id');

  if (error || !data?.length) return { error: 'Couldn’t update the program.' };

  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath('/dashboard/programs');
  return { message: 'Saved.' };
}
