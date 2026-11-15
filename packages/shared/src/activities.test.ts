import { describe, expect, it } from 'vitest';

import { formatDistance, formatDuration, formatPace, stravaToActivityRow } from './activities';

describe('activities', () => {
  it('maps a Strava activity', () => {
    const row = stravaToActivityRow(
      {
        id: 123,
        name: 'Morning Run',
        sport_type: 'Run',
        start_date: '2026-11-14T07:00:00Z',
        elapsed_time: 2950.4,
        moving_time: 2930,
        distance: 10020.36,
        total_elevation_gain: 64.04,
        average_heartrate: 161.6,
        max_heartrate: 181,
      },
      'athlete-1',
    );
    expect(row).toMatchObject({
      external_id: '123',
      sport_type: 'Run',
      duration_seconds: 2950,
      distance_meters: 10020.4,
      elevation_gain_meters: 64,
      average_heart_rate: 162,
      calories: null,
    });
  });

  it('uses kilojoules for rides without calories', () => {
    const row = stravaToActivityRow(
      { id: 1, name: 'Ride', type: 'Ride', start_date: 'x', elapsed_time: 10, kilojoules: 612.4 },
      'a',
    );
    expect(row.calories).toBe(612);
    expect(row.sport_type).toBe('Ride');
  });

  it('formats durations, distances and pace', () => {
    expect(formatDuration(2950)).toBe('49:10');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDistance(10020)).toBe('10.02 km');
    expect(formatDistance(800)).toBe('800 m');
    expect(formatPace('Run', 10000, 2950)).toBe('4:55 /km');
    expect(formatPace('Ride', 28400, 3600)).toBe('28.4 km/h');
  });
});
