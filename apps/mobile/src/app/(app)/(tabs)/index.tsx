import { DAYS_OF_WEEK, isCoachingRole, localDateString, locateInProgram } from '@continuum/shared';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { CommunityPreview } from '@/components/community/preview';
import { Card, TabScreen } from '@/components/layout';
import { StartButton } from '@/components/start-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canUse } from '@/lib/entitlements';
import { useHomeData, type HomeData } from '@/lib/home';
import { useSession } from '@/lib/session';

/**
 * Home: personal status first (brief, slide 3) — today's session, where you are in the
 * training block, and health metrics. A community feed may later sit below the personal cards.
 */
export default function HomeScreen() {
  const { data, error, refreshing, refresh } = useHomeData();
  const { session } = useSession();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <TabScreen
      eyebrow={today}
      title={data?.firstName ? `Hi ${data.firstName}` : 'Home'}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {!data && !error && <ActivityIndicator />}
      {error && (
        <Card title="Something went wrong">
          <ThemedText themeColor="textSecondary">
            Couldn’t load your day. Pull down to try again.
          </ThemedText>
        </Card>
      )}
      {data &&
        (data.role && isCoachingRole(data.role) ? (
          <Card title="Coach account">
            <ThemedText themeColor="textSecondary">
              Manage athletes and programs from the web dashboard. Coach tools in the app come
              later.
            </ThemedText>
          </Card>
        ) : (
          <AthleteHome data={data} />
        ))}
      {data && session && canUse(data.entitlements, 'community.view') && (
        <CommunityPreview userId={session.user.id} />
      )}
    </TabScreen>
  );
}

function AthleteHome({ data }: { data: HomeData }) {
  const theme = useTheme();
  const today = localDateString();
  const position = data.program
    ? locateInProgram(data.program.document, data.program.startDate, today)
    : null;

  return (
    <>
      {data.pendingUploads > 0 && (
        <Card title="Waiting to upload">
          <ThemedText themeColor="textSecondary">
            {data.pendingUploads} workout{data.pendingUploads === 1 ? '' : 's'} saved on your phone.
            They’ll upload when you’re back online.
          </ThemedText>
        </Card>
      )}

      {data.unreadMessages > 0 && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/messages')}>
          <Card title="Coach hub" source={`${data.unreadMessages} new`}>
            <ThemedText>
              {data.coachName ?? 'Your coach'} sent you a message. Tap to read and reply.
            </ThemedText>
          </Card>
        </Pressable>
      )}

      {/* Today */}
      <Card title="Today">
        {!data.program ? (
          <ThemedText themeColor="textSecondary">
            {data.coachName
              ? `${data.coachName} hasn’t assigned a program yet. Your sessions will show up here.`
              : 'Your sessions will show up here once your coach assigns a program.'}
          </ThemedText>
        ) : position?.status !== 'in_progress' ? (
          <ThemedText themeColor="textSecondary">
            {position?.status === 'not_started'
              ? `${data.program.name} starts in ${position.startsInDays} day${position.startsInDays === 1 ? '' : 's'}.`
              : position?.status === 'finished'
                ? 'You’ve finished your program. Your coach will set up what’s next.'
                : 'Your coach hasn’t set a start date yet.'}
          </ThemedText>
        ) : position.todaysSessions.length ? (
          position.todaysSessions.map((s) => (
            <View key={s.id} style={styles.todayRow}>
              <ThemedText type="subtitle" style={styles.sessionName}>
                {s.name || 'Session'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {s.exercises.length} exercise{s.exercises.length === 1 ? '' : 's'}
              </ThemedText>
              <StartButton
                sessionId={s.id}
                completedOn={data.completed.get(s.id)}
                today={today}
                locked={!canUse(data.entitlements, 'training.logging')}
              />
            </View>
          ))
        ) : (
          <>
            <ThemedText type="subtitle" style={styles.sessionName}>
              Rest day
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {position.next
                ? `Next up: ${position.next.session.name || 'session'} on ${DAYS_OF_WEEK[position.next.dayOfWeek - 1]}${
                    position.next.weekNumber !== position.weekNumber
                      ? ` (week ${position.next.weekNumber})`
                      : ''
                  }.`
                : 'Nothing else scheduled in this program.'}
            </ThemedText>
          </>
        )}
      </Card>

      {/* Training status */}
      {position?.status === 'in_progress' && data.program && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/training')}>
          <Card title="Training status">
            <ThemedText type="subtitle" style={styles.sessionName}>
              Week {position.weekNumber} of {position.totalWeeks}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {data.program.name}
              {position.blockName ? ` · ${position.blockName}` : ''}
              {position.week.isDeload ? ' · Deload' : ''}
            </ThemedText>
            <WeekProgress
              done={position.week.sessions.filter((s) => data.completed.has(s.id)).length}
              total={position.week.sessions.length}
              color={theme.cream}
              track={theme.backgroundSelected}
            />
          </Card>
        </Pressable>
      )}

      {/* Personal health (placeholder until a watch or Strava is connected) */}
      <Card title="Health" source="Connect a device">
        <View style={styles.metrics}>
          {['Sleep', 'HRV', 'Resting HR', 'Steps'].map((label) => (
            <View key={label} style={[styles.metric, { backgroundColor: theme.background }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {label}
              </ThemedText>
              <ThemedText type="subtitle" style={styles.metricValue}>
                —
              </ThemedText>
            </View>
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Sleep, HRV, resting heart rate and steps appear here once you connect Strava or your watch
          (More › Devices).
        </ThemedText>
      </Card>

      <Card title="Upcoming event" source="Coming soon">
        <ThemedText themeColor="textSecondary">Your next race or camp will show here.</ThemedText>
      </Card>

      {data.goals && (
        <Card title="Your goal">
          <ThemedText>{data.goals}</ThemedText>
        </Card>
      )}
    </>
  );
}

function WeekProgress({
  done,
  total,
  color,
  track,
}: {
  done: number;
  total: number;
  color: string;
  track: string;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <View
      style={styles.progressWrap}
      accessibilityLabel={`${done} of ${total} sessions done this week`}
    >
      <View style={[styles.progressTrack, { backgroundColor: track }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {done} of {total} sessions done this week
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  todayRow: { gap: Spacing.two },
  sessionName: { fontSize: 26, lineHeight: 32 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metric: { flexBasis: '47%', flexGrow: 1, borderRadius: 10, padding: Spacing.three, gap: 2 },
  metricValue: { fontSize: 28, lineHeight: 34 },
  progressWrap: { gap: Spacing.one, marginTop: Spacing.one },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
});
