'use server';

import { messageBodySchema, messageErrorText, newId } from '@continuum/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '../../actions';

export async function sendMessage(
  threadId: string,
  athleteId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const body = messageBodySchema.safeParse(formData.get('body'));
  if (!body.success) return { error: body.error.issues[0]?.message };
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from('messages').insert({
    id: newId(),
    thread_id: z.guid().parse(threadId),
    sender_id: user.id,
    body: body.data,
  });
  if (error) return { error: messageErrorText(error) };
  revalidatePath(`/dashboard/messages/${z.guid().parse(athleteId)}`);
  revalidatePath('/dashboard/messages');
  return null;
}

export async function markThreadRead(threadId: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  await supabase.from('message_reads').upsert({
    thread_id: z.guid().parse(threadId),
    user_id: user.id,
    last_read_at: new Date().toISOString(),
  });
}
