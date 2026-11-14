import { EQUIPMENT, MUSCLE_GROUPS, TRACKING, type MuscleGroup } from '@continuum/shared';
import Link from 'next/link';
import { Suspense } from 'react';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import { buttonClass, Card, inputClass, secondaryButtonClass } from '@/components/ui';

type Search = { q?: string; muscle?: string; scope?: string };

export default function ExercisesPage({ searchParams }: PageProps<'/dashboard/exercises'>) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Exercises</h1>
          <p className="mt-1 text-sm text-zinc-500">
            The building blocks for every program. Add your cues and a demo video once, then reuse
            them for every athlete.
          </p>
        </div>
        <Link href="/dashboard/exercises/new" className={buttonClass}>
          New exercise
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading exercises…</p>}>
        <ExerciseList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function ExerciseList({ searchParams }: { searchParams: Promise<Search> }) {
  const { user, membership, isLead } = await getCoachContext();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const muscle =
    params.muscle && params.muscle in MUSCLE_GROUPS ? (params.muscle as MuscleGroup) : '';
  const scope = params.scope === 'library' || params.scope === 'mine' ? params.scope : 'all';

  const supabase = await createClient();
  let query = supabase
    .from('exercises')
    .select(
      'id, name, tracking, muscle_groups, equipment, owner_coach_id, is_shared, owner:profiles!exercises_owner_coach_id_fkey(full_name)',
    )
    .eq('organization_id', membership.organizationId)
    .eq('is_archived', false)
    .order('name');

  if (q) query = query.ilike('name', `%${escapeLike(q)}%`);
  if (muscle) query = query.contains('muscle_groups', [muscle]);
  if (scope === 'library') query = query.is('owner_coach_id', null);
  if (scope === 'mine') query = query.eq('owner_coach_id', user.id);

  const { data: exercises, error } = await query;
  const filtered = Boolean(q || muscle || scope !== 'all');

  return (
    <>
      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name"
          aria-label="Search exercises by name"
          className={inputClass}
        />
        <select
          name="muscle"
          defaultValue={muscle}
          aria-label="Muscle group"
          className={`${inputClass} sm:w-44`}
        >
          <option value="">All muscle groups</option>
          {Object.entries(MUSCLE_GROUPS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="scope"
          defaultValue={scope}
          aria-label="Library"
          className={`${inputClass} sm:w-44`}
        >
          <option value="all">All exercises</option>
          <option value="library">Organization library</option>
          <option value="mine">My exercises</option>
        </select>
        <button type="submit" className={`${secondaryButtonClass} shrink-0`}>
          Filter
        </button>
      </form>

      <Card className="p-0">
        {error ? (
          <p className="p-6 text-sm text-red-600">Couldn’t load exercises. Please refresh.</p>
        ) : !exercises?.length ? (
          <div className="p-6 text-sm text-zinc-500">
            {filtered ? (
              <>
                No exercises match.{' '}
                <Link href="/dashboard/exercises" className="underline">
                  Clear filters
                </Link>
              </>
            ) : (
              'No exercises yet. Add your first one.'
            )}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {exercises.map((ex) => {
              const canEdit = ex.owner_coach_id === user.id || isLead;
              const source =
                ex.owner_coach_id === null
                  ? 'Library'
                  : ex.owner_coach_id === user.id
                    ? ex.is_shared
                      ? 'Mine · shared'
                      : 'Mine'
                    : (ex.owner?.full_name ?? 'Coach');

              return (
                <li key={ex.id}>
                  <Link
                    href={`/dashboard/exercises/${ex.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{ex.name}</p>
                      <p className="text-xs text-zinc-500">
                        {[
                          ex.muscle_groups
                            .map((m) => MUSCLE_GROUPS[m as MuscleGroup] ?? m)
                            .join(', '),
                          ex.equipment
                            .map((e) => EQUIPMENT[e as keyof typeof EQUIPMENT] ?? e)
                            .join(', '),
                          TRACKING[ex.tracking],
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {source}
                      </span>
                      <span className="text-xs text-zinc-400">{canEdit ? 'Edit' : 'View'}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="text-xs text-zinc-500">
        {exercises?.length ?? 0} exercise{exercises?.length === 1 ? '' : 's'}
      </p>
    </>
  );
}
