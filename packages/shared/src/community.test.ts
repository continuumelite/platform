import { describe, expect, it } from 'vitest';

import { postBodySchema, timeAgo, toFeedPost } from './community';

describe('community', () => {
  it('trims and limits post bodies', () => {
    expect(postBodySchema.parse('  hi  ')).toBe('hi');
    expect(postBodySchema.safeParse('   ').success).toBe(false);
    expect(postBodySchema.safeParse('x'.repeat(4001)).success).toBe(false);
  });

  it('marks coach posts and counts', () => {
    const post = toFeedPost(
      {
        id: 'p1',
        body: 'Hello',
        pinned: true,
        hidden_at: null,
        author_id: 'u1',
        author_role: 'head_coach',
        created_at: '2026-11-14T10:00:00Z',
        author: { full_name: 'Sam Coach' },
        comments: [{ count: 2 }],
        reactions: [{ count: 5 }],
      },
      new Set(['p1']),
    );
    expect(post).toMatchObject({ fromCoach: true, commentCount: 2, likeCount: 5, likedByMe: true });
  });

  it('formats relative times', () => {
    const now = new Date('2026-11-14T12:00:00Z');
    expect(timeAgo('2026-11-14T11:59:30Z', now)).toBe('just now');
    expect(timeAgo('2026-11-14T11:55:00Z', now)).toBe('5m');
    expect(timeAgo('2026-11-14T09:00:00Z', now)).toBe('3h');
    expect(timeAgo('2026-11-12T12:00:00Z', now)).toBe('2d');
  });
});
