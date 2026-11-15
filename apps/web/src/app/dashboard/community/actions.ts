'use server';

import { commentBodySchema, postBodySchema } from '@continuum/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '../../actions';

const PATH = '/dashboard/community';
const id = z.guid();

export async function createPost(_prev: FormState, formData: FormData): Promise<FormState> {
  const body = postBodySchema.safeParse(formData.get('body'));
  if (!body.success) return { error: body.error.issues[0]?.message };
  const user = await getCurrentUser();
  const membership = user.memberships[0];
  if (!membership) return { error: 'You’re not part of a team yet.' };

  const supabase = await createClient();
  const { error } = await supabase.from('community_posts').insert({
    organization_id: membership.organizationId,
    author_id: user.id,
    body: body.data,
  });
  if (error) return { error: 'Couldn’t post. Your plan may not include posting.' };
  revalidatePath(PATH);
  return { message: 'Posted.' };
}

export async function createComment(
  postId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const body = commentBodySchema.safeParse(formData.get('body'));
  if (!body.success) return { error: body.error.issues[0]?.message };
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from('community_comments')
    .insert({ post_id: id.parse(postId), author_id: user.id, body: body.data });
  if (error) return { error: 'Couldn’t comment.' };
  revalidatePath(PATH);
  return null;
}

export async function toggleLike(postId: string, liked: boolean) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (liked) {
    await supabase
      .from('community_reactions')
      .delete()
      .eq('post_id', id.parse(postId))
      .eq('user_id', user.id);
  } else {
    await supabase
      .from('community_reactions')
      .insert({ post_id: id.parse(postId), user_id: user.id });
  }
  revalidatePath(PATH);
}

export async function setPinned(postId: string, pinned: boolean) {
  const supabase = await createClient();
  await supabase.from('community_posts').update({ pinned }).eq('id', id.parse(postId));
  revalidatePath(PATH);
}

export async function setHidden(postId: string, hidden: boolean) {
  const supabase = await createClient();
  await supabase
    .from('community_posts')
    .update({ hidden_at: hidden ? new Date().toISOString() : null })
    .eq('id', id.parse(postId));
  revalidatePath(PATH);
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  await supabase.from('community_posts').delete().eq('id', id.parse(postId));
  revalidatePath(PATH);
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  await supabase.from('community_comments').delete().eq('id', id.parse(commentId));
  revalidatePath(PATH);
}

export async function reportPost(postId: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  // A repeat report hits the unique constraint; that's fine.
  await supabase
    .from('community_reports')
    .insert({ post_id: id.parse(postId), reporter_id: user.id, reason: null });
  revalidatePath(PATH);
}

export async function resolveReport(reportId: string) {
  const supabase = await createClient();
  await supabase
    .from('community_reports')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id.parse(reportId));
  revalidatePath(PATH);
}
