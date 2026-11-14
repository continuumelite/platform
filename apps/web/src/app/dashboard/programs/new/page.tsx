import { Suspense } from 'react';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { NewProgramForm } from './new-program-form';

export default function NewProgramPage({ searchParams }: PageProps<'/dashboard/programs/new'>) {
  return (
    <>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New program</h1>
      <Card>
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <Form searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function Form({
  searchParams,
}: {
  searchParams: Promise<{ athlete?: string; from?: string }>;
}) {
  const { user, membership, isLead } = await getCoachContext();
  const params = await searchParams;
  const supabase = await createClient();

  // Leads can write programs for every athlete; coaches for the athletes assigned to them.
  const athletesQuery = isLead
    ? supabase
        .from('athlete_profiles')
        .select('id, profile:profiles(full_name)')
        .eq('organization_id', membership.organizationId)
    : supabase
        .from('athlete_profiles')
        .select('id, profile:profiles(full_name), coaches:coach_athletes!inner(coach_user_id)')
        .eq('organization_id', membership.organizationId)
        .eq('coaches.coach_user_id', user.id);

  const [{ data: athletes }, { data: sources }] = await Promise.all([
    athletesQuery,
    supabase
      .from('programs')
      .select('id, name, athlete_profile_id, athlete:athlete_profiles(profile:profiles(full_name))')
      .eq('organization_id', membership.organizationId)
      .neq('status', 'archived')
      .order('name'),
  ]);

  return (
    <NewProgramForm
      isLead={isLead}
      athletes={(athletes ?? []).map((a) => ({
        id: a.id,
        name: a.profile?.full_name ?? 'Unnamed athlete',
      }))}
      templates={(sources ?? [])
        .filter((s) => s.athlete_profile_id === null)
        .map((s) => ({ id: s.id, name: s.name }))}
      athletePrograms={(sources ?? [])
        .filter((s) => s.athlete_profile_id !== null)
        .map((s) => ({
          id: s.id,
          name: `${s.name} (${s.athlete?.profile?.full_name ?? 'athlete'})`,
        }))}
      defaultAthlete={params.athlete}
      defaultSource={params.from}
    />
  );
}
