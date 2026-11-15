import {
  COMMUNITY_COMMENT_SELECT,
  COMMUNITY_POST_SELECT,
  toFeedComment,
  toFeedPost,
  type FeedComment,
  type FeedPost,
} from '@continuum/shared';

import { supabase } from './supabase';

async function likedSet(userId: string, postIds: string[]) {
  if (!postIds.length) return new Set<string>();
  const { data } = await supabase
    .from('community_reactions')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  return new Set((data ?? []).map((r) => r.post_id));
}

/** The organization feed, pinned first then newest. Row-level security decides what's visible. */
export async function fetchFeed(userId: string, limit = 50): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('community_posts')
    .select(COMMUNITY_POST_SELECT)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const liked = await likedSet(
    userId,
    data.map((p) => p.id),
  );
  return data.map((row) => toFeedPost(row, liked));
}

export async function fetchPost(
  userId: string,
  postId: string,
): Promise<{ post: FeedPost; comments: FeedComment[] } | null> {
  const [{ data: row, error }, { data: comments }] = await Promise.all([
    supabase.from('community_posts').select(COMMUNITY_POST_SELECT).eq('id', postId).maybeSingle(),
    supabase
      .from('community_comments')
      .select(COMMUNITY_COMMENT_SELECT)
      .eq('post_id', postId)
      .order('created_at'),
  ]);
  if (error) throw error;
  if (!row) return null;
  return {
    post: toFeedPost(row, await likedSet(userId, [postId])),
    comments: (comments ?? []).map(toFeedComment),
  };
}

export async function createPost(organizationId: string, userId: string, body: string) {
  const { error } = await supabase
    .from('community_posts')
    .insert({ organization_id: organizationId, author_id: userId, body });
  if (error) throw error;
}

export async function createComment(postId: string, userId: string, body: string) {
  const { error } = await supabase
    .from('community_comments')
    .insert({ post_id: postId, author_id: userId, body });
  if (error) throw error;
}

export async function setLiked(postId: string, userId: string, liked: boolean) {
  const { error } = liked
    ? await supabase.from('community_reactions').insert({ post_id: postId, user_id: userId })
    : await supabase
        .from('community_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
  if (error) throw error;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from('community_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function reportPost(postId: string, userId: string) {
  // Reporting twice hits a unique constraint, which is fine.
  await supabase.from('community_reports').insert({ post_id: postId, reporter_id: userId });
}
