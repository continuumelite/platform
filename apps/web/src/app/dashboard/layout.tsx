import { Suspense } from 'react';
import { isCoachingRole } from '@continuum/shared';
import { getCurrentUser } from '@/lib/auth';
import { secondaryButtonClass } from '@/components/ui';
import { signOut } from '../actions';
import { NavLinks } from './nav-links';

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
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
  return <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Continuum Elite</p>;
}

async function HeaderContent() {
  const user = await getCurrentUser();
  const membership = user.memberships[0];
  const isCoach = membership ? isCoachingRole(membership.role) : false;

  return (
    <>
      <div className="flex items-center gap-6">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Continuum Elite</p>
          {membership && <p className="text-xs text-zinc-500">{membership.organizationName}</p>}
        </div>
        {isCoach && <NavLinks />}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-zinc-600 sm:inline dark:text-zinc-400">
          {user.fullName ?? user.email}
        </span>
        <form action={signOut}>
          <button type="submit" className={secondaryButtonClass}>
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
