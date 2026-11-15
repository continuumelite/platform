'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '../../actions';

const schema = z
  .object({
    password: z.string().min(10, 'Use at least 10 characters').max(72, 'Use at most 72 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'The two passwords don’t match' });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: 'Couldn’t change your password. Sign out, sign in again and retry.' };
  return { message: 'Password changed.' };
}
