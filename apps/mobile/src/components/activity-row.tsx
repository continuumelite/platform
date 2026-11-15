import { formatDistance, formatDuration, formatPace } from '@continuum/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Activity } from '@/lib/devices';

const icon = (sport: string) =>
  /run/i.test(sport)
    ? 'walk-outline'
    : /ride|bike|cycl/i.test(sport)
      ? 'bicycle-outline'
      : /swim/i.test(sport)
        ? 'water-outline'
        : 'barbell-outline';

/** One imported activity: sport icon, name, date, distance · time · pace · heart rate. */
export function ActivityRow({ activity: a }: { activity: Activity }) {
  const theme = useTheme();
  const time = a.movingSeconds ?? a.durationSeconds;
  return (
    <View style={styles.row}>
      <Ionicons name={icon(a.sportType)} size={20} color={theme.cream} />
      <View style={styles.text}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {a.name || a.sportType}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[
            new Date(a.startedAt).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            }),
            formatDistance(a.distanceMeters),
            formatDuration(time),
            formatPace(a.sportType, a.distanceMeters, time),
            a.averageHeartRate ? `♥ ${a.averageHeartRate}` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  text: { flex: 1, gap: 2 },
});
