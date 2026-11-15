import { FEATURES, type Entitlements } from '@continuum/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, TabScreen } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Plan = {
  id: string;
  level: number;
  name: string;
  description: string | null;
  priceCents: number | null;
  features: { key: string; limit: number | null }[];
};

async function fetchPlans(): Promise<Plan[]> {
  // Row-level security limits this to the athlete's own organization.
  const { data, error } = await supabase
    .from('plans')
    .select(
      'id, level, name, description, price_cents, features:plan_features(feature_key, usage_limit)',
    )
    .order('level');
  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    level: p.level,
    name: p.name,
    description: p.description,
    priceCents: p.price_cents,
    features: p.features.map((f) => ({ key: f.feature_key, limit: f.usage_limit })),
  }));
}

/** The three levels and what each includes, with the athlete's current one marked. */
export function UpgradeScreen({ entitlements }: { entitlements: Entitlements | null }) {
  const theme = useTheme();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchPlans().then(
        (p) => active && setPlans(p),
        () => active && setError(true),
      );
      return () => {
        active = false;
      };
    }, []),
  );

  const tiersOn = entitlements?.tiersEnabled ?? false;

  return (
    <TabScreen>
      {!tiersOn && (
        <Card>
          <ThemedText themeColor="textSecondary">
            Right now every member gets everything. The levels below show what’s planned.
          </ThemedText>
        </Card>
      )}
      {!plans && !error && <ActivityIndicator />}
      {error && (
        <Card>
          <ThemedText themeColor="textSecondary">
            Couldn’t load the plans. Try again later.
          </ThemedText>
        </Card>
      )}
      {plans?.map((plan) => {
        const current = tiersOn && entitlements?.plan?.id === plan.id;
        const includes = FEATURES.filter((f) => plan.features.some((pf) => pf.key === f.key));
        return (
          <View
            key={plan.id}
            style={[
              styles.plan,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: current ? theme.cream : 'transparent',
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.flex}>
                <ThemedText type="eyebrow" themeColor="textSecondary">
                  Level {plan.level}
                  {current ? ' · Your plan' : ''}
                </ThemedText>
                <ThemedText type="subtitle" style={styles.name}>
                  {plan.name}
                </ThemedText>
              </View>
              {plan.priceCents != null && (
                <ThemedText type="smallBold" style={{ color: theme.cream }}>
                  ${(plan.priceCents / 100).toFixed(plan.priceCents % 100 ? 2 : 0)}/mo
                </ThemedText>
              )}
            </View>
            {plan.description ? (
              <ThemedText themeColor="textSecondary">{plan.description}</ThemedText>
            ) : null}
            {includes.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Features not set yet.
              </ThemedText>
            ) : (
              includes.map((f) => {
                const limit = plan.features.find((pf) => pf.key === f.key)?.limit;
                return (
                  <View key={f.key} style={styles.feature}>
                    <Ionicons name="checkmark" size={16} color={theme.cream} />
                    <ThemedText type="small" style={styles.flex}>
                      {f.label}
                      {limit != null && 'limitLabel' in f ? ` (${limit} ${f.limitLabel})` : ''}
                    </ThemedText>
                  </View>
                );
              })
            )}
          </View>
        );
      })}
      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        To change your level, ask your coach. Paying in the app is coming later.
      </ThemedText>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  plan: { borderRadius: 14, borderWidth: 1.5, padding: Spacing.three, gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  flex: { flex: 1 },
  name: { fontSize: 26, lineHeight: 32 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  note: { textAlign: 'center' },
});
