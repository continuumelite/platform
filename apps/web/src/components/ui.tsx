import type { ComponentProps } from 'react';

export const inputClass =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-slate-deep focus:ring-2 focus:ring-slate/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-slate';

export const buttonClass =
  'inline-flex items-center justify-center rounded-md bg-zinc-950 px-5 py-2.5 text-xs font-semibold tracking-[0.15em] text-zinc-50 uppercase hover:bg-slate-deep disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-slate';

export const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:border-slate-deep hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-slate dark:hover:text-zinc-50';

export function Field({ label, ...props }: ComponentProps<'input'> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <input className={inputClass} {...props} />
    </label>
  );
}

export function FormMessage({ state }: { state: { error?: string; message?: string } | null }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {state.error}
      </p>
    );
  }
  if (state?.message) {
    return <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>;
  }
  return null;
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${/\bp-\d/.test(className) ? '' : 'p-6'} ${className}`}
    >
      {children}
    </section>
  );
}
