import Link from 'next/link';
import { Suspense } from 'react';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import { buttonClass, Card } from '@/components/ui';
import { StatusBadge } from './status-badge';

export default function ProgramsPage({ searchParams }: PageProps<'/dashboard/programs'>) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Programs</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Build templates once, then copy and personalize them for each athlete.
          </p>
        </div>
        <Link href="/dashboard/programs/new" className={buttonClass}>
          New program
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading programs…</p>}>
        <ProgramLists searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ProgramLists({ searchParams }: { searchParams: Promise<{ athlete?: string }> }) {
  const { user, membership } = await getCoachContext();
  const { athlete } = await searchParams;
  const supabase = await createClient();

  let athleteQuery = supabase
    .from('programs')
    .select(
      'id, name, status, start_date, updated_at, athlete_profile_id, athlete:athlete_profiles(profile:profiles(full_name))',
    )
    .eq('organization_id', membership.organizationId)
    .not('athlete_profile_id', 'is', null)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false });
  if (athlete && /^[0-9a-f-]{36}$/.test(athlete)) {
    athleteQuery = athleteQuery.eq('athlete_profile_id', athlete);
  }

  const [{ data: athletePrograms }, { data: templates }] = await Promise.all([
    athleteQuery,
    supabase
      .from('programs')
      .select(
        'id, name, updated_at, owner_coach_id, owner:profiles!programs_owner_coach_id_fkey(full_name)',
      )
      .eq('organization_id', membership.organizationId)
      .is('athlete_profile_id', null)
      .neq('status', 'archived')
      .order('name'),
  ]);

  const athleteName = athlete ? athletePrograms?.[0]?.athlete?.profile?.full_name : null;

  return (
    <>
      <Card className="p-0">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-base font-semibold">
            {athlete ? `Programs for ${athleteName ?? 'this athlete'}` : 'Athlete programs'}
          </h2>
          {athlete && (
            <Link href="/dashboard/programs" className="text-sm text-zinc-500 underline">
              Show all
            </Link>
          )}
        </div>
        {athletePrograms?.length ? (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {athletePrograms.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/programs/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-zinc-500">
                      {p.athlete?.profile?.full_name ?? 'Athlete'}
                      {p.start_date &&
                        ` · starts ${new Date(`${p.start_date}T00:00`).toLocaleDateString()}`}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 pb-5 text-sm text-zinc-500">
            No athlete programs yet. Create one from a template with “New program”.
          </p>
        )}
      </Card>

      {!athlete && (
        <Card className="p-0">
          <h2 className="px-6 pt-5 pb-2 text-base font-semibold">Templates</h2>
          {templates?.length ? (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {templates.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/dashboard/programs/${t.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <p className="text-sm font-medium">{t.name}</p>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {t.owner_coach_id === null
                        ? 'Organization'
                        : t.owner_coach_id === user.id
                          ? 'Mine'
                          : (t.owner?.full_name ?? 'Coach')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 pb-5 text-sm text-zinc-500">No templates yet.</p>
          )}
        </Card>
      )}
    </>
  );
}
