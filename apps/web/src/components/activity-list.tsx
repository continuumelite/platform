import { formatDistance, formatDuration, formatPace } from '@continuum/shared';

export type ActivityItem = {
  id: string;
  name: string;
  sport_type: string;
  started_at: string;
  duration_seconds: number | null;
  moving_seconds: number | null;
  distance_meters: number | null;
  average_heart_rate: number | null;
  provider: string;
};

/** Device activities as a compact list: date, name, distance, time, pace and heart rate. */
export function ActivityList({ activities }: { activities: ActivityItem[] }) {
  if (!activities.length) return <p className="text-sm text-zinc-500">No activities yet.</p>;
  return (
    <ul className="divide-y divide-zinc-800 text-sm">
      {activities.map((a) => {
        const distance = a.distance_meters == null ? null : Number(a.distance_meters);
        return (
          <li key={a.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2">
            <span className="w-24 text-xs text-zinc-500">
              {new Date(a.started_at).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="flex-1 font-medium">
              {a.name || a.sport_type}
              <span className="ml-2 text-xs font-normal text-zinc-500">{a.sport_type}</span>
            </span>
            <span className="text-zinc-300">
              {[
                formatDistance(distance),
                formatDuration(a.moving_seconds ?? a.duration_seconds),
                formatPace(a.sport_type, distance, a.moving_seconds ?? a.duration_seconds),
              ]
                .filter(Boolean)
                .join(' · ')}
              {a.average_heart_rate ? ` · ♥ ${a.average_heart_rate}` : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
