/**
 * Device activities (Strava first). The Strava API's activity shape is mapped to our activities
 * table here so the web server's sync and webhook share one mapping.
 */

/** The fields we use from Strava's activity object (GET /activities, /activities/{id}). */
export type StravaActivity = {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  elapsed_time: number;
  moving_time?: number;
  distance?: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  kilojoules?: number;
};

export type ActivityRow = {
  athlete_profile_id: string;
  provider: 'strava';
  external_id: string;
  sport_type: string;
  name: string;
  started_at: string;
  duration_seconds: number | null;
  moving_seconds: number | null;
  distance_meters: number | null;
  elevation_gain_meters: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
};

const round = (v: number | undefined) => (v == null ? null : Math.round(v));

export function stravaToActivityRow(a: StravaActivity, athleteProfileId: string): ActivityRow {
  return {
    athlete_profile_id: athleteProfileId,
    provider: 'strava',
    external_id: String(a.id),
    sport_type: a.sport_type ?? a.type ?? 'Workout',
    name: a.name ?? '',
    started_at: a.start_date,
    duration_seconds: round(a.elapsed_time),
    moving_seconds: round(a.moving_time),
    distance_meters: a.distance == null ? null : Math.round(a.distance * 10) / 10,
    elevation_gain_meters:
      a.total_elevation_gain == null ? null : Math.round(a.total_elevation_gain * 10) / 10,
    average_heart_rate: round(a.average_heartrate),
    max_heart_rate: round(a.max_heartrate),
    // Rides report work in kJ, which is roughly kcal burned.
    calories: round(a.calories ?? a.kilojoules),
  };
}

/** "49:10", "1:02:05" */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** "10.02 km" */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || meters === 0) return '';
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

/** Running pace per km ("4:55 /km") for runs and walks; speed for everything else. */
export function formatPace(
  sportType: string,
  meters: number | null | undefined,
  seconds: number | null | undefined,
): string {
  if (!meters || !seconds) return '';
  if (/run|walk|hike/i.test(sportType)) {
    const perKm = seconds / (meters / 1000);
    return `${Math.floor(perKm / 60)}:${String(Math.round(perKm % 60)).padStart(2, '0')} /km`;
  }
  return `${(meters / 1000 / (seconds / 3600)).toFixed(1)} km/h`;
}
