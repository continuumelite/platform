import { supabase } from './supabase';

export type DeviceConnection = {
  id: string;
  provider: 'strava' | 'garmin' | 'apple_health' | 'health_connect';
  status: 'active' | 'revoked' | 'error';
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type Activity = {
  id: string;
  name: string;
  sportType: string;
  startedAt: string;
  durationSeconds: number | null;
  movingSeconds: number | null;
  distanceMeters: number | null;
  averageHeartRate: number | null;
};

export async function fetchConnections(athleteProfileId: string): Promise<DeviceConnection[]> {
  const { data, error } = await supabase
    .from('device_connections')
    .select('id, provider, status, last_synced_at, last_error')
    .eq('athlete_profile_id', athleteProfileId);
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    provider: c.provider,
    status: c.status,
    lastSyncedAt: c.last_synced_at,
    lastError: c.last_error,
  }));
}

export async function fetchActivities(athleteProfileId: string, limit = 10): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(
      'id, name, sport_type, started_at, duration_seconds, moving_seconds, distance_meters, average_heart_rate',
    )
    .eq('athlete_profile_id', athleteProfileId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((a) => ({
    id: a.id,
    name: a.name,
    sportType: a.sport_type,
    startedAt: a.started_at,
    durationSeconds: a.duration_seconds,
    movingSeconds: a.moving_seconds,
    distanceMeters: a.distance_meters == null ? null : Number(a.distance_meters),
    averageHeartRate: a.average_heart_rate,
  }));
}

export async function disconnectDevice(connectionId: string) {
  const { error } = await supabase.from('device_connections').delete().eq('id', connectionId);
  if (error) throw error;
}
