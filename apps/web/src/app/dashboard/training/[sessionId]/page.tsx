import {
  localDateString,
  SET_LOG_COLUMNS,
  setLogFromRow,
  type SetLogRow,
  type WorkoutDocument,
} from '@continuum/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { canUse, getAthleteContext } from '@/lib/athlete';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { WorkoutForm, type ExerciseLine } from './workout-form';

export default function LogWorkoutPage({
  params,
  searchParams,
}: PageProps<'/dashboard/training/[sessionId]'>) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading the session…</p>}>
      <LogWorkout params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function LogWorkout({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionId } = await params;
  const { date: dateParam } = await searchParams;
  if (!z.guid().safeParse(sessionId).success) notFound();
  const date = z.iso.date().safeParse(dateParam).data ?? localDateString();

  const ctx = await getAthleteContext();
  const session = ctx.program?.document.blocks
    .flatMap((b) => b.weeks.flatMap((w) => w.sessions))
    .find((s) => s.id === sessionId);
  if (!ctx.program || !session) notFound();

  const supabase = await createClient();
  const { data: saved } = await supabase
    .from('workout_logs')
    .select(
      `id, updated_at, session_name, performed_on, started_at, completed_at, rpe, notes, sets:set_logs(${SET_LOG_COLUMNS})`,
    )
    .eq('athlete_profile_id', ctx.athleteProfileId)
    .eq('session_id', sessionId)
    .eq('performed_on', date)
    .maybeSingle();

  const existing: WorkoutDocument | null = saved
    ? {
        id: saved.id,
        athleteProfileId: ctx.athleteProfileId,
        sessionId,
        sessionName: saved.session_name,
        performedOn: saved.performed_on,
        startedAt: saved.started_at,
        completedAt: saved.completed_at,
        rpe: saved.rpe == null ? null : Number(saved.rpe),
        notes: saved.notes,
        sets: (saved.sets as SetLogRow[])
          .map(setLogFromRow)
          .sort((a, b) => a.position - b.position),
      }
    : null;

  const lines: ExerciseLine[] = session.exercises.map((p) => {
    const info = ctx.program!.exercises.get(p.exerciseId);
    return {
      prescription: p,
      name: info?.name ?? 'Exercise',
      tracking: info?.tracking ?? 'weight_reps',
    };
  });

  return (
    <>
      <Link href="/dashboard/training" className="text-sm text-zinc-500 hover:underline">
        ← Training
      </Link>
      <div>
        <p className="text-sm text-zinc-400">
          {new Date(`${date}T00:00`).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="text-4xl text-zinc-50">{session.name || 'Session'}</h1>
        {session.notes && <p className="mt-1 text-sm text-zinc-300">{session.notes}</p>}
      </div>
      {!canUse(ctx.entitlements, 'training.logging') ? (
        <Card>
          <p className="text-sm text-zinc-400">
            Workout logging isn’t included in your plan. Ask your coach about upgrading.
          </p>
        </Card>
      ) : (
        <WorkoutForm
          // Remount when the saved workout changes: Next keeps a visited page's state alive.
          key={saved ? `${saved.id}:${saved.updated_at}` : `new:${date}`}
          athleteProfileId={ctx.athleteProfileId}
          sessionId={sessionId}
          sessionName={session.name}
          date={date}
          lines={lines}
          existing={existing}
        />
      )}
    </>
  );
}
