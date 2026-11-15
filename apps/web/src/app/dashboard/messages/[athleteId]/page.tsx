import { isCoachingRole, MESSAGE_SELECT, timeAgo, toChatMessage } from '@continuum/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { AutoRefresh, ConversationEffects } from '../live';
import { SendForm } from '../send-form';

export default function ConversationPage({ params }: PageProps<'/dashboard/messages/[athleteId]'>) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading conversation…</p>}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  if (!z.guid().safeParse(athleteId).success) notFound();
  const user = await getCurrentUser();
  const staff = user.memberships[0] ? isCoachingRole(user.memberships[0].role) : false;
  const supabase = await createClient();

  const { data: threadId, error } = await supabase.rpc('get_message_thread', {
    target_athlete_profile_id: athleteId,
  });
  if (error || !threadId) notFound();

  const [{ data: athlete }, { data: rows }] = await Promise.all([
    supabase
      .from('athlete_profiles')
      .select('profile:profiles(full_name)')
      .eq('id', athleteId)
      .maybeSingle(),
    supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('thread_id', threadId)
      .order('created_at')
      .limit(500),
  ]);
  const messages = (rows ?? []).map(toChatMessage);
  const name = athlete?.profile?.full_name ?? 'Athlete';

  return (
    <>
      <AutoRefresh seconds={8} />
      {staff && (
        <Link href="/dashboard/messages" className="text-sm text-zinc-500 hover:underline">
          ← Messages
        </Link>
      )}
      <h1 className="text-4xl text-zinc-50">{staff ? name : 'Your coaches'}</h1>
      <Card className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            {staff
              ? `No messages yet. Say hello to ${name.split(' ')[0]}.`
              : 'Ask your coaches anything here.'}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : ''}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? 'bg-cream text-zinc-950' : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                {!mine && <p className="text-xs text-cream">{m.senderName}</p>}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p
                  className={`mt-0.5 text-right text-[0.7rem] ${mine ? 'text-zinc-600' : 'text-zinc-500'}`}
                >
                  {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <ConversationEffects threadId={threadId} count={messages.length} />
      </Card>
      <SendForm
        threadId={threadId}
        athleteId={athleteId}
        placeholder={
          staff ? `Message ${name.split(' ')[0]}… (⌘↵ to send)` : 'Message your coaches…'
        }
      />
    </>
  );
}
