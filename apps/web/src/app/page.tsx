import Link from 'next/link';
import { ValuesGrid, ValuesLine, Wordmark } from '@/components/brand';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-ink text-zinc-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark size="sm" />
        <Link
          href="/login"
          className="text-xs font-semibold tracking-[0.2em] text-zinc-400 uppercase hover:text-zinc-50"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-6 py-16">
        <ValuesGrid className="max-w-md text-zinc-400" />
        <div>
          <p className="text-xl text-zinc-50 italic">Continuum Elite</p>
          <h1 className="mt-2 text-5xl leading-[1.05] text-cream uppercase sm:text-7xl">
            Run. Bike. Swim.
            <br />
            Keep going.
          </h1>
          <p className="mt-6 max-w-lg text-zinc-400">
            One-to-one coaching. Your program, your nutrition and your watch data in one place,
            built around how you train.
          </p>
        </div>
        <div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-zinc-50 px-6 py-3 text-xs font-semibold tracking-[0.2em] text-zinc-950 uppercase hover:bg-slate"
          >
            Sign in
          </Link>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-8">
        <div className="border-t border-zinc-700 pt-4 text-zinc-500">
          <ValuesLine />
        </div>
      </footer>
    </main>
  );
}
