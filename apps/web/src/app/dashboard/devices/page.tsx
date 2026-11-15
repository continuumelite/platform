import { timeAgo } from '@continuum/shared';
import { Suspense } from 'react';
import { canUse, getAthleteContext } from '@/lib/athlete';
import { stravaConfig } from '@/lib/strava';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ActivityList } from '@/components/activity-list';
import { buttonClass, Card, secondaryButtonClass } from '@/components/ui';
import { disconnect } from './actions';
import { SyncButton } from './sync-button';

const MESSAGES: Record<string, string> = {
  denied: 'You cancelled on Strava, so nothing was connected.',
  state: 'That link expired. Please try connecting again.',
  scope:
    'Continuum needs permission to read your activities. Please connect again and leave “View data about your activities” ticked.',
  plan: 'Strava isn’t included in your plan.',
  exchange: 'Strava didn’t accept the connection. Please try again.',
  save: 'Couldn’t save the connection. Please try again.',
  'not-configured': 'Strava isn’t set up on the server yet.',
};

export default function DevicesPage({ searchParams }: PageProps<'/dashboard/devices'>) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading devices…</p>}>
      <Devices searchParams={searchParams} />
    </Suspense>
  );
}

async function Devices({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error, connected } = await searchParams;
  const ctx = await getAthleteContext();
  const supabase = await createClient();
  const [{ data: connections }, { data: activities }] = await Promise.all([
    supabase
      .from('device_connections')
      .select('id, provider, status, last_synced_at, last_error')
      .eq('athlete_profile_id', ctx.athleteProfileId),
    supabase
      .from('activities')
      .select(
        'id, name, sport_type, started_at, duration_seconds, moving_seconds, distance_meters, average_heart_rate, provider',
      )
      .eq('athlete_profile_id', ctx.athleteProfileId)
      .order('started_at', { ascending: false })
      .limit(20),
  ]);

  const strava = connections?.find((c) => c.provider === 'strava');
  const ready = Boolean(stravaConfig() && createAdminClient());
  const allowed = canUse(ctx.entitlements, 'devices.strava');
  const errorText = typeof error === 'string' ? MESSAGES[error] : undefined;

  return (
    <>
      <div>
        <h1 className="text-4xl text-zinc-50">Devices</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Bring your workouts in automatically so your coach sees everything you do.
        </p>
      </div>
      {errorText && (
        <p role="alert" className="text-sm text-signal">
          {errorText}
        </p>
      )}
      {connected === 'strava' && (
        <p className="text-sm text-emerald-400">
          Strava connected. Your recent activities are coming in.
        </p>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Strava</h2>
          <p className="text-sm text-zinc-400">
            {strava
              ? strava.status === 'active'
                ? `Connected${strava.last_synced_at ? ` · last synced ${timeAgo(strava.last_synced_at)}` : ''}`
                : strava.status === 'revoked'
                  ? 'Access was removed on Strava. Connect again to keep syncing.'
                  : `Sync problem: ${strava.last_error ?? 'unknown error'}`
              : 'Runs, rides and swims, as soon as you save them on Strava.'}
          </p>
        </div>
        {!allowed ? (
          <span className="text-sm text-zinc-500">Not included in your plan</span>
        ) : strava && strava.status !== 'revoked' ? (
          <div className="flex flex-wrap items-center gap-2">
            {ready && <SyncButton connectionId={strava.id} />}
            <form action={disconnect.bind(null, strava.id)}>
              <button type="submit" className={secondaryButtonClass}>
                Disconnect
              </button>
            </form>
          </div>
        ) : ready ? (
          <a href="/api/strava/connect" className={buttonClass}>
            Connect Strava
          </a>
        ) : (
          <span className="text-sm text-zinc-500">Coming soon: not set up on the server yet</span>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {['Garmin', 'Apple Health', 'Health Connect (Android)'].map((name) => (
          <Card key={name}>
            <h2 className="font-semibold">{name}</h2>
            <p className="text-sm text-zinc-500">Coming soon</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Recent activities</h2>
        <ActivityList activities={activities ?? []} />
      </Card>
    </>
  );
}
