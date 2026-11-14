import Link from 'next/link';
import { buttonClass } from '@/components/ui';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Continuum Elite
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Personalized training and nutrition coaching, built around your coach.
      </p>
      <Link href="/login" className={buttonClass}>
        Sign in
      </Link>
    </main>
  );
}
