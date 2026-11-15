import {
  COMMUNITY_COMMENT_SELECT,
  COMMUNITY_POST_SELECT,
  entitlementsSchema,
  hasFeature,
  toFeedComment,
  toFeedPost,
  type FeedComment,
  type FeedPost,
} from '@continuum/shared';
import { createClient } from './supabase/server';

export type Feed = {
  posts: FeedPost[];
  comments: Map<string, FeedComment[]>;
  canView: boolean;
  canPost: boolean;
};

/** The organization feed: pinned first, then newest. Row-level security limits what's returned. */
export async function fetchFeed(userId: string, limit = 50): Promise<Feed> {
  const supabase = await createClient();
  const { data: plan } = await supabase.rpc('my_plan');
  const entitlements = entitlementsSchema.safeParse(plan).data ?? null;
  const canView = hasFeature(entitlements, 'community.view');
  const canPost = hasFeature(entitlements, 'community.post');
  if (!canView) return { posts: [], comments: new Map(), canView, canPost };

  const { data: rows } = await supabase
    .from('community_posts')
    .select(COMMUNITY_POST_SELECT)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  const ids = (rows ?? []).map((r) => r.id);

  const [{ data: liked }, { data: commentRows }] = ids.length
    ? await Promise.all([
        supabase
          .from('community_reactions')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', ids),
        supabase
          .from('community_comments')
          .select(COMMUNITY_COMMENT_SELECT)
          .in('post_id', ids)
          .order('created_at'),
      ])
    : [{ data: [] }, { data: [] }];

  const likedIds = new Set((liked ?? []).map((l) => l.post_id));
  const comments = new Map<string, FeedComment[]>();
  for (const row of commentRows ?? []) {
    const c = toFeedComment(row);
    comments.set(c.postId, [...(comments.get(c.postId) ?? []), c]);
  }
  return { posts: (rows ?? []).map((r) => toFeedPost(r, likedIds)), comments, canView, canPost };
}
