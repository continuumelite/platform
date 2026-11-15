import { Suspense } from 'react';
import { isCoachingRole } from '@continuum/shared';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { signOut } from '../actions';
import { ATHLETE_LINKS, COACH_LINKS, NavLinks } from './nav-links';

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-800 bg-ink text-zinc-50">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Suspense fallback={<HeaderSkeleton />}>
            <HeaderContent />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">{children}</main>
    </div>
  );
}

function HeaderSkeleton() {
  return <Wordmark size="sm" />;
}

async function HeaderContent() {
  const user = await getCurrentUser();
  const membership = user.memberships[0];
  const isCoach = membership ? isCoachingRole(membership.role) : false;

  return (
    <>
      <div className="flex items-center gap-6">
        <Link href="/dashboard" aria-label="Continuum Elite home">
          <Wordmark size="sm" />
        </Link>
        {membership && <NavLinks links={isCoach ? COACH_LINKS : ATHLETE_LINKS} />}
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/account"
          className="hidden text-sm text-zinc-400 hover:text-zinc-50 sm:inline"
          title="Account"
        >
          {user.fullName ?? user.email}
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold tracking-[0.15em] text-zinc-300 uppercase hover:border-slate hover:text-zinc-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
