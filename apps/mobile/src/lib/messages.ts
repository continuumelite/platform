import { MESSAGE_SELECT, toChatMessage, type ChatMessage } from '@continuum/shared';

import { supabase } from './supabase';

export async function getThread(athleteProfileId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_message_thread', {
    target_athlete_profile_id: athleteProfileId,
  });
  if (error || !data) throw error ?? new Error('No thread');
  return data;
}

export async function fetchMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('thread_id', threadId)
    .order('created_at')
    .limit(500);
  if (error) throw error;
  return data.map(toChatMessage);
}

export async function sendMessage(message: {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
}) {
  return supabase.from('messages').insert({
    id: message.id,
    thread_id: message.threadId,
    sender_id: message.senderId,
    body: message.body,
  });
}

export async function markRead(threadId: string, userId: string) {
  await supabase
    .from('message_reads')
    .upsert({ thread_id: threadId, user_id: userId, last_read_at: new Date().toISOString() });
}

export async function unreadCount(): Promise<number> {
  const { data } = await supabase.rpc('my_unread_messages');
  return (data ?? []).reduce((n, t) => n + t.unread, 0);
}

/** Calls back whenever a message arrives in the thread. Returns an unsubscribe function. */
export function subscribeToThread(threadId: string, onMessage: () => void) {
  const channel = supabase
    .channel(`thread:${threadId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
      onMessage,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
