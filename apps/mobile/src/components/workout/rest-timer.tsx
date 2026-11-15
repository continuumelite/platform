import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Counts down the prescribed rest after a set. Disappears at zero or when skipped. */
export function RestTimer({
  endsAt,
  onAdd,
  onDone,
}: {
  endsAt: number;
  onAdd: (seconds: number) => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  useEffect(() => {
    if (left === 0) onDone();
  }, [left, onDone]);

  const label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    <View style={[styles.bar, { backgroundColor: theme.text }]} accessibilityLiveRegion="polite">
      <ThemedText type="eyebrow" style={{ color: theme.background }}>
        Rest
      </ThemedText>
      <ThemedText type="subtitle" style={[styles.time, { color: theme.background }]}>
        {label}
      </ThemedText>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => onAdd(30)} hitSlop={8}>
          <ThemedText type="eyebrow" style={{ color: theme.background }}>
            +30s
          </ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8}>
          <ThemedText type="eyebrow" style={{ color: theme.background }}>
            Skip
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  time: { fontSize: 26, lineHeight: 32, fontVariant: ['tabular-nums'] },
  actions: { marginLeft: 'auto', flexDirection: 'row', gap: Spacing.four },
});
