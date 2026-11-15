'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { syncStravaConnection } from '@/lib/strava';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '../../actions';

/** Sync now: checks the connection is the signed-in athlete's (RLS) before syncing it. */
export async function syncNow(connectionId: string): Promise<FormState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('device_connections')
    .select('id')
    .eq('id', z.guid().parse(connectionId))
    .maybeSingle();
  if (!data) return { error: 'Not connected.' };
  const result = await syncStravaConnection(data.id);
  revalidatePath('/dashboard/devices');
  return result.ok
    ? { message: `Synced ${result.imported} activities.` }
    : { error: result.reason };
}

export async function disconnect(connectionId: string) {
  const supabase = await createClient();
  // Deleting the connection deletes its tokens; imported activities stay.
  await supabase.from('device_connections').delete().eq('id', z.guid().parse(connectionId));
  revalidatePath('/dashboard/devices');
}
