import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, SoonTag, TabScreen } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MORE_TOOLS } from '@/lib/more-tools';

/** Placeholder for each More tool until it's built. */
export default function MoreToolScreen() {
  const theme = useTheme();
  const { tool } = useLocalSearchParams<{ tool: string }>();
  const info = MORE_TOOLS.find((t) => t.slug === tool);

  return (
    <>
      <Stack.Screen options={{ title: info?.title ?? 'More' }} />
      <TabScreen>
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
      </TabScreen>
    </>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  center: { textAlign: 'center' },
});
