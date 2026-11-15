import { isCoachingRole, timeAgo, type FeedComment, type FeedPost } from '@continuum/shared';
import Link from 'next/link';
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { fetchFeed } from '@/lib/community';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import {
  deleteComment,
  deletePost,
  reportPost,
  resolveReport,
  setHidden,
  setPinned,
  toggleLike,
} from './actions';
import { CommentForm, PostComposer } from './forms';

export default function CommunityPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading the feed…</p>}>
      <Community />
    </Suspense>
  );
}

async function Community() {
  const user = await getCurrentUser();
  const membership = user.memberships[0];
  const staff = membership ? isCoachingRole(membership.role) : false;
  const feed = await fetchFeed(user.id);

  return (
    <>
      <div>
        <h1 className="text-4xl text-zinc-50">Community</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Everyone at {membership?.organizationName ?? 'Continuum'}: wins, questions and news. Coach
          posts are highlighted.
        </p>
      </div>

      {!feed.canView ? (
        <Card>
          <p className="text-sm text-zinc-400">
            The community isn’t included in your plan. Ask your coach about upgrading.
          </p>
        </Card>
      ) : (
        <>
          {staff && <Reports />}
          {feed.canPost ? (
            <PostComposer />
          ) : (
            <p className="text-sm text-zinc-500">Your plan lets you read the feed but not post.</p>
          )}
          {feed.posts.length === 0 && (
            <p className="text-sm text-zinc-500">No posts yet. Say hello!</p>
          )}
          {feed.posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              comments={feed.comments.get(post.id) ?? []}
              userId={user.id}
              staff={staff}
              canPost={feed.canPost}
            />
          ))}
        </>
      )}
    </>
  );
}

function PostCard({
  post,
  comments,
  userId,
  staff,
  canPost,
}: {
  post: FeedPost;
  comments: FeedComment[];
  userId: string;
  staff: boolean;
  canPost: boolean;
}) {
  const mine = post.authorId === userId;
  return (
    <article
      className={`rounded-lg border p-5 ${
        post.fromCoach
          ? 'border-cream/40 bg-zinc-900 shadow-[inset_3px_0_0_var(--color-cream)]'
          : 'border-zinc-800 bg-zinc-900'
      } ${post.hidden ? 'opacity-60' : ''}`}
    >
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-zinc-50">{post.authorName}</span>
        {post.fromCoach && (
          <span className="rounded bg-cream px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.15em] text-zinc-950 uppercase">
            Coach
          </span>
        )}
        {post.pinned && (
          <span className="text-xs tracking-[0.15em] text-signal uppercase">Pinned</span>
        )}
        {post.hidden && (
          <span className="text-xs tracking-[0.15em] text-zinc-400 uppercase">Hidden</span>
        )}
        <span className="text-xs text-zinc-500">{timeAgo(post.createdAt)}</span>
      </header>
      <p className="mt-2 text-[0.95rem] whitespace-pre-wrap text-zinc-100">{post.body}</p>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
        <form action={toggleLike.bind(null, post.id, post.likedByMe)}>
          <button
            type="submit"
            aria-pressed={post.likedByMe}
            className={`hover:text-zinc-50 ${post.likedByMe ? 'text-signal' : ''}`}
          >
            {post.likedByMe ? '♥' : '♡'} {post.likeCount}
          </button>
        </form>
        <span>
          {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
        </span>
        <span className="flex-1" />
        {staff && (
          <>
            <ActionButton action={setPinned.bind(null, post.id, !post.pinned)}>
              {post.pinned ? 'Unpin' : 'Pin'}
            </ActionButton>
            <ActionButton action={setHidden.bind(null, post.id, !post.hidden)}>
              {post.hidden ? 'Unhide' : 'Hide'}
            </ActionButton>
          </>
        )}
        {(mine || staff) && (
          <ActionButton action={deletePost.bind(null, post.id)}>Delete</ActionButton>
        )}
        {!mine && !staff && (
          <ActionButton action={reportPost.bind(null, post.id)}>Report</ActionButton>
        )}
      </div>

      {(comments.length > 0 || canPost) && (
        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-800 pt-3">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-semibold text-zinc-50">{c.authorName}</span>
              {c.fromCoach && <span className="ml-1.5 text-xs text-cream">Coach</span>}
              <span className="ml-2 text-xs text-zinc-500">{timeAgo(c.createdAt)}</span>
              {(c.authorId === userId || staff) && (
                <form action={deleteComment.bind(null, c.id)} className="ml-2 inline">
                  <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-50">
                    Delete
                  </button>
                </form>
              )}
              <p className="whitespace-pre-wrap text-zinc-300">{c.body}</p>
            </div>
          ))}
          {canPost && !post.hidden && <CommentForm postId={post.id} />}
        </div>
      )}
    </article>
  );
}

function ActionButton({ action, children }: { action: () => Promise<void>; children: string }) {
  return (
    <form action={action}>
      <button type="submit" className="hover:text-zinc-50">
        {children}
      </button>
    </form>
  );
}

/** Open reports, for coaches. */
async function Reports() {
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from('community_reports')
    .select('id, post_id, created_at, reporter:profiles(full_name), post:community_posts(body)')
    .is('resolved_at', null)
    .order('created_at', { ascending: false });
  if (!reports?.length) return null;

  return (
    <Card className="border-signal/50">
      <h2 className="text-sm font-semibold">
        {reports.length} open report{reports.length === 1 ? '' : 's'}
      </h2>
      <ul className="mt-2 flex flex-col gap-2 text-sm">
        {reports.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3">
            <span className="text-zinc-400">
              {r.reporter?.full_name ?? 'A member'} reported: “
              <span className="text-zinc-200">{r.post?.body.slice(0, 120)}</span>”
            </span>
            <form action={resolveReport.bind(null, r.id)}>
              <button type="submit" className="text-xs text-zinc-400 hover:text-zinc-50">
                Mark resolved
              </button>
            </form>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-zinc-500">
        Hide or delete the post below if it breaks the rules, then mark the report resolved.{' '}
        <Link href="#top" className="underline">
          Back to top
        </Link>
      </p>
    </Card>
  );
}
