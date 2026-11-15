import {
  caloriesFromMacros,
  localDateString,
  MEAL_LABELS,
  MEAL_SLOTS,
  newId,
  type FoodEntry,
  type MealSlot,
} from '@continuum/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Card, TabScreen } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { Button, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useHomeData } from '@/lib/home';
import { fetchRecentFoods, saveFood } from '@/lib/nutrition';

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Quick-add a food: name, amount, calories and macros, or one tap on a recent food. */
export default function AddFoodScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { data } = useHomeData();
  const athleteProfileId = data?.athleteProfileId ?? null;

  const [meal, setMeal] = useState<MealSlot>(
    MEAL_SLOTS.includes(params.meal as MealSlot) ? (params.meal as MealSlot) : 'snack',
  );
  const date = params.date ?? localDateString();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<FoodEntry[]>([]);

  useEffect(() => {
    if (!athleteProfileId) return;
    let active = true;
    fetchRecentFoods(athleteProfileId).then((r) => active && setRecent(r));
    return () => {
      active = false;
    };
  }, [athleteProfileId]);

  const fill = (f: FoodEntry) => {
    setName(f.name);
    setQuantity(f.quantity ?? '');
    setCalories(String(f.calories));
    setProtein(String(f.proteinG));
    setCarbs(String(f.carbsG));
    setFat(String(f.fatG));
  };

  const macros = { proteinG: num(protein), carbsG: num(carbs), fatG: num(fat) };
  const estimated = calories.trim() === '' ? caloriesFromMacros(macros) : null;

  const save = async () => {
    if (!athleteProfileId) return;
    if (!name.trim()) {
      Alert.alert('Name the food first');
      return;
    }
    setSaving(true);
    const outcome = await saveFood({
      id: newId(),
      athleteProfileId,
      loggedOn: date,
      meal,
      name: name.trim(),
      quantity: quantity.trim() || null,
      calories: Math.round(estimated ?? num(calories)),
      ...macros,
    });
    setSaving(false);
    if (outcome === 'error') {
      Alert.alert('Couldn’t save', 'Check the numbers and try again.');
      return;
    }
    if (outcome === 'queued')
      Alert.alert('Saved on your phone', 'It will upload when you’re back online.');
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: `Add to ${MEAL_LABELS[meal]}` }} />
      <TabScreen>
        <View style={styles.meals} accessibilityRole="tablist">
          {MEAL_SLOTS.map((m) => {
            const active = m === meal;
            return (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setMeal(m)}
                style={[
                  styles.chip,
                  { borderColor: active ? theme.cream : theme.rule },
                  active && { backgroundColor: theme.cream },
                ]}
              >
                <ThemedText type="small" style={{ color: active ? theme.background : theme.text }}>
                  {MEAL_LABELS[m]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Card>
          <Input
            accessibilityLabel="Food"
            placeholder="Food (e.g. Chicken wrap)"
            value={name}
            onChangeText={setName}
            maxLength={200}
          />
          <Input
            accessibilityLabel="Amount"
            placeholder="Amount (optional, e.g. 1 cup)"
            value={quantity}
            onChangeText={setQuantity}
            maxLength={100}
          />
          <View style={styles.row}>
            <Field
              label="Calories"
              value={calories}
              onChange={setCalories}
              placeholder={estimated ? String(estimated) : '0'}
            />
            <Field label="Protein g" value={protein} onChange={setProtein} />
          </View>
          <View style={styles.row}>
            <Field label="Carbs g" value={carbs} onChange={setCarbs} />
            <Field label="Fat g" value={fat} onChange={setFat} />
          </View>
          {estimated != null && estimated > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Calories worked out from macros: {estimated} kcal
            </ThemedText>
          )}
          <Button title="Save" onPress={save} loading={saving} />
        </Card>

        {recent.length > 0 && (
          <Card title="Recent">
            {recent.map((f) => (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityHint="Fills in the form"
                onPress={() => fill(f)}
                style={({ pressed }) => [styles.recent, pressed && { opacity: 0.6 }]}
              >
                <ThemedText type="small" style={styles.flex}>
                  {f.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {f.calories} kcal
                </ThemedText>
              </Pressable>
            ))}
          </Card>
        )}
      </TabScreen>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = '0',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.flex}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Input
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  meals: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
