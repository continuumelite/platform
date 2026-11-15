import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, SoonTag, TabScreen } from '@/components/layout';
import { LockedCard } from '@/components/locked';
import { ThemedText } from '@/components/themed-text';
import { UpgradeScreen } from '@/components/upgrade';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canUse } from '@/lib/entitlements';
import { useHomeData } from '@/lib/home';
import { MORE_TOOLS } from '@/lib/more-tools';

/** A More tool: Upgrade is built; the rest are placeholders, or locked by the athlete's level. */
export default function MoreToolScreen() {
  const theme = useTheme();
  const { tool } = useLocalSearchParams<{ tool: string }>();
  const info = MORE_TOOLS.find((t) => t.slug === tool);
  const { data } = useHomeData();

  if (tool === 'upgrade') {
    return (
      <>
        <Stack.Screen options={{ title: 'Plans' }} />
        <UpgradeScreen entitlements={data?.entitlements ?? null} />
      </>
    );
  }

  const locked = info?.feature && data && !canUse(data.entitlements, info.feature);

  return (
    <>
      <Stack.Screen options={{ title: info?.title ?? 'More' }} />
      <TabScreen>
        {locked ? (
          <LockedCard title={info.title} planName={data.entitlements?.plan?.name} />
        ) : (
          <Card>
            <View style={styles.body}>
              <Ionicons name={info?.icon ?? 'construct-outline'} size={36} color={theme.cream} />
              <ThemedText type="subtitle">{info?.title ?? 'Not found'}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                {info?.blurb ?? 'This page doesn’t exist.'}
              </ThemedText>
              {info && <SoonTag />}
            </View>
          </Card>
        )}
      </TabScreen>
    </>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  center: { textAlign: 'center' },
});
