import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Rule, TabScreen } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { BrandFonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useHomeData } from '@/lib/home';
import { MORE_TOOLS } from '@/lib/more-tools';
import { supabase } from '@/lib/supabase';

/** More: profile, every secondary tool, and sign out. */
export default function MoreScreen() {
  const theme = useTheme();
  const { data } = useHomeData();
  const name = data?.fullName ?? data?.email ?? '';
  const initials = name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <TabScreen title="More">
      <Card>
        <View style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: theme.cream }]}>
            <ThemedText style={[styles.initials, { color: theme.background }]}>
              {initials || '·'}
            </ThemedText>
          </View>
          <View style={styles.profileText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {data?.fullName ?? 'Your profile'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {[
                data?.entitlements?.tiersEnabled ? data.entitlements.plan?.name : null,
                data?.organizationName,
                data?.coachName ? `Coach: ${data.coachName}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || data?.email}
            </ThemedText>
          </View>
        </View>
      </Card>

      <Card>
        {MORE_TOOLS.map((tool, i) => (
          <View key={tool.slug}>
            {i > 0 && <Rule />}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/more/[tool]', params: { tool: tool.slug } })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name={tool.icon} size={20} color={theme.cream} />
              <ThemedText style={styles.rowLabel}>{tool.title}</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: BrandFonts.display, fontSize: 20, lineHeight: 26 },
  profileText: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 12 },
  rowLabel: { flex: 1 },
});
