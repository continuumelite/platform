import {
  describePrescription,
  describeSet,
  fillFromTargets,
  localDateString,
  newId,
  plannedSets,
  targetLoad,
  targetMeters,
  targetReps,
  targetSeconds,
  workoutVolumeKg,
  type LoadUnit,
  type Prescription,
  type ProgramSession,
  type SetLog,
  type Tracking,
  type WorkoutDocument,
} from '@continuum/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui';
import { NumberField } from '@/components/workout/number-field';
import { RestTimer } from '@/components/workout/rest-timer';
import { BrandFonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cachedProgram, fetchCurrentProgram, type CurrentProgram } from '@/lib/program';
import { useSession } from '@/lib/session';
import {
  clearDraft,
  fetchLastSets,
  fetchWorkout,
  loadDraft,
  preferredUnit,
  saveDraft,
  saveWorkout,
  setPreferredUnit,
} from '@/lib/workouts';

type Loaded = {
  program: CurrentProgram;
  session: ProgramSession;
  doc: WorkoutDocument;
  lastTime: Map<string, { date: string; sets: SetLog[] }>;
};

/** A timestamp `seconds` from now (kept outside components: it reads the clock). */
function secondsFromNow(seconds: number) {
  return Date.now() + seconds * 1000;
}

function findSession(program: CurrentProgram, sessionId: string) {
  for (const b of program.document.blocks)
    for (const w of b.weeks) for (const s of w.sessions) if (s.id === sessionId) return s;
  return null;
}

function freshWorkout(
  program: CurrentProgram,
  session: ProgramSession,
  date: string,
  unit: LoadUnit,
) {
  let position = 0;
  const sets = session.exercises.flatMap((p) => {
    const planned = plannedSets(p, unit, position);
    position += planned.length;
    return planned;
  });
  return {
    id: newId(),
    athleteProfileId: program.athleteProfileId,
    sessionId: session.id,
    sessionName: session.name,
    performedOn: date,
    startedAt: new Date().toISOString(),
    sets,
  } satisfies WorkoutDocument;
}

export default function WorkoutScreen() {
  const { sessionId, date: dateParam } = useLocalSearchParams<{
    sessionId: string;
    date?: string;
  }>();
  const date = dateParam ?? localDateString();
  const { session: auth } = useSession();
  const theme = useTheme();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<WorkoutDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const [unit, setUnit] = useState<LoadUnit>(preferredUnit);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth?.user.id || !sessionId) return;
    let active = true;
    (async () => {
      const program = cachedProgram() ?? (await fetchCurrentProgram(auth.user.id));
      const session = program ? findSession(program, sessionId) : null;
      if (!program || !session) throw new Error('This session isn’t in your current program.');

      // A draft on the phone wins, then a workout already saved, then a fresh one from the plan.
      const doc =
        loadDraft(sessionId, date) ??
        (await fetchWorkout(program.athleteProfileId, sessionId, date)) ??
        freshWorkout(program, session, date, preferredUnit());
      const lastTime = await fetchLastSets(
        program.athleteProfileId,
        [...new Set(session.exercises.map((e) => e.exerciseId))],
        date,
      ).catch(() => new Map());
      return { program, session, doc, lastTime };
    })().then(
      (result) => {
        if (!active) return;
        setLoaded(result);
        setDoc(result.doc);
      },
      (e: Error) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
  }, [auth?.user.id, sessionId, date]);

  // Keep a draft on the phone once the athlete has changed something.
  useEffect(() => {
    if (doc && dirty) saveDraft(doc);
  }, [doc, dirty]);

  const update = useCallback((change: (d: WorkoutDocument) => WorkoutDocument) => {
    setDoc((d) => (d ? change(d) : d));
    setDirty(true);
  }, []);

  if (error) {
    return (
      <Screen>
        <TopBar title="Workout" />
        <ThemedText themeColor="textSecondary">{error}</ThemedText>
      </Screen>
    );
  }
  if (!loaded || !doc) {
    return (
      <Screen>
        <TopBar title="Workout" />
        <ActivityIndicator />
      </Screen>
    );
  }

  const { program, session, lastTime } = loaded;
  const isSaved = Boolean(doc.completedAt) && !dirty;
  const completedSets = doc.sets.filter((s) => s.completed).length;

  // Group sets under the prescribed exercises, in the coach's order; extra sets follow.
  const groups = session.exercises.map((p) => ({
    prescription: p as Prescription | undefined,
    exerciseId: p.exerciseId,
    sets: doc.sets.filter((s) => s.sessionExerciseId === p.id),
  }));

  const setField = (id: string, patch: Partial<SetLog>) =>
    update((d) => ({ ...d, sets: d.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  // The weight of the previous set of the same exercise: the usual starting point for the next one.
  const previousLoad = (set: SetLog) =>
    doc.sets
      .filter(
        (s) =>
          s.sessionExerciseId === set.sessionExerciseId &&
          s.setNumber < set.setNumber &&
          s.load != null,
      )
      .at(-1)?.load ?? null;

  const toggleSet = (set: SetLog, p: Prescription | undefined, tracking: Tracking) => {
    if (set.completed) return setField(set.id, { completed: false });
    const withLoad =
      tracking === 'weight_reps' && set.load == null && previousLoad(set) != null
        ? { ...set, load: previousLoad(set) }
        : set;
    setField(set.id, fillFromTargets(withLoad, p, tracking));
    if (p?.restSeconds) setRestEndsAt(secondsFromNow(p.restSeconds));
  };

  const addSet = (p: Prescription) =>
    update((d) => {
      const existing = d.sets.filter((s) => s.sessionExerciseId === p.id);
      const last = existing.at(-1);
      const set: SetLog = {
        id: newId(),
        sessionExerciseId: p.id,
        exerciseId: p.exerciseId,
        position: 0,
        setNumber: existing.length + 1,
        loadUnit: last?.loadUnit ?? targetLoad(p)?.unit ?? unit,
        load: last?.load ?? null,
        completed: false,
      };
      const sets = [...d.sets, set];
      // Keep positions in exercise order.
      const order = session.exercises.map((e) => e.id);
      sets.sort(
        (a, b) =>
          order.indexOf(a.sessionExerciseId ?? '') - order.indexOf(b.sessionExerciseId ?? '') ||
          a.setNumber - b.setNumber,
      );
      return { ...d, sets: sets.map((s, i) => ({ ...s, position: i })) };
    });

  const removeSet = (set: SetLog) =>
    update((d) => {
      const sets = d.sets
        .filter((s) => s.id !== set.id)
        .map((s) =>
          s.sessionExerciseId === set.sessionExerciseId && s.setNumber > set.setNumber
            ? { ...s, setNumber: s.setNumber - 1 }
            : s,
        );
      return { ...d, sets: sets.map((s, i) => ({ ...s, position: i })) };
    });

  const switchUnit = (next: LoadUnit) => {
    setUnit(next);
    setPreferredUnit(next);
    // Only sets without a typed load follow the new unit.
    update((d) => ({
      ...d,
      sets: d.sets.map((s) => (s.load == null ? { ...s, loadUnit: next } : s)),
    }));
  };

  const finish = async () => {
    setSaving(true);
    const final: WorkoutDocument = {
      ...doc,
      completedAt: doc.completedAt ?? new Date().toISOString(),
    };
    const outcome = await saveWorkout(final);
    setSaving(false);

    if (outcome.status === 'error') {
      Alert.alert('Couldn’t save', outcome.message);
      return;
    }
    clearDraft(session.id, date);
    setDirty(false);
    setDoc(final);
    if (outcome.status === 'queued') {
      Alert.alert(
        'Saved on your phone',
        'You’re offline. Your workout will upload automatically next time you open the app.',
      );
    }
    router.back();
  };

  const confirmFinish = () => {
    const unfinished = doc.sets.length - completedSets;
    if (unfinished > 0 && !doc.completedAt) {
      Alert.alert(
        'Finish workout?',
        `${unfinished} set${unfinished === 1 ? '' : 's'} not ticked off. They’ll be saved as skipped.`,
        [
          { text: 'Keep going', style: 'cancel' },
          { text: 'Finish', onPress: finish },
        ],
      );
    } else {
      finish();
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TopBar
            title={program.name}
            right={
              <View
                style={styles.units}
                accessibilityRole="radiogroup"
                accessibilityLabel="Weight unit"
              >
                {(['kg', 'lb'] as const).map((u) => (
                  <Pressable
                    key={u}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: unit === u }}
                    onPress={() => switchUnit(u)}
                    style={[
                      styles.unit,
                      { borderColor: theme.backgroundSelected },
                      unit === u && { backgroundColor: theme.text },
                    ]}
                  >
                    <ThemedText
                      type="eyebrow"
                      style={{ color: unit === u ? theme.background : theme.textSecondary }}
                    >
                      {u}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            }
          />

          <View>
            <ThemedText type="subtitle">{session.name || 'Workout'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {completedSets} of {doc.sets.length} sets done
              {isSaved ? ' · saved' : ''}
            </ThemedText>
          </View>

          {groups.map(({ prescription: p, exerciseId, sets }) => {
            const info = program.exercises.get(exerciseId);
            const tracking: Tracking = info?.tracking ?? 'weight_reps';
            const previous = lastTime.get(exerciseId);
            return (
              <ThemedView key={p?.id ?? exerciseId} type="backgroundElement" style={styles.card}>
                <View style={styles.cardHeader}>
                  {p?.superset ? (
                    <ThemedText type="eyebrow" themeColor="accent">
                      Superset {p.superset}
                    </ThemedText>
                  ) : null}
                  <ThemedText type="smallBold" style={styles.exerciseName}>
                    {info?.name ?? 'Exercise'}
                  </ThemedText>
                  {p && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {describePrescription(p)}
                    </ThemedText>
                  )}
                  {p?.notes ? (
                    <ThemedText type="small" themeColor="accent">
                      {p.notes}
                    </ThemedText>
                  ) : null}
                  {previous && (
                    <ThemedText type="small" themeColor="textSecondary">
                      Last time:{' '}
                      {previous.sets
                        .slice(0, 4)
                        .map((s) => describeSet({ ...s, rpe: null }, tracking))
                        .join(', ')}
                    </ThemedText>
                  )}
                </View>

                <View style={styles.setHeader}>
                  <ThemedText type="eyebrow" themeColor="textSecondary" style={styles.setNumberCol}>
                    Set
                  </ThemedText>
                  {tracking === 'weight_reps' && (
                    <ThemedText type="eyebrow" themeColor="textSecondary" style={styles.fieldCol}>
                      {unit}
                    </ThemedText>
                  )}
                  <ThemedText type="eyebrow" themeColor="textSecondary" style={styles.fieldCol}>
                    {tracking === 'time' ? 'Sec' : tracking === 'distance' ? 'Meters' : 'Reps'}
                  </ThemedText>
                </View>

                {sets.map((set) => (
                  <SetRowView
                    key={`${set.id}:${set.completed}:${set.loadUnit}`}
                    set={set}
                    prescription={p}
                    tracking={tracking}
                    previousLoad={previousLoad(set)}
                    onChange={(patch) => setField(set.id, patch)}
                    onToggle={() => toggleSet(set, p, tracking)}
                    onRemove={() => removeSet(set)}
                  />
                ))}

                {p && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => addSet(p)}
                    style={styles.addSet}
                  >
                    <ThemedText type="eyebrow" themeColor="accent">
                      + Add set
                    </ThemedText>
                  </Pressable>
                )}
              </ThemedView>
            );
          })}

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="eyebrow" themeColor="accent">
              How hard was it? (RPE)
            </ThemedText>
            <View style={styles.rpeRow}>
              {[5, 6, 7, 8, 9, 10].map((n) => {
                const active = doc.rpe === n;
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`RPE ${n}`}
                    onPress={() => update((d) => ({ ...d, rpe: active ? null : n }))}
                    style={[
                      styles.rpe,
                      { borderColor: theme.backgroundSelected },
                      active && { backgroundColor: theme.text, borderColor: theme.text },
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: active ? theme.background : theme.text }}
                    >
                      {n}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              accessibilityLabel="Notes for your coach"
              placeholder="Notes for your coach (how it felt, pain, anything off…)"
              placeholderTextColor={theme.textSecondary}
              multiline
              value={doc.notes ?? ''}
              onChangeText={(t) => update((d) => ({ ...d, notes: t }))}
              style={[
                styles.notes,
                {
                  color: theme.text,
                  borderColor: theme.backgroundSelected,
                  backgroundColor: theme.background,
                },
              ]}
            />
            {completedSets > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {completedSets} sets
                {workoutVolumeKg(doc.sets) > 0
                  ? ` · ${workoutVolumeKg(doc.sets).toLocaleString()} kg total volume`
                  : ''}
              </ThemedText>
            )}
          </ThemedView>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { borderColor: theme.backgroundSelected, backgroundColor: theme.background },
          ]}
        >
          {restEndsAt && (
            <RestTimer
              endsAt={restEndsAt}
              onAdd={(s) => setRestEndsAt((e) => (e ?? secondsFromNow(0)) + s * 1000)}
              onDone={() => setRestEndsAt(null)}
            />
          )}
          <Button
            title={doc.completedAt ? (dirty ? 'Save changes' : 'Saved') : 'Finish workout'}
            onPress={confirmFinish}
            loading={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SetRowView({
  set,
  prescription: p,
  tracking,
  previousLoad,
  onChange,
  onToggle,
  onRemove,
}: {
  set: SetLog;
  prescription: Prescription | undefined;
  tracking: Tracking;
  previousLoad: number | null;
  onChange: (patch: Partial<SetLog>) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const load = p ? targetLoad(p) : null;
  const hint = (n: number | null | undefined) => (n == null ? '–' : String(n));

  return (
    <View style={styles.setRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove set ${set.setNumber}`}
        onLongPress={onRemove}
        style={styles.setNumberCol}
      >
        <ThemedText type="smallBold" themeColor={set.completed ? 'accent' : 'textSecondary'}>
          {set.setNumber}
        </ThemedText>
      </Pressable>

      {tracking === 'weight_reps' && (
        <View style={styles.fieldCol}>
          <NumberField
            decimals
            accessibilityLabel={`Set ${set.setNumber} weight in ${set.loadUnit}`}
            value={set.load}
            placeholder={
              previousLoad != null
                ? String(previousLoad)
                : load
                  ? String(load.load)
                  : p?.loadType === 'percent_1rm'
                    ? `${p.loadValue}%`
                    : '–'
            }
            onChange={(v) => onChange({ load: v })}
            done={set.completed}
          />
        </View>
      )}

      <View style={styles.fieldCol}>
        {tracking === 'time' ? (
          <NumberField
            accessibilityLabel={`Set ${set.setNumber} seconds`}
            value={set.durationSeconds}
            placeholder={hint(targetSeconds(p?.reps))}
            onChange={(v) => onChange({ durationSeconds: v })}
            done={set.completed}
          />
        ) : tracking === 'distance' ? (
          <NumberField
            decimals
            accessibilityLabel={`Set ${set.setNumber} meters`}
            value={set.distanceMeters}
            placeholder={hint(targetMeters(p?.reps))}
            onChange={(v) => onChange({ distanceMeters: v })}
            done={set.completed}
          />
        ) : (
          <NumberField
            accessibilityLabel={`Set ${set.setNumber} reps`}
            value={set.reps}
            placeholder={p?.reps ?? hint(targetReps(p?.reps))}
            onChange={(v) => onChange({ reps: v })}
            done={set.completed}
          />
        )}
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.completed }}
        accessibilityLabel={`Set ${set.setNumber} done`}
        onPress={onToggle}
        hitSlop={8}
        style={[
          styles.check,
          { borderColor: set.completed ? theme.accent : theme.backgroundSelected },
          set.completed && { backgroundColor: theme.accent },
        ]}
      >
        <ThemedText
          type="smallBold"
          style={{ color: set.completed ? theme.background : theme.textSecondary }}
        >
          ✓
        </ThemedText>
      </Pressable>
    </View>
  );
}

function TopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Today"
        onPress={() => router.back()}
        hitSlop={12}
      >
        <ThemedText type="eyebrow" themeColor="accent">
          ‹ Today
        </ThemedText>
      </Pressable>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.topTitle}>
        {title}
      </ThemedText>
      {right}
    </View>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingBottom: Spacing.six,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  topTitle: { flex: 1 },
  units: { flexDirection: 'row', gap: 4 },
  unit: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  card: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  cardHeader: { gap: 2, marginBottom: Spacing.one },
  exerciseName: { fontSize: 17 },
  setHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  setNumberCol: { width: 32, alignItems: 'center' },
  fieldCol: { flex: 1 },
  check: {
    width: 44,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSet: { paddingVertical: Spacing.two, alignSelf: 'flex-start' },
  rpeRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  rpe: {
    borderWidth: 1,
    borderRadius: 8,
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    minHeight: 72,
    fontFamily: BrandFonts.regular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
});
