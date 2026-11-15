'use client';

import { useActionState, useRef } from 'react';
import { buttonClass, FormMessage, inputClass, secondaryButtonClass } from '@/components/ui';
import { createComment, createPost } from './actions';

export function PostComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: Parameters<typeof createPost>[0], data: FormData) => {
      const result = await createPost(prev, data);
      if (!result?.error) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <label htmlFor="new-post" className="sr-only">
        New post
      </label>
      <textarea
        id="new-post"
        name="body"
        rows={3}
        maxLength={4000}
        required
        placeholder="Share a win, ask a question…"
        className={`${inputClass} resize-y`}
      />
      <div className="flex items-center gap-3">
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? 'Posting…' : 'Post'}
        </button>
        <FormMessage state={state?.error ? state : null} />
      </div>
    </form>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: Parameters<typeof createPost>[0], data: FormData) => {
      const result = await createComment(postId, prev, data);
      if (!result?.error) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="body"
        aria-label="Write a comment"
        placeholder="Write a comment…"
        maxLength={2000}
        required
        className={`${inputClass} flex-1 py-1.5`}
      />
      <button type="submit" className={secondaryButtonClass} disabled={pending}>
        Reply
      </button>
      <FormMessage state={state} />
    </form>
  );
}
