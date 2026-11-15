import type { ReactNode } from 'react';
import { Logo, Wordmark } from './brand';

/** Split layout for sign-in and invitations: the brand panel on the left, the form on the right. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid flex-1 lg:grid-cols-2">
      <aside className="flex flex-col justify-between gap-10 bg-ink px-6 py-8 text-zinc-50 sm:px-10 lg:py-12">
        <Wordmark className="lg:invisible" />
        <div className="hidden justify-center lg:flex">
          <Logo className="text-zinc-50 [&_p]:text-zinc-400" />
        </div>
        <p className="hidden text-lg text-zinc-400 italic lg:block">Continuum Elite</p>
      </aside>
      <div className="flex items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
