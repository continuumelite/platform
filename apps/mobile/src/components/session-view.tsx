import { describePrescription, type ProgramSession } from '@continuum/shared';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExerciseInfo } from '@/lib/program';

/** A session's exercises with the coach's prescription. Tap an exercise for cues and the demo video. */
export function SessionView({
  session,
  exercises,
}: {
  session: ProgramSession;
  exercises: Map<string, ExerciseInfo>;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <View style={styles.list}>
      {session.notes ? (
        <ThemedText type="small" themeColor="textSecondary">
          {session.notes}
        </ThemedText>
      ) : null}

      {session.exercises.length === 0 && (
        <ThemedText themeColor="textSecondary">No exercises in this session yet.</ThemedText>
      )}

      {session.exercises.map((p, i) => {
        const info = exercises.get(p.exerciseId);
        const expanded = open === p.id;
        const hasDetails = Boolean(info?.instructions || info?.videoUrl);

        return (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityHint={hasDetails ? 'Shows coaching cues' : undefined}
            onPress={() => setOpen(expanded ? null : p.id)}
            style={[
              styles.row,
              i > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: theme.textSecondary,
              },
            ]}
          >
            <View style={styles.rowHeader}>
              {p.superset ? (
                <ThemedView type="backgroundSelected" style={styles.superset}>
                  <ThemedText type="smallBold">{p.superset}</ThemedText>
                </ThemedView>
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.index}>
                  {i + 1}
                </ThemedText>
              )}
              <View style={styles.rowText}>
                <ThemedText type="smallBold" style={styles.name}>
                  {info?.name ?? 'Exercise'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {describePrescription(p) || 'As prescribed'}
                </ThemedText>
                {p.notes ? (
                  <ThemedText type="small" themeColor="accent">
                    {p.notes}
                  </ThemedText>
                ) : null}
              </View>
            </View>

            {expanded && hasDetails && (
              <View style={styles.details}>
                {info?.instructions ? (
                  <ThemedText type="small">{info.instructions}</ThemedText>
                ) : null}
                {info?.videoUrl ? (
                  <ThemedText
                    type="eyebrow"
                    themeColor="accent"
                    accessibilityRole="link"
                    onPress={() => WebBrowser.openBrowserAsync(info.videoUrl!)}
                  >
                    Watch demo ↗
                  </ThemedText>
                ) : null}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  row: { paddingVertical: Spacing.two, gap: Spacing.two },
  rowHeader: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  index: { width: 22, paddingTop: 1 },
  superset: { width: 22, borderRadius: 4, alignItems: 'center' },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 16 },
  details: { marginLeft: 22 + Spacing.three, gap: Spacing.two },
});
