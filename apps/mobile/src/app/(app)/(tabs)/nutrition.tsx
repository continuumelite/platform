import { StyleSheet, View } from 'react-native';

import { Card, Rule, TabScreen } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MACROS = ['Protein', 'Carbs', 'Fat'] as const;
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;

/**
 * Nutrition: the screen layout from the brief, ahead of the nutrition feature itself.
 * Targets will come from the coach; meals from the athlete's log.
 */
export default function NutritionScreen() {
  const theme = useTheme();
  return (
    <TabScreen title="Nutrition">
      <Card title="Today" source="Coming soon">
        <View style={styles.calories}>
          <ThemedText type="subtitle" style={styles.big}>
            —
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            calories remaining
          </ThemedText>
        </View>
        <Rule />
        <View style={styles.macros}>
          {MACROS.map((m) => (
            <View key={m} style={styles.macro}>
              <ThemedText type="small" themeColor="textSecondary">
                {m}
              </ThemedText>
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]} />
              <ThemedText type="smallBold">— g</ThemedText>
            </View>
          ))}
        </View>
      </Card>

      <Card title="Meals" source="Coming soon">
        {MEALS.map((meal, i) => (
          <View key={meal}>
            {i > 0 && <Rule />}
            <View style={styles.meal}>
              <ThemedText type="smallBold">{meal}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Nothing logged
              </ThemedText>
            </View>
          </View>
        ))}
      </Card>

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        Your coach will set your calorie and macro targets. Meal logging and saved meals are on the
        way.
      </ThemedText>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  calories: { alignItems: 'center', gap: 2, paddingVertical: Spacing.two },
  big: { fontSize: 48, lineHeight: 56 },
  macros: { flexDirection: 'row', gap: Spacing.three },
  macro: { flex: 1, gap: Spacing.one },
  track: { height: 6, borderRadius: 3 },
  meal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two },
  note: { textAlign: 'center' },
});
