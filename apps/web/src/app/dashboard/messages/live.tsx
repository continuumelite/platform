'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { markThreadRead } from './actions';

/** Refreshes the page every few seconds while it's visible, so new messages appear. */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

/** Marks the conversation read once it's on screen, and keeps the view scrolled to the end. */
export function ConversationEffects({ threadId, count }: { threadId: string; count: number }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void markThreadRead(threadId);
    end.current?.scrollIntoView({ block: 'end' });
  }, [threadId, count]);
  return <div ref={end} />;
}
