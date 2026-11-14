import { describe, expect, it } from 'vitest';
import { newId, type ProgramDocument, type ProgramSession } from './programs';
import { daysBetween, isoDayOfWeek, locateInProgram, pickCurrentProgram } from './schedule';

const session = (name: string, dayOfWeek: number | null): ProgramSession => ({
  id: newId(),
  name,
  dayOfWeek,
  exercises: [],
});

// Two blocks: weeks 1–2 (Mon/Wed/Fri), then week 3 (Tue + one flexible session).
const doc: ProgramDocument = {
  name: 'Test',
  blocks: [
    {
      id: newId(),
      name: 'Build',
      weeks: [
        {
          id: newId(),
          isDeload: false,
          sessions: [session('Lower', 1), session('Upper', 3), session('Full', 5)],
        },
        {
          id: newId(),
          isDeload: false,
          sessions: [session('Lower', 1), session('Upper', 3), session('Full', 5)],
        },
      ],
    },
    {
      id: newId(),
      name: 'Deload',
      weeks: [
        { id: newId(), isDeload: true, sessions: [session('Easy', 2), session('Mobility', null)] },
      ],
    },
  ],
};

// 2026-11-09 is a Monday.
const start = '2026-11-09';

describe('dates', () => {
  it('counts calendar days, including across the DST change', () => {
    expect(daysBetween('2026-11-09', '2026-11-16')).toBe(7);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(daysBetween('2026-11-16', '2026-11-09')).toBe(-7);
  });

  it('gives ISO weekdays', () => {
    expect(isoDayOfWeek('2026-11-09')).toBe(1);
    expect(isoDayOfWeek('2026-11-15')).toBe(7);
  });
});

describe('locateInProgram', () => {
  it('finds today’s session', () => {
    const pos = locateInProgram(doc, start, '2026-11-11');
    expect(pos.status).toBe('in_progress');
    if (pos.status !== 'in_progress') return;
    expect(pos.weekNumber).toBe(1);
    expect(pos.totalWeeks).toBe(3);
    expect(pos.todaysSessions.map((s) => s.name)).toEqual(['Upper']);
    expect(pos.next?.session.name).toBe('Full');
  });

  it('treats a day with nothing scheduled as a rest day and points to the next session', () => {
    const pos = locateInProgram(doc, start, '2026-11-14'); // Saturday, week 1
    if (pos.status !== 'in_progress') throw new Error(pos.status);
    expect(pos.todaysSessions).toEqual([]);
    expect(pos.next).toMatchObject({ weekNumber: 2, dayOfWeek: 1 });
    expect(pos.next?.session.name).toBe('Lower');
  });

  it('moves into the next block and lists flexible sessions', () => {
    const pos = locateInProgram(doc, start, '2026-11-24'); // Tuesday, week 3
    if (pos.status !== 'in_progress') throw new Error(pos.status);
    expect(pos.weekNumber).toBe(3);
    expect(pos.blockName).toBe('Deload');
    expect(pos.todaysSessions.map((s) => s.name)).toEqual(['Easy']);
    expect(pos.flexibleSessions.map((s) => s.name)).toEqual(['Mobility']);
    expect(pos.next).toBeNull();
  });

  it('knows when the program hasn’t started or has finished', () => {
    expect(locateInProgram(doc, start, '2026-11-06')).toEqual({
      status: 'not_started',
      startsInDays: 3,
    });
    expect(locateInProgram(doc, start, '2026-11-30')).toEqual({ status: 'finished' });
    expect(locateInProgram(doc, null, '2026-11-30')).toEqual({ status: 'no_start_date' });
  });
});

describe('pickCurrentProgram', () => {
  const programs = [
    { id: 'old', startDate: '2026-10-01' },
    { id: 'current', startDate: '2026-11-09' },
    { id: 'upcoming', startDate: '2026-11-16' },
  ];

  it('picks the most recently started program', () => {
    expect(pickCurrentProgram(programs, '2026-11-14')?.id).toBe('current');
  });

  it('falls back to the soonest upcoming one', () => {
    expect(pickCurrentProgram(programs.slice(2), '2026-11-14')?.id).toBe('upcoming');
    expect(pickCurrentProgram([], '2026-11-14')).toBeNull();
  });
});
