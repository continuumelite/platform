import Link from 'next/link';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { isCoachingRole } from '@continuum/shared';
import { getCurrentUser, type CurrentUser, type Membership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, secondaryButtonClass } from '@/components/ui';
import { revokeInvitation } from '../actions';
import { InviteForm } from './invite-form';
import { CopyLink } from './copy-link';

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await getCurrentUser();
  const membership = user.memberships[0];

  if (!membership) {
    return (
      <Card>
        <h1 className="text-2xl">You’re not part of a coaching team yet</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Ask your coach for an invitation link.
        </p>
      </Card>
    );
  }

  return isCoachingRole(membership.role) ? (
    <CoachDashboard user={user} membership={membership} />
  ) : (
    <AthleteHome user={user} />
  );
}

async function CoachDashboard({ user, membership }: { user: CurrentUser; membership: Membership }) {
  const supabase = await createClient();
  const origin = (await headers()).get('origin') ?? `http://${(await headers()).get('host')}`;

  const [{ data: athletes }, { data: invitations }] = await Promise.all([
    supabase
      .from('athlete_profiles')
      .select('id, goals, profile:profiles(full_name), coaches:coach_athletes(role, coach_user_id)')
      .eq('organization_id', membership.organizationId)
      .order('created_at'),
    supabase
      .from('invitations')
      .select('id, email, token, expires_at')
      .eq('organization_id', membership.organizationId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <>
      <div>
        <h1 className="text-4xl text-zinc-900 dark:text-zinc-50">
          Welcome, {user.fullName?.split(' ')[0] ?? 'coach'}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {athletes?.length ?? 0} athlete{athletes?.length === 1 ? '' : 's'}
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold">Athletes</h2>
        {athletes?.length ? (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {athletes.map((a) => {
              const isMine = a.coaches.some((c) => c.coach_user_id === user.id);
              return (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <Link href={`/dashboard/athletes/${a.id}`} className="group">
                    <p className="text-sm font-medium group-hover:underline">
                      {a.profile?.full_name ?? 'Unnamed athlete'}
                    </p>
                    <p className="text-xs text-zinc-500">{a.goals ?? 'No goals set yet'}</p>
                  </Link>
                  <div className="flex items-center gap-2">
                    {isMine && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        Your athlete
                      </span>
                    )}
                    <Link href={`/dashboard/athletes/${a.id}`} className={secondaryButtonClass}>
                      Workouts
                    </Link>
                    <Link
                      href={`/dashboard/programs?athlete=${a.id}`}
                      className={secondaryButtonClass}
                    >
                      Programs
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            No athletes yet. Invite your first one below.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Invite an athlete</h2>
        <p className="mt-1 text-sm text-zinc-500">
          They’ll get a link to create their account, and you’ll be their primary coach.
        </p>
        <InviteForm organizationId={membership.organizationId} />

        {invitations && invitations.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Waiting to join
            </h3>
            <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm">{inv.email}</p>
                    <p className="text-xs text-zinc-500">
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <CopyLink url={`${origin}/invite/${inv.token}`} />
                    <form action={revokeInvitation}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button type="submit" className={secondaryButtonClass}>
                        Revoke
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </>
  );
}

async function AthleteHome({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('athlete_profiles')
    .select('goals, coaches:coach_athletes(role, coach:profiles(full_name))')
    .eq('user_id', user.id)
    .maybeSingle();

  const primary = profile?.coaches.find((c) => c.role === 'primary');

  return (
    <Card>
      <h1 className="text-4xl">Hi {user.fullName?.split(' ')[0] ?? 'there'}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {primary?.coach?.full_name ? `Your coach is ${primary.coach.full_name}. ` : ''}
        Your training plan and logging live in the Continuum Elite mobile app.
      </p>
      {profile?.goals && <p className="mt-4 text-sm">Goal: {profile.goals}</p>}
    </Card>
  );
}
