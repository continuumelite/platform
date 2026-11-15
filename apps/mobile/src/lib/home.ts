import type { OrgRole } from '@continuum/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { fetchCurrentProgram, type CurrentProgram } from './program';
import { useSession } from './session';
import { supabase } from './supabase';
import { fetchCompletedSessions, flushOutbox, pendingUploads } from './workouts';

/** Everything the Home and Training tabs need about the signed-in person. */
export type HomeData = {
  firstName: string | null;
  fullName: string | null;
  email: string | null;
  role: OrgRole | null;
  organizationName: string | null;
  coachName: string | null;
  goals: string | null;
  program: CurrentProgram | null;
  /** Session id → date it was completed. */
  completed: Map<string, string>;
  pendingUploads: number;
};

async function fetchHome(userId: string, email: string | null): Promise<HomeData> {
  // Upload any workouts saved while offline before showing what's done.
  await flushOutbox().catch(() => undefined);

  const [profile, membership, athlete, program] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase
      .from('memberships')
      .select('role, organizations(name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('athlete_profiles')
      .select('goals, coaches:coach_athletes(role, coach:profiles(full_name))')
      .eq('user_id', userId)
      .maybeSingle(),
    fetchCurrentProgram(userId),
  ]);
  if (profile.error || membership.error || athlete.error) throw new Error('Could not load home');

  const sessionIds =
    program?.document.blocks.flatMap((b) => b.weeks.flatMap((w) => w.sessions.map((s) => s.id))) ??
    [];
  const completed = program
    ? await fetchCompletedSessions(program.athleteProfileId, sessionIds).catch(
        () => new Map<string, string>(),
      )
    : new Map<string, string>();

  return {
    firstName: profile.data?.full_name?.split(' ')[0] ?? null,
    fullName: profile.data?.full_name ?? null,
    email,
    role: membership.data?.role ?? null,
    organizationName: membership.data?.organizations?.name ?? null,
    coachName: athlete.data?.coaches.find((c) => c.role === 'primary')?.coach?.full_name ?? null,
    goals: athlete.data?.goals ?? null,
    program,
    completed,
    pendingUploads: pendingUploads().length,
  };
}

/** Loads home data, reloading whenever the screen comes back into view, with pull-to-refresh. */
export function useHomeData() {
  const { session } = useSession();
  const userId = session?.user.id;
  const email = session?.user.email ?? null;
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      fetchHome(userId, email).then(
        (result) => {
          if (!active) return;
          setData(result);
          setError(false);
        },
        () => active && setError(true),
      );
      return () => {
        active = false;
      };
    }, [userId, email]),
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      setData(await fetchHome(userId, email));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [userId, email]);

  return { data, error, refreshing, refresh };
}
