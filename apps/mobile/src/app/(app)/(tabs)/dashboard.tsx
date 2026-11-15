import { estimateOneRepMax, localDateString } from '@continuum/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ActivityRow } from '@/components/activity-row';
import { Card, Rule, TabScreen } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Activity } from '@/lib/devices';
import { supabase } from '@/lib/supabase';

type Stats = {
  workouts: number;
  last7Days: number;
  weeklyVolumeKg: number;
  bests: { name: string; e1rm: number; unit: string }[];
  activities: Activity[];
};

const LB_TO_KG = 0.4536;

async function fetchStats(): Promise<Stats> {
  // RLS limits this to the signed-in athlete's own workouts.
  const { data, error } = await supabase
    .from('workout_logs')
    .select('performed_on, set_logs(reps, load, load_unit, completed, exercise:exercises(name))')
    .order('performed_on', { ascending: false })
    .limit(200);
  if (error) throw error;
  // Row-level security limits activities to the athlete's own.
  const { data: activityRows } = await supabase
    .from('activities')
    .select(
      'id, name, sport_type, started_at, duration_seconds, moving_seconds, distance_meters, average_heart_rate',
    )
    .order('started_at', { ascending: false })
    .limit(5);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const since = localDateString(weekAgo);

  let last7Days = 0;
  let weeklyVolumeKg = 0;
  const bests = new Map<string, { e1rm: number; unit: string }>();
  for (const w of data) {
    const recent = w.performed_on >= since;
    if (recent) last7Days++;
    for (const s of w.set_logs) {
      if (!s.completed || s.load == null || s.reps == null) continue;
      const kg = s.load * (s.load_unit === 'lb' ? LB_TO_KG : 1);
      if (recent) weeklyVolumeKg += kg * s.reps;
      const name = s.exercise?.name;
      const e1rm = estimateOneRepMax(s.load, s.reps);
      if (!name || e1rm == null) continue;
      const prev = bests.get(name);
      const prevKg = prev ? prev.e1rm * (prev.unit === 'lb' ? LB_TO_KG : 1) : 0;
      if (e1rm * (s.load_unit === 'lb' ? LB_TO_KG : 1) > prevKg)
        bests.set(name, { e1rm, unit: s.load_unit });
    }
  }

  return {
    workouts: data.length,
    last7Days,
    weeklyVolumeKg: Math.round(weeklyVolumeKg),
    bests: [...bests.entries()]
      .map(([name, b]) => ({ name, ...b }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8),
    activities: (activityRows ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      sportType: a.sport_type,
      startedAt: a.started_at,
      durationSeconds: a.duration_seconds,
      movingSeconds: a.moving_seconds,
      distanceMeters: a.distance_meters == null ? null : Number(a.distance_meters),
      averageHeartRate: a.average_heart_rate,
    })),
  };
}

/** Dashboard: training numbers from logged workouts, with device-based metrics to come. */
export default function DashboardScreen() {
  const theme = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchStats().then(
        (s) => {
          if (!active) return;
          setStats(s);
          setError(false);
        },
        () => active && setError(true),
      );
      return () => {
        active = false;
      };
    }, []),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setStats(await fetchStats());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <TabScreen title="Dashboard" refreshing={refreshing} onRefresh={refresh}>
      {!stats && !error && <ActivityIndicator />}
      {error && (
        <Card title="Something went wrong">
          <ThemedText themeColor="textSecondary">
            Couldn’t load your numbers. Pull down to try again.
          </ThemedText>
        </Card>
      )}
      {stats && (
        <>
          <View style={styles.tiles}>
            <Tile label="Workouts logged" value={String(stats.workouts)} />
            <Tile label="Last 7 days" value={String(stats.last7Days)} />
            <Tile
              label="7-day volume"
              value={stats.weeklyVolumeKg.toLocaleString()}
              unit="kg"
              wide
            />
          </View>

          <Card title="Estimated 1-rep max">
            {stats.bests.length === 0 ? (
              <ThemedText themeColor="textSecondary">
                Log a few weighted sets and your estimated maxes will show here.
              </ThemedText>
            ) : (
              stats.bests.map((b, i) => (
                <View key={b.name}>
                  {i > 0 && <Rule />}
                  <View style={styles.best}>
                    <ThemedText style={styles.bestName} numberOfLines={1}>
                      {b.name}
                    </ThemedText>
                    <ThemedText type="smallBold" style={{ color: theme.cream }}>
                      {b.e1rm} {b.unit}
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
          </Card>
        </>
      )}

      {stats && stats.activities.length > 0 && (
        <Card title="From your devices">
          {stats.activities.map((a, i) => (
            <View key={a.id}>
              {i > 0 && <Rule />}
              <ActivityRow activity={a} />
            </View>
          ))}
        </Card>
      )}

      <Card title="Fitness · Fatigue · Form" source="Connect a device">
        <ThemedText themeColor="textSecondary">
          Training load trends appear once workouts come in from Strava or your watch.
        </ThemedText>
      </Card>
      <View style={styles.tiles}>
        <Tile label="VO₂ max" value="—" muted />
        <Tile label="FTP" value="—" muted />
      </View>
    </TabScreen>
  );
}

function Tile({
  label,
  value,
  unit,
  wide,
  muted,
}: {
  label: string;
  value: string;
  unit?: string;
  wide?: boolean;
  muted?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.tile, wide && styles.wide, { backgroundColor: theme.backgroundElement }]}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
    >
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText
        type="subtitle"
        style={[styles.tileValue, muted && { color: theme.textSecondary }]}
      >
        {value}
        {unit ? <ThemedText themeColor="textSecondary"> {unit}</ThemedText> : null}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tile: { flexBasis: '45%', flexGrow: 1, borderRadius: 14, padding: Spacing.three, gap: 2 },
  wide: { flexBasis: '100%' },
  tileValue: { fontSize: 34, lineHeight: 40 },
  best: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  bestName: { flex: 1 },
});
