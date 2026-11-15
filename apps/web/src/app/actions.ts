'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type FormState = { error?: string; message?: string } | null;

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Enter your email and password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'That email and password don’t match an account.' };

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

const inviteSchema = z.object({
  organizationId: z.guid(),
  email: z.email().transform((e) => e.trim().toLowerCase()),
});

export async function inviteAthlete(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Enter a valid email address.' };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect('/login');

  const { error } = await supabase.from('invitations').insert({
    organization_id: parsed.data.organizationId,
    email: parsed.data.email,
    role: 'athlete',
    coach_user_id: claims.claims.sub,
  });

  if (error) {
    if (error.code === '23505') return { error: 'That person already has an open invitation.' };
    return { error: 'Couldn’t create the invitation. Please try again.' };
  }

  revalidatePath('/dashboard');
  return {
    message: `Invitation created for ${parsed.data.email}. Copy the link below and send it to them.`,
  };
}

export async function revokeInvitation(formData: FormData) {
  const id = z.guid().parse(formData.get('id'));
  const supabase = await createClient();
  await supabase.from('invitations').delete().eq('id', id);
  revalidatePath('/dashboard');
}

const acceptSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().trim().min(1).max(200).optional(),
  password: z.string().min(8).optional(),
});

/** Creates the account if needed, then joins the organization. */
export async function acceptInvitation(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = acceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Enter your name and a password of at least 8 characters.' };
  const { token, fullName, password } = parsed.data;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    const { data: invite } = await supabase
      .rpc('get_invitation', { invite_token: token })
      .maybeSingle();
    if (!invite || invite.is_accepted || invite.is_expired)
      return { error: 'This invitation is no longer valid.' };
    if (!fullName || !password)
      return { error: 'Enter your name and a password of at least 8 characters.' };

    const origin = (await headers()).get('origin') ?? undefined;
    const { data, error } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: origin ? `${origin}/invite/${token}` : undefined,
      },
    });
    if (error) {
      return {
        error:
          error.code === 'user_already_exists'
            ? 'An account with this email already exists. Sign in first, then open this link again.'
            : 'Couldn’t create your account. Please try again.',
      };
    }
    if (!data.session) {
      return { message: 'Check your email to confirm your address, then open this link again.' };
    }
  }

  const { error } = await supabase.rpc('accept_invitation', { invite_token: token });
  if (error) return { error: error.message };

  redirect('/dashboard');
}
