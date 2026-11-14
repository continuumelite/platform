import {
  DAYS_OF_WEEK,
  isCoachingRole,
  localDateString,
  locateInProgram,
  type OrgRole,
  type ProgramSession,
} from '@continuum/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionView } from '@/components/session-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCurrentProgram, type CurrentProgram } from '@/lib/program';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type Home = {
  firstName: string | null;
  role: OrgRole | null;
  organizationName: string | null;
  coachName: string | null;
  goals: string | null;
  program: CurrentProgram | null;
};

const dayName = (dow: number) => DAYS_OF_WEEK[dow - 1] ?? '';

async function fetchHome(userId: string): Promise<Home> {
  const [profile, membership, athlete, program] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase
      .from('memberships')
      .select('role, organizations(name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('athlete_profiles')
      .select('goals, coaches:coach_athletes(role, coach:profiles(full_name))')
      .eq('user_id', userId)
      .maybeSingle(),
    fetchCurrentProgram(userId),
  ]);
  if (profile.error || membership.error || athlete.error) throw new Error('Could not load home');

  return {
    firstName: profile.data?.full_name?.split(' ')[0] ?? null,
    role: membership.data?.role ?? null,
    organizationName: membership.data?.organizations?.name ?? null,
    coachName: athlete.data?.coaches.find((c) => c.role === 'primary')?.coach?.full_name ?? null,
    goals: athlete.data?.goals ?? null,
    program,
  };
}

export default function TodayScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchHome(userId).then(
      (data) => {
        if (!active) return;
        setHome(data);
        setError(false);
      },
      () => active && setError(true),
    );
    return () => {
      active = false;
    };
  }, [userId]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      setHome(await fetchHome(userId));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              {todayLabel}
            </ThemedText>
            <ThemedText type="subtitle">
              {home?.firstName ? `Hi ${home.firstName}` : 'Today'}
            </ThemedText>
          </View>

          {!home && !error && <ActivityIndicator />}
          {error && (
            <Card title="Something went wrong">
              <ThemedText themeColor="textSecondary">
                Couldn’t load your plan. Pull down to try again.
              </ThemedText>
            </Card>
          )}

          {home &&
            (home.role && isCoachingRole(home.role) ? (
              <Card title="Coach account">
                <ThemedText themeColor="textSecondary">
                  Manage athletes and programs from the web dashboard. Coach tools in the app are
                  coming later.
                </ThemedText>
              </Card>
            ) : home.program ? (
              <ProgramToday program={home.program} />
            ) : (
              <Card title="Today’s session">
                <ThemedText themeColor="textSecondary">
                  {home.coachName
                    ? `${home.coachName} hasn’t assigned a program yet. Your workouts will show up here.`
                    : 'Your workouts will show up here once your coach assigns a program.'}
                </ThemedText>
              </Card>
            ))}

          {home?.goals && (
            <Card title="Your goal">
              <ThemedText>{home.goals}</ThemedText>
            </Card>
          )}

          <View style={styles.footer}>
            <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ProgramToday({ program }: { program: CurrentProgram }) {
  const theme = useTheme();
  const today = localDateString();
  const position = useMemo(
    () => locateInProgram(program.document, program.startDate, today),
    [program, today],
  );

  // Which session is open: today's by default; the athlete can look at any session this week.
  const defaultSession =
    position.status === 'in_progress' ? (position.todaysSessions[0] ?? null) : null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultSession?.id ?? null);

  if (position.status !== 'in_progress') {
    const message =
      position.status === 'not_started'
        ? `Starts in ${position.startsInDays} day${position.startsInDays === 1 ? '' : 's'}${
            program.startDate
              ? `, on ${new Date(`${program.startDate}T00:00`).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}`
              : ''
          }.`
        : position.status === 'finished'
          ? 'You’ve finished this program. Your coach will set up what’s next.'
          : 'Your coach hasn’t set a start date yet.';
    return (
      <Card title={program.name}>
        <ThemedText themeColor="textSecondary">{message}</ThemedText>
      </Card>
    );
  }

  const { week, weekNumber, totalWeeks, blockName, today: dow, todaysSessions, next } = position;
  const ordered = [...week.sessions].sort((a, b) => (a.dayOfWeek ?? 8) - (b.dayOfWeek ?? 8));
  const selected: ProgramSession | null = ordered.find((s) => s.id === selectedId) ?? null;
  const selectedLabel = !selected
    ? ''
    : selected.dayOfWeek === dow
      ? 'Today'
      : selected.dayOfWeek
        ? dayName(selected.dayOfWeek)
        : 'Any day this week';

  return (
    <>
      {/* Where they are in the program */}
      <View style={styles.programHeader}>
        <ThemedText type="eyebrow" themeColor="accent">
          Week {weekNumber} of {totalWeeks}
          {blockName ? ` · ${blockName}` : ''}
          {week.isDeload ? ' · Deload' : ''}
        </ThemedText>
        <ThemedText type="serifItalic">{program.name}</ThemedText>
      </View>

      {/* This week's sessions */}
      <View style={styles.weekRow} accessibilityRole="tablist">
        {ordered.map((s) => {
          const active = s.id === selected?.id;
          const isTodays = s.dayOfWeek === dow;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${s.dayOfWeek ? dayName(s.dayOfWeek) : 'Any day'}: ${s.name}`}
              onPress={() => setSelectedId(s.id)}
              style={[
                styles.dayChip,
                { borderColor: active ? theme.text : theme.backgroundSelected },
                active && { backgroundColor: theme.text },
              ]}
            >
              <ThemedText
                type="eyebrow"
                style={{ color: active ? theme.background : theme.textSecondary }}
              >
                {s.dayOfWeek ? dayName(s.dayOfWeek) : 'Any'}
                {isTodays ? ' ·' : ''}
              </ThemedText>
              <ThemedText
                type="smallBold"
                numberOfLines={1}
                style={{ color: active ? theme.background : theme.text }}
              >
                {s.name || 'Session'}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Today (or the selected session) */}
      {selected ? (
        <Card title={selectedLabel}>
          <ThemedText type="subtitle" style={styles.sessionName}>
            {selected.name || 'Session'}
          </ThemedText>
          <SessionView session={selected} exercises={program.exercises} />
          {selected.dayOfWeek !== dow && (
            <ThemedText
              type="eyebrow"
              themeColor="accent"
              accessibilityRole="button"
              onPress={() => setSelectedId(todaysSessions[0]?.id ?? null)}
            >
              Back to today
            </ThemedText>
          )}
        </Card>
      ) : (
        <Card title="Today">
          <ThemedText type="subtitle" style={styles.sessionName}>
            Rest day
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {next
              ? `Next up: ${next.session.name || 'session'} on ${dayName(next.dayOfWeek)}${
                  next.weekNumber !== weekNumber ? ` (week ${next.weekNumber})` : ''
                }.`
              : 'Nothing else scheduled in this program.'}
          </ThemedText>
          {position.flexibleSessions.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              You also have {position.flexibleSessions.length} session
              {position.flexibleSessions.length === 1 ? '' : 's'} to fit in any day this week.
            </ThemedText>
          )}
        </Card>
      )}

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="eyebrow" themeColor="accent">
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.one, marginBottom: Spacing.two },
  programHeader: { gap: 2 },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  dayChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minWidth: 96,
    maxWidth: 160,
  },
  card: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  sessionName: { fontSize: 26, lineHeight: 32 },
  footer: { marginTop: Spacing.four },
});
