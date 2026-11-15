import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Shown in place of a feature the athlete's subscription level doesn't include. */
export function LockedCard({ title, planName }: { title: string; planName?: string | null }) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.body}>
        <Ionicons name="lock-closed-outline" size={32} color={theme.cream} />
        <ThemedText type="subtitle" style={styles.center}>
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {planName ? `Not included in ${planName}.` : 'Not included in your plan.'} See what each
          level includes.
        </ThemedText>
        <View style={styles.button}>
          <Button
            title="See plans"
            onPress={() => router.push({ pathname: '/more/[tool]', params: { tool: 'upgrade' } })}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  center: { textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: Spacing.two },
});
