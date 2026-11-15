import type { ProgramDocument, ProgramSession, ProgramWeek } from './programs';

/**
 * Working out where an athlete is in their program on a given day.
 * Dates are calendar dates ("YYYY-MM-DD") in the athlete's own time zone.
 */

/** Today's date as YYYY-MM-DD in the device's time zone. */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). Calendar-based, so DST never shifts it. */
export function daysBetween(from: string, to: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y!, m! - 1, d!);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** ISO day of week for a YYYY-MM-DD date: 1 = Monday … 7 = Sunday (matches session.dayOfWeek). */
export function isoDayOfWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return day === 0 ? 7 : day;
}

type Dated = { startDate: string | null };

/**
 * Which of an athlete's active programs is "current" today: the one that started most recently
 * (on or before today); if none has started, the one starting soonest.
 */
export function pickCurrentProgram<T extends Dated>(programs: T[], today: string): T | null {
  const dated = programs.filter((p): p is T & { startDate: string } => Boolean(p.startDate));
  // YYYY-MM-DD strings sort chronologically.
  const started = dated
    .filter((p) => p.startDate <= today)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (started[0]) return started[0];
  const upcoming = dated.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return upcoming[0] ?? programs[0] ?? null;
}

export type ProgramPosition =
  | { status: 'not_started'; startsInDays: number }
  | { status: 'finished' }
  | { status: 'no_start_date' }
  | {
      status: 'in_progress';
      /** 1-based, counted across blocks. */
      weekNumber: number;
      totalWeeks: number;
      blockName: string;
      week: ProgramWeek;
      /** 1 = Monday … 7 = Sunday. */
      today: number;
      /** Sessions scheduled for today (several are possible, e.g. AM/PM). */
      todaysSessions: ProgramSession[];
      /** Sessions this week with no fixed day, for the athlete to fit in. */
      flexibleSessions: ProgramSession[];
      /** The next scheduled session after today, this week or a later one. */
      next: { session: ProgramSession; weekNumber: number; dayOfWeek: number } | null;
    };

/**
 * Where the athlete is in the program today. Week 1 starts on the program's start date;
 * each later week starts 7 days after the one before.
 */
export function locateInProgram(
  doc: ProgramDocument,
  startDate: string | null,
  today: string,
): ProgramPosition {
  if (!startDate) return { status: 'no_start_date' };

  const offset = daysBetween(startDate, today);
  if (offset < 0) return { status: 'not_started', startsInDays: -offset };

  const weeks = doc.blocks.flatMap((block) =>
    block.weeks.map((week) => ({ week, blockName: block.name })),
  );
  const index = Math.floor(offset / 7);
  const current = weeks[index];
  if (!current) return { status: 'finished' };

  // Days are counted from the program's start, so a program starting on a Wednesday has
  // "day 1" on Wednesday. Sessions are pinned to real weekdays, so use the calendar weekday.
  const todayDow = isoDayOfWeek(today);
  const scheduled = (w: ProgramWeek) => w.sessions.filter((s) => s.dayOfWeek != null);

  const todaysSessions = current.week.sessions.filter((s) => s.dayOfWeek === todayDow);
  const flexibleSessions = current.week.sessions.filter((s) => s.dayOfWeek == null);

  let next: { session: ProgramSession; weekNumber: number; dayOfWeek: number } | null = null;
  const laterThisWeek = scheduled(current.week)
    .filter((s) => s.dayOfWeek! > todayDow)
    .sort((a, b) => a.dayOfWeek! - b.dayOfWeek!)[0];
  if (laterThisWeek) {
    next = { session: laterThisWeek, weekNumber: index + 1, dayOfWeek: laterThisWeek.dayOfWeek! };
  } else {
    for (let i = index + 1; i < weeks.length && !next; i++) {
      const first = scheduled(weeks[i]!.week).sort((a, b) => a.dayOfWeek! - b.dayOfWeek!)[0];
      if (first) next = { session: first, weekNumber: i + 1, dayOfWeek: first.dayOfWeek! };
    }
  }

  return {
    status: 'in_progress',
    weekNumber: index + 1,
    totalWeeks: weeks.length,
    blockName: current.blockName,
    week: current.week,
    today: todayDow,
    todaysSessions,
    flexibleSessions,
    next,
  };
}
