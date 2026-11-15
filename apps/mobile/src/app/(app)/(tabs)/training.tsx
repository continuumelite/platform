import {
  DAYS_OF_WEEK,
  isCoachingRole,
  localDateString,
  locateInProgram,
  type ProgramSession,
} from '@continuum/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card, TabScreen } from '@/components/layout';
import { SessionView } from '@/components/session-view';
import { StartButton } from '@/components/start-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canUse } from '@/lib/entitlements';
import { useHomeData, type HomeData } from '@/lib/home';
import type { CurrentProgram } from '@/lib/program';

const dayName = (dow: number) => DAYS_OF_WEEK[dow - 1] ?? '';

/** Training: the program calendar, week by week, with each session's detail and logging. */
export default function TrainingScreen() {
  const { data, error, refreshing, refresh } = useHomeData();
  return (
    <TabScreen title="Training" refreshing={refreshing} onRefresh={refresh}>
      {!data && !error && <ActivityIndicator />}
      {error && (
        <Card title="Something went wrong">
          <ThemedText themeColor="textSecondary">
            Couldn’t load your program. Pull down to try again.
          </ThemedText>
        </Card>
      )}
      {data && <TrainingBody data={data} />}
    </TabScreen>
  );
}

function TrainingBody({ data }: { data: HomeData }) {
  if (data.role && isCoachingRole(data.role)) {
    return (
      <Card title="Coach account">
        <ThemedText themeColor="textSecondary">
          Build and assign programs from the web dashboard.
        </ThemedText>
      </Card>
    );
  }
  if (!data.program) {
    return (
      <Card title="Program">
        <ThemedText themeColor="textSecondary">
          No program yet. Once your coach assigns one, your training calendar will show here.
        </ThemedText>
      </Card>
    );
  }
  return (
    <ProgramCalendar
      program={data.program}
      completed={data.completed}
      canLog={canUse(data.entitlements, 'training.logging')}
    />
  );
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() + days);
  return d;
}

function ProgramCalendar({
  program,
  completed,
  canLog,
}: {
  program: CurrentProgram;
  completed: Map<string, string>;
  canLog: boolean;
}) {
  const theme = useTheme();
  const today = localDateString();
  const position = locateInProgram(program.document, program.startDate, today);

  const weeks = program.document.blocks.flatMap((block) =>
    block.weeks.map((week) => ({ week, blockName: block.name })),
  );
  const currentIndex = position.status === 'in_progress' ? position.weekNumber - 1 : 0;
  const [index, setIndex] = useState(currentIndex);
  const [selectedId, setSelectedId] = useState<string | null>(
    position.status === 'in_progress' ? (position.todaysSessions[0]?.id ?? null) : null,
  );

  const safeIndex = Math.min(index, weeks.length - 1);
  const entry = weeks[safeIndex];
  if (!entry) {
    return (
      <Card title={program.name}>
        <ThemedText themeColor="textSecondary">This program has no weeks yet.</ThemedText>
      </Card>
    );
  }
  const { week, blockName } = entry;
  const isCurrentWeek = position.status === 'in_progress' && safeIndex === currentIndex;
  const todayDow = isCurrentWeek ? position.today : null;
  const ordered = [...week.sessions].sort((a, b) => (a.dayOfWeek ?? 8) - (b.dayOfWeek ?? 8));
  const selected: ProgramSession | null = ordered.find((s) => s.id === selectedId) ?? null;
  const done = week.sessions.filter((s) => completed.has(s.id)).length;

  const weekStart = program.startDate ? addDays(program.startDate, safeIndex * 7) : null;
  const range = weekStart
    ? `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(
        weekStart.getTime() + 6 * 86_400_000,
      ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : null;

  const status =
    position.status === 'not_started'
      ? `Starts in ${position.startsInDays} day${position.startsInDays === 1 ? '' : 's'}`
      : position.status === 'finished'
        ? 'Program finished'
        : position.status === 'no_start_date'
          ? 'No start date yet'
          : null;

  const go = (next: number) => {
    setIndex(next);
    setSelectedId(null);
  };

  return (
    <>
      <View style={styles.programHeader}>
        <ThemedText type="serifItalic">{program.name}</ThemedText>
        {status && (
          <ThemedText type="small" themeColor="textSecondary">
            {status}
          </ThemedText>
        )}
      </View>

      {/* Week navigation */}
      <View style={[styles.weekNav, { borderColor: theme.rule }]}>
        <NavArrow
          icon="chevron-back"
          label="Previous week"
          disabled={safeIndex === 0}
          onPress={() => go(safeIndex - 1)}
        />
        <View style={styles.weekTitle}>
          <ThemedText
            type="eyebrow"
            style={{ color: isCurrentWeek ? theme.accent : theme.textSecondary }}
          >
            {isCurrentWeek ? 'This week' : blockName}
            {week.isDeload ? ' · Deload' : ''}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.weekNumber}>
            Week {safeIndex + 1} of {weeks.length}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {range ? `${range} · ` : ''}
            {done}/{week.sessions.length} done
          </ThemedText>
        </View>
        <NavArrow
          icon="chevron-forward"
          label="Next week"
          disabled={safeIndex >= weeks.length - 1}
          onPress={() => go(safeIndex + 1)}
        />
      </View>
      {!isCurrentWeek && position.status === 'in_progress' && (
        <ThemedText
          type="eyebrow"
          themeColor="accent"
          accessibilityRole="button"
          onPress={() => {
            setIndex(currentIndex);
            setSelectedId(position.todaysSessions[0]?.id ?? null);
          }}
        >
          Back to this week
        </ThemedText>
      )}

      {/* Sessions this week */}
      {ordered.length === 0 && (
        <Card>
          <ThemedText themeColor="textSecondary">No sessions planned this week.</ThemedText>
        </Card>
      )}
      {ordered.map((s) => {
        const open = s.id === selected?.id;
        const isDone = completed.has(s.id);
        const isToday = todayDow != null && s.dayOfWeek === todayDow;
        return (
          <View key={s.id} style={[styles.session, { backgroundColor: theme.backgroundElement }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${s.dayOfWeek ? dayName(s.dayOfWeek) : 'Any day'}: ${s.name || 'Session'}${
                isDone ? ', done' : ''
              }`}
              onPress={() => setSelectedId(open ? null : s.id)}
              style={styles.sessionRow}
            >
              <View style={[styles.dayBadge, { borderColor: isToday ? theme.accent : theme.rule }]}>
                <ThemedText
                  type="eyebrow"
                  style={{ color: isToday ? theme.accent : theme.textSecondary }}
                >
                  {s.dayOfWeek ? dayName(s.dayOfWeek) : 'Any'}
                </ThemedText>
              </View>
              <View style={styles.sessionText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {s.name || 'Session'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {isToday ? 'Today · ' : ''}
                  {s.exercises.length} exercise{s.exercises.length === 1 ? '' : 's'}
                </ThemedText>
              </View>
              {isDone && <Ionicons name="checkmark-circle" size={22} color={theme.cream} />}
              <Ionicons
                name={open ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
            {open && (
              <View style={styles.sessionDetail}>
                <SessionView session={s} exercises={program.exercises} />
                <StartButton
                  sessionId={s.id}
                  completedOn={completed.get(s.id)}
                  today={today}
                  locked={!canLog}
                />
              </View>
            )}
          </View>
        );
      })}

      {week.notes ? (
        <Card title="This week">
          <ThemedText>{week.notes}</ThemedText>
        </Card>
      ) : null}
      {program.document.description ? (
        <Card title="From your coach">
          <ThemedText>{program.document.description}</ThemedText>
        </Card>
      ) : null}
    </>
  );
}

function NavArrow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.arrow, disabled && { opacity: 0.3 }]}
    >
      <Ionicons name={icon} size={22} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  programHeader: { gap: 2 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: Spacing.two,
  },
  weekTitle: { flex: 1, alignItems: 'center', gap: 2 },
  weekNumber: { fontSize: 24, lineHeight: 30 },
  arrow: { padding: Spacing.two },
  session: { borderRadius: 14, overflow: 'hidden' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  dayBadge: {
    borderWidth: 1,
    borderRadius: 8,
    width: 48,
    paddingVertical: 6,
    alignItems: 'center',
  },
  sessionText: { flex: 1, gap: 2 },
  sessionDetail: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
});
