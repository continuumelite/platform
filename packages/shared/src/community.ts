import { z } from 'zod';

import type { OrgRole } from './roles';

export const postBodySchema = z
  .string()
  .trim()
  .min(1, 'Write something first')
  .max(4000, 'Keep posts under 4,000 characters');
export const commentBodySchema = z
  .string()
  .trim()
  .min(1, 'Write something first')
  .max(2000, 'Keep comments under 2,000 characters');

/** The columns both apps select for the feed (Supabase select syntax). */
export const COMMUNITY_POST_SELECT =
  'id, body, pinned, hidden_at, author_id, author_role, created_at, author:profiles!community_posts_author_id_fkey(full_name), comments:community_comments(count), reactions:community_reactions(count)';

export const COMMUNITY_COMMENT_SELECT =
  'id, post_id, body, hidden_at, author_id, author_role, created_at, author:profiles(full_name)';

export type FeedPost = {
  id: string;
  body: string;
  pinned: boolean;
  hidden: boolean;
  authorId: string;
  authorName: string;
  /** Coach posts are highlighted. */
  fromCoach: boolean;
  createdAt: string;
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
};

export type FeedComment = {
  id: string;
  postId: string;
  body: string;
  hidden: boolean;
  authorId: string;
  authorName: string;
  fromCoach: boolean;
  createdAt: string;
};

type PostRow = {
  id: string;
  body: string;
  pinned: boolean;
  hidden_at: string | null;
  author_id: string;
  author_role: OrgRole;
  created_at: string;
  author: { full_name: string | null } | null;
  comments: { count: number }[];
  reactions: { count: number }[];
};

type CommentRow = {
  id: string;
  post_id: string;
  body: string;
  hidden_at: string | null;
  author_id: string;
  author_role: OrgRole;
  created_at: string;
  author: { full_name: string | null } | null;
};

const isCoach = (role: OrgRole) => role !== 'athlete';

export function toFeedPost(row: PostRow, likedPostIds: Set<string>): FeedPost {
  return {
    id: row.id,
    body: row.body,
    pinned: row.pinned,
    hidden: row.hidden_at != null,
    authorId: row.author_id,
    authorName: row.author?.full_name ?? 'Member',
    fromCoach: isCoach(row.author_role),
    createdAt: row.created_at,
    commentCount: row.comments[0]?.count ?? 0,
    likeCount: row.reactions[0]?.count ?? 0,
    likedByMe: likedPostIds.has(row.id),
  };
}

export function toFeedComment(row: CommentRow): FeedComment {
  return {
    id: row.id,
    postId: row.post_id,
    body: row.body,
    hidden: row.hidden_at != null,
    authorId: row.author_id,
    authorName: row.author?.full_name ?? 'Member',
    fromCoach: isCoach(row.author_role),
    createdAt: row.created_at,
  };
}

/** "just now", "5m", "3h", "2d", then a date. */
export function timeAgo(iso: string, now = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
