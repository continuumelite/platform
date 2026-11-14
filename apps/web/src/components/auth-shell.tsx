import type { ReactNode } from 'react';
import { ValuesGrid, ValuesLine, Wordmark } from './brand';

/** Split layout for sign-in and invitations: the brand panel on the left, the form on the right. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid flex-1 lg:grid-cols-2">
      <aside className="flex flex-col justify-between gap-10 bg-ink px-6 py-8 text-zinc-50 sm:px-10 lg:py-12">
        <Wordmark size="sm" />
        <div className="hidden lg:block">
          <ValuesGrid className="max-w-sm text-zinc-400" />
          <p className="mt-10 font-serif text-lg italic">Continuum Elite</p>
          <p className="font-serif text-5xl leading-tight font-semibold text-slate">
            Consistency,
            <br />
            compounded.
          </p>
        </div>
        <ValuesLine className="hidden text-zinc-500 lg:flex" />
      </aside>
      <div className="flex items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
