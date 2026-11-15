import { EQUIPMENT, MUSCLE_GROUPS, TRACKING, type ExerciseInput } from '@continuum/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import { Card, secondaryButtonClass } from '@/components/ui';
import { archiveExercise, updateExercise } from '../actions';
import { ExerciseForm } from '../exercise-form';

export default function ExercisePage({ params }: PageProps<'/dashboard/exercises/[id]'>) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Exercise params={params} />
    </Suspense>
  );
}

async function Exercise({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();

  const { user, isLead } = await getCoachContext();
  const supabase = await createClient();
  const { data: ex } = await supabase
    .from('exercises')
    .select('*, owner:profiles!exercises_owner_coach_id_fkey(full_name)')
    .eq('id', id)
    .eq('is_archived', false)
    .maybeSingle();

  if (!ex) notFound();

  const canEdit = ex.owner_coach_id === user.id || isLead;
  const back = (
    <Link href="/dashboard/exercises" className="text-sm text-zinc-500 hover:underline">
      ← All exercises
    </Link>
  );

  if (!canEdit) {
    return (
      <>
        {back}
        <Card>
          <h1 className="text-4xl">{ex.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {ex.owner_coach_id
              ? `Shared by ${ex.owner?.full_name ?? 'a coach'}`
              : 'Organization library'}{' '}
            · {TRACKING[ex.tracking]}
          </p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium">Muscle groups</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">
                {ex.muscle_groups
                  .map((m) => MUSCLE_GROUPS[m as keyof typeof MUSCLE_GROUPS] ?? m)
                  .join(', ') || '—'}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Equipment</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">
                {ex.equipment.map((e) => EQUIPMENT[e as keyof typeof EQUIPMENT] ?? e).join(', ') ||
                  '—'}
              </dd>
            </div>
          </dl>
          {ex.instructions && <p className="mt-6 whitespace-pre-line text-sm">{ex.instructions}</p>}
          {ex.video_url && (
            <a
              href={ex.video_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm underline"
            >
              Watch demo video
            </a>
          )}
        </Card>
      </>
    );
  }

  const initial: ExerciseInput & { library: 'organization' | 'mine' } = {
    name: ex.name,
    instructions: ex.instructions,
    videoUrl: ex.video_url,
    tracking: ex.tracking,
    muscleGroups: ex.muscle_groups as ExerciseInput['muscleGroups'],
    equipment: ex.equipment as ExerciseInput['equipment'],
    isShared: ex.is_shared,
    library: ex.owner_coach_id ? 'mine' : 'organization',
  };

  return (
    <>
      {back}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl text-zinc-900 dark:text-zinc-50">Edit exercise</h1>
        <form action={archiveExercise.bind(null, ex.id)}>
          <button type="submit" className={secondaryButtonClass}>
            Archive
          </button>
        </form>
      </div>
      {ex.owner_coach_id && ex.owner_coach_id !== user.id && (
        <p className="text-sm text-zinc-500">
          This is {ex.owner?.full_name ?? 'another coach'}’s exercise.
        </p>
      )}
      <Card>
        <ExerciseForm
          action={updateExercise.bind(null, ex.id)}
          initial={initial}
          canUseLibrary={isLead}
          isNew={false}
        />
      </Card>
    </>
  );
}
