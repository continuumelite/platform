import {
  DAYS_OF_WEEK,
  describePrescription,
  localDateString,
  locateInProgram,
} from '@continuum/shared';
import Link from 'next/link';
import { Suspense } from 'react';
import { completedSessions, getAthleteContext } from '@/lib/athlete';
import { Card, secondaryButtonClass } from '@/components/ui';

export default function TrainingPage({ searchParams }: PageProps<'/dashboard/training'>) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading your program…</p>}>
      <Training searchParams={searchParams} />
    </Suspense>
  );
}

function weekStart(startDate: string, index: number) {
  const d = new Date(`${startDate}T00:00`);
  d.setDate(d.getDate() + index * 7);
  return d;
}

async function Training({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { week: weekParam } = await searchParams;
  const ctx = await getAthleteContext();
  const { program } = ctx;
  if (!program) {
    return (
      <>
        <h1 className="text-4xl text-zinc-50">Training</h1>
        <Card>
          <p className="text-sm text-zinc-400">
            No program yet. Once your coach assigns one, it shows here.
          </p>
        </Card>
      </>
    );
  }

  const today = localDateString();
  const position = locateInProgram(program.document, program.startDate, today);
  const weeks = program.document.blocks.flatMap((b) =>
    b.weeks.map((w) => ({ week: w, blockName: b.name })),
  );
  const current = position.status === 'in_progress' ? position.weekNumber - 1 : 0;
  const requested = Number(weekParam);
  const index =
    Number.isInteger(requested) && requested >= 1 && requested <= weeks.length
      ? requested - 1
      : current;
  const entry = weeks[index];
  const completed = await completedSessions(ctx.athleteProfileId, program);
  const isCurrent = position.status === 'in_progress' && index === current;
  const start = program.startDate ? weekStart(program.startDate, index) : null;
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <>
      <div>
        <h1 className="text-4xl text-zinc-50">Training</h1>
        <p className="mt-1 text-zinc-300 italic">{program.name}</p>
      </div>

      <nav
        className="flex items-center justify-between border-y border-zinc-800 py-3"
        aria-label="Weeks"
      >
        {index > 0 ? (
          <Link href={`?week=${index}`} className={secondaryButtonClass} aria-label="Previous week">
            ←
          </Link>
        ) : (
          <span />
        )}
        <div className="text-center">
          <p
            className={`text-xs tracking-[0.2em] uppercase ${isCurrent ? 'text-signal' : 'text-zinc-400'}`}
          >
            {isCurrent ? 'This week' : entry?.blockName}
            {entry?.week.isDeload ? ' · Deload' : ''}
          </p>
          <p className="font-display text-3xl tracking-wide">
            Week {index + 1} of {weeks.length}
          </p>
          <p className="text-xs text-zinc-400">
            {start ? `${fmt(start)} – ${fmt(new Date(start.getTime() + 6 * 86_400_000))} · ` : ''}
            {entry?.week.sessions.filter((s) => completed.has(s.id)).length ?? 0}/
            {entry?.week.sessions.length ?? 0} done
          </p>
        </div>
        {index < weeks.length - 1 ? (
          <Link href={`?week=${index + 2}`} className={secondaryButtonClass} aria-label="Next week">
            →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {entry?.week.sessions.length === 0 && (
        <p className="text-sm text-zinc-500">No sessions this week.</p>
      )}
      {[...(entry?.week.sessions ?? [])]
        .sort((a, b) => (a.dayOfWeek ?? 8) - (b.dayOfWeek ?? 8))
        .map((s) => {
          const done = completed.get(s.id);
          const isToday =
            isCurrent && position.status === 'in_progress' && s.dayOfWeek === position.today;
          return (
            <details
              key={s.id}
              open={isToday}
              className="group rounded-lg border border-zinc-800 bg-zinc-900"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4">
                <span
                  className={`w-12 rounded border py-1 text-center text-xs tracking-[0.15em] uppercase ${
                    isToday ? 'border-signal text-signal' : 'border-zinc-700 text-zinc-400'
                  }`}
                >
                  {s.dayOfWeek ? DAYS_OF_WEEK[s.dayOfWeek - 1] : 'Any'}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{s.name || 'Session'}</span>
                  <span className="text-xs text-zinc-400">
                    {isToday ? 'Today · ' : ''}
                    {s.exercises.length} exercise{s.exercises.length === 1 ? '' : 's'}
                  </span>
                </span>
                {done && (
                  <span className="text-cream" aria-label="Done">
                    ✓
                  </span>
                )}
                <span className="text-zinc-500 transition group-open:rotate-180">⌄</span>
              </summary>
              <div className="flex flex-col gap-3 border-t border-zinc-800 px-5 py-4">
                {s.notes && <p className="text-sm text-zinc-300">{s.notes}</p>}
                <ol className="flex flex-col gap-2 text-sm">
                  {s.exercises.map((e, i) => (
                    <li key={e.id} className="flex gap-3">
                      <span className="w-5 text-zinc-500">{i + 1}.</span>
                      <span className="flex-1">
                        <span className="font-medium">
                          {program.exercises.get(e.exerciseId)?.name ?? 'Exercise'}
                        </span>
                        <span className="block text-zinc-400">{describePrescription(e)}</span>
                        {e.notes && <span className="block text-xs text-zinc-500">{e.notes}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
                <Link
                  href={`/dashboard/training/${s.id}?date=${done ?? today}`}
                  className={`${secondaryButtonClass} self-start`}
                >
                  {done ? 'View workout ✓' : 'Log workout'}
                </Link>
              </div>
            </details>
          );
        })}

      {entry?.week.notes && (
        <Card>
          <p className="text-xs tracking-[0.2em] text-zinc-400 uppercase">This week</p>
          <p className="mt-2 text-sm">{entry.week.notes}</p>
        </Card>
      )}
      {program.document.description && (
        <Card>
          <p className="text-xs tracking-[0.2em] text-zinc-400 uppercase">From your coach</p>
          <p className="mt-2 text-sm">{program.document.description}</p>
        </Card>
      )}
    </>
  );
}
