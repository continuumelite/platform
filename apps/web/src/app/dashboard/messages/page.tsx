import { isCoachingRole, timeAgo } from '@continuum/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { AutoRefresh } from './live';

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading messages…</p>}>
      <Inbox />
    </Suspense>
  );
}

/** Coaches: one conversation per athlete, unread first. Athletes go straight to theirs. */
async function Inbox() {
  const user = await getCurrentUser();
  const membership = user.memberships[0];
  const supabase = await createClient();

  if (!membership || !isCoachingRole(membership.role)) {
    const { data: me } = await supabase
      .from('athlete_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (me) redirect(`/dashboard/messages/${me.id}`);
    redirect('/dashboard');
  }

  const [{ data: athletes }, { data: threads }] = await Promise.all([
    supabase.from('athlete_profiles').select('id, profile:profiles(full_name)'),
    supabase.rpc('my_unread_messages'),
  ]);
  const byAthlete = new Map((threads ?? []).map((t) => [t.athlete_profile_id, t]));
  const rows = (athletes ?? [])
    .map((a) => ({ ...a, thread: byAthlete.get(a.id) }))
    .sort(
      (a, b) =>
        (b.thread?.unread ?? 0) - (a.thread?.unread ?? 0) ||
        (b.thread?.last_message_at ?? '').localeCompare(a.thread?.last_message_at ?? ''),
    );

  return (
    <>
      <AutoRefresh seconds={20} />
      <div>
        <h1 className="text-4xl text-zinc-50">Messages</h1>
        <p className="mt-1 text-sm text-zinc-400">
          One conversation per athlete, shared with their other coaches.
        </p>
      </div>
      <Card className="p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No athletes yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {rows.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/dashboard/messages/${a.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-zinc-800/50"
                >
                  <span
                    className={`text-sm ${a.thread?.unread ? 'font-semibold text-zinc-50' : 'text-zinc-300'}`}
                  >
                    {a.profile?.full_name ?? 'Athlete'}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-zinc-500">
                    {a.thread?.last_message_at
                      ? timeAgo(a.thread.last_message_at)
                      : 'No messages yet'}
                    {a.thread?.unread ? (
                      <span className="rounded-full bg-signal px-2 py-0.5 font-semibold text-zinc-50">
                        {a.thread.unread}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
