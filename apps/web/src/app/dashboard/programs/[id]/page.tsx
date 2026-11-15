import { emptyProgram, programDocumentSchema } from '@continuum/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { StatusBadge } from '../status-badge';
import { ProgramDetailsForm } from './details-form';
import { ProgramEditor, type ExerciseOption } from './program-editor';

export default function ProgramPage({ params }: PageProps<'/dashboard/programs/[id]'>) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading program…</p>}>
      <Program params={params} />
    </Suspense>
  );
}

async function Program({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();

  const { user, membership, isLead } = await getCoachContext();
  const supabase = await createClient();

  const { data: program } = await supabase
    .from('programs')
    .select(
      'id, name, status, start_date, current_version, athlete_profile_id, owner_coach_id, athlete:athlete_profiles(id, profile:profiles(full_name), coaches:coach_athletes(coach_user_id))',
    )
    .eq('id', id)
    .maybeSingle();
  if (!program) notFound();

  const isTemplate = program.athlete_profile_id === null;
  const canEdit =
    isLead ||
    (isTemplate
      ? program.owner_coach_id === user.id
      : (program.athlete?.coaches.some((c) => c.coach_user_id === user.id) ?? false));

  const [{ data: current }, { data: versions }, { data: exercises }] = await Promise.all([
    supabase
      .from('program_versions')
      .select('document')
      .eq('program_id', id)
      .eq('version', program.current_version)
      .maybeSingle(),
    supabase
      .from('program_versions')
      .select('version, reason, created_at, author:profiles(full_name)')
      .eq('program_id', id)
      .order('version', { ascending: false })
      .limit(30),
    supabase
      .from('exercises')
      .select('id, name, tracking, owner_coach_id, is_archived')
      .eq('organization_id', membership.organizationId)
      .order('name'),
  ]);

  const parsed = programDocumentSchema.safeParse(current?.document);
  const document = parsed.success ? parsed.data : emptyProgram(program.name);

  // Archived exercises stay available only where the program already uses them.
  const usedIds = new Set(
    document.blocks.flatMap((b) =>
      b.weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId))),
    ),
  );
  const exerciseOptions: ExerciseOption[] = (exercises ?? [])
    .filter((e) => !e.is_archived || usedIds.has(e.id))
    .map((e) => ({
      id: e.id,
      name: e.name,
      tracking: e.tracking,
      group:
        e.owner_coach_id === null
          ? 'Library'
          : e.owner_coach_id === user.id
            ? 'Mine'
            : 'Other coaches',
    }));

  return (
    <>
      <Link href="/dashboard/programs" className="text-sm text-zinc-500 hover:underline">
        ← All programs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            {isTemplate
              ? program.owner_coach_id
                ? 'Coach template'
                : 'Organization template'
              : `Program for ${program.athlete?.profile?.full_name ?? 'athlete'}`}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-4xl text-zinc-900 dark:text-zinc-50">{program.name}</h1>
            {!isTemplate && <StatusBadge status={program.status} />}
          </div>
        </div>
        {!isTemplate && canEdit && (
          <ProgramDetailsForm
            programId={program.id}
            status={program.status}
            startDate={program.start_date}
          />
        )}
        {isTemplate && (
          <Link
            href={`/dashboard/programs/new?from=${program.id}`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Use this template
          </Link>
        )}
      </div>

      {!canEdit && (
        <p className="rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          You can view this program but not change it. Use “Use this template” to make your own
          copy.
        </p>
      )}

      <ProgramEditor
        key={program.id}
        programId={program.id}
        version={program.current_version}
        initialDocument={document}
        exercises={exerciseOptions}
        readOnly={!canEdit}
        startDate={program.start_date}
      />

      {canEdit && versions && versions.length > 0 && (
        <Card>
          <h2 className="text-base font-semibold">History</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Every save is kept, with the reason for the change.
          </p>
          <ol className="mt-4 flex flex-col gap-3">
            {versions.map((v) => (
              <li key={v.version} className="flex gap-3 text-sm">
                <span className="w-10 shrink-0 text-zinc-400">v{v.version}</span>
                <div>
                  <p>{v.reason ?? <span className="text-zinc-400">No reason given</span>}</p>
                  <p className="text-xs text-zinc-500">
                    {v.author?.full_name ?? 'Someone'} ·{' '}
                    {new Date(v.created_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </>
  );
}
