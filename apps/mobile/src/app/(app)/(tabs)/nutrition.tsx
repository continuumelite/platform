import {
  isCoachingRole,
  localDateString,
  locateInProgram,
  MEAL_LABELS,
  MEAL_SLOTS,
  sumMacros,
  targetFor,
  type FoodEntry,
  type NutritionTarget,
} from '@continuum/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Card, Rule, TabScreen } from '@/components/layout';
import { LockedCard } from '@/components/locked';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canUse } from '@/lib/entitlements';
import { useHomeData, type HomeData } from '@/lib/home';
import { deleteFood, fetchDay, fetchTargets } from '@/lib/nutrition';

const MACROS = [
  { key: 'proteinG', label: 'Protein' },
  { key: 'carbsG', label: 'Carbs' },
  { key: 'fatG', label: 'Fat' },
] as const;

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

/** Nutrition: today's targets from the coach, what's been eaten, and meals to log into. */
export default function NutritionScreen() {
  const { data, error, refreshing, refresh } = useHomeData();
  return (
    <TabScreen title="Nutrition" refreshing={refreshing} onRefresh={refresh}>
      {!data && !error && <ActivityIndicator />}
      {error && (
        <ThemedText themeColor="textSecondary">Couldn’t load. Pull down to try again.</ThemedText>
      )}
      {data &&
        (data.role && isCoachingRole(data.role) ? (
          <Card title="Coach account">
            <ThemedText themeColor="textSecondary">
              Set athletes’ nutrition targets from their page on the web dashboard.
            </ThemedText>
          </Card>
        ) : data.athleteProfileId ? (
          <NutritionDay data={data} athleteProfileId={data.athleteProfileId} />
        ) : null)}
    </TabScreen>
  );
}

function NutritionDay({ data, athleteProfileId }: { data: HomeData; athleteProfileId: string }) {
  const theme = useTheme();
  const today = localDateString();
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<FoodEntry[] | null>(null);
  const [targets, setTargets] = useState<NutritionTarget[]>([]);

  const canSeeTargets = canUse(data.entitlements, 'nutrition.targets');
  const canLog = canUse(data.entitlements, 'nutrition.logging');

  const load = useCallback(
    () =>
      Promise.all([
        fetchDay(athleteProfileId, date),
        fetchTargets(athleteProfileId).catch(() => [] as NutritionTarget[]),
      ]).then(
        ([day, t]) => {
          setEntries(day);
          setTargets(t);
        },
        () => setEntries([]),
      ),
    [athleteProfileId, date],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const position = data.program
    ? locateInProgram(data.program.document, data.program.startDate, date)
    : null;
  const isTrainingDay = position?.status === 'in_progress' && position.todaysSessions.length > 0;
  const target = canSeeTargets ? targetFor(targets, isTrainingDay) : null;
  const eaten = sumMacros(entries ?? []);
  const remaining = target?.calories != null ? target.calories - eaten.calories : null;

  const label =
    date === today
      ? 'Today'
      : date === shiftDate(today, -1)
        ? 'Yesterday'
        : new Date(`${date}T00:00`).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

  const remove = (entry: FoodEntry) =>
    Alert.alert(`Remove ${entry.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void deleteFood(entry.id).then(load, load),
      },
    ]);

  return (
    <>
      <View style={[styles.dateNav, { borderColor: theme.rule }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          onPress={() => setDate(shiftDate(date, -1))}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.dateLabel}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isTrainingDay ? 'Training day' : 'Rest day'}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          onPress={() => setDate(shiftDate(date, 1))}
          disabled={date >= today}
          hitSlop={8}
          style={date >= today && styles.disabled}
        >
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
        </Pressable>
      </View>

      {!entries ? (
        <ActivityIndicator />
      ) : (
        <>
          <Card title={target ? 'Calories remaining' : 'Calories eaten'}>
            <View style={styles.calories}>
              <ThemedText
                type="subtitle"
                style={[styles.big, remaining != null && remaining < 0 && { color: theme.accent }]}
              >
                {(remaining ?? eaten.calories).toLocaleString()}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {target?.calories != null
                  ? `${eaten.calories.toLocaleString()} of ${target.calories.toLocaleString()} kcal eaten`
                  : canSeeTargets
                    ? 'Your coach hasn’t set targets yet'
                    : 'kcal'}
              </ThemedText>
            </View>
            <Rule />
            <View style={styles.macros}>
              {MACROS.map((m) => {
                const goal = target?.[m.key] ?? null;
                const value = eaten[m.key];
                const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
                return (
                  <View key={m.key} style={styles.macro}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {m.label}
                    </ThemedText>
                    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${pct}%`,
                            backgroundColor:
                              value > (goal ?? Infinity) ? theme.accent : theme.cream,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText type="smallBold">
                      {value}
                      {goal != null ? ` / ${goal}` : ''} g
                    </ThemedText>
                  </View>
                );
              })}
            </View>
            {target?.notes ? (
              <ThemedText type="small" themeColor="textSecondary">
                Coach: {target.notes}
              </ThemedText>
            ) : null}
          </Card>

          {!canLog ? (
            <LockedCard title="Food logging" planName={data.entitlements?.plan?.name} />
          ) : (
            <Card title="Meals">
              {MEAL_SLOTS.map((meal, i) => {
                const items = entries.filter((e) => e.meal === meal);
                const kcal = sumMacros(items).calories;
                return (
                  <View key={meal}>
                    {i > 0 && <Rule />}
                    <View style={styles.mealHeader}>
                      <ThemedText type="smallBold">{MEAL_LABELS[meal]}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                        {items.length ? `${kcal} kcal` : ''}
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add to ${MEAL_LABELS[meal]}`}
                        onPress={() =>
                          router.push({ pathname: '/nutrition/add', params: { meal, date } })
                        }
                        hitSlop={8}
                        style={styles.add}
                      >
                        <Ionicons name="add-circle-outline" size={20} color={theme.cream} />
                        <ThemedText type="small" style={{ color: theme.cream }}>
                          Add
                        </ThemedText>
                      </Pressable>
                    </View>
                    {items.map((item) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityHint="Long press to remove"
                        onLongPress={() => remove(item)}
                        style={styles.item}
                      >
                        <View style={styles.flex}>
                          <ThemedText type="small">{item.name}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {[
                              item.quantity,
                              `P ${item.proteinG} · C ${item.carbsG} · F ${item.fatG}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </ThemedText>
                        </View>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.calories}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </Card>
          )}
          {canLog && entries.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Long press an item to remove it.
            </ThemedText>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  dateLabel: { flex: 1, alignItems: 'center' },
  disabled: { opacity: 0.3 },
  calories: { alignItems: 'center', gap: 2, paddingVertical: Spacing.two },
  big: { fontSize: 48, lineHeight: 56 },
  macros: { flexDirection: 'row', gap: Spacing.three },
  macro: { flex: 1, gap: Spacing.one },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    paddingLeft: Spacing.two,
  },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
