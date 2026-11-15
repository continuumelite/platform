import { z } from 'zod';

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, 'Write a message first')
  .max(4000, 'Keep messages under 4,000 characters');

export const MESSAGE_SELECT =
  'id, thread_id, sender_id, body, created_at, sender:profiles(full_name)';

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export function toChatMessage(row: {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender: { full_name: string | null } | null;
}): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    senderName: row.sender?.full_name ?? 'Member',
    body: row.body,
    createdAt: row.created_at,
  };
}

/** A friendly reason for a failed send (the database explains limits and plan locks). */
export function messageErrorText(error: { code?: string; message?: string } | null): string {
  if (error?.code === 'P0002' || error?.code === '42501') return error.message ?? 'Couldn’t send.';
  return 'Couldn’t send. Check your connection and try again.';
}
