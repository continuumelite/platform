import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A scrolling tab screen with an optional big Anton title. */
export function TabScreen({
  title,
  eyebrow,
  children,
  refreshing,
  onRefresh,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <ThemedView style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {(title || eyebrow) && (
          <View style={styles.header}>
            {eyebrow ? (
              <ThemedText type="small" themeColor="textSecondary">
                {eyebrow}
              </ThemedText>
            ) : null}
            {title ? <ThemedText type="subtitle">{title}</ThemedText> : null}
          </View>
        )}
        {children}
      </ScrollView>
    </ThemedView>
  );
}

/** The brief's card: raised navy-grey panel with a small tracked label. */
export function Card({
  title,
  source,
  children,
}: {
  title?: string;
  /** Small right-aligned note, e.g. "Coming soon". */
  source?: string;
  children: ReactNode;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {(title || source) && (
        <View style={styles.cardHeader}>
          {title ? (
            <ThemedText type="eyebrow" themeColor="textSecondary">
              {title}
            </ThemedText>
          ) : (
            <View />
          )}
          {source ? <SoonTag label={source} /> : null}
        </View>
      )}
      {children}
    </ThemedView>
  );
}

/** "Coming soon" marker for placeholder screen states. */
export function SoonTag({ label = 'Coming soon' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { borderColor: theme.rule }]}>
      <ThemedText style={[styles.tagText, { color: theme.textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

/** Thin grey rule, like the brief's section dividers. */
export function Rule() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: theme.rule }} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.one, marginBottom: Spacing.one },
  card: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontSize: 10, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' },
});
