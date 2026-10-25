import { estimateOneRepMax } from '@continuum/shared';

export default function Home() {
  const example = estimateOneRepMax(100, 5);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Continuum Elite
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">Coach dashboard — coming soon.</p>
      <p className="text-sm text-zinc-500">
        Shared package check: 100 × 5 → estimated 1RM {example}
      </p>
    </main>
  );
}
