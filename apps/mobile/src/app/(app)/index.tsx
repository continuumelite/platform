import { isCoachingRole, type OrgRole } from '@continuum/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type Home = {
  firstName: string | null;
  role: OrgRole | null;
  organizationName: string | null;
  coachName: string | null;
  goals: string | null;
};

export default function TodayScreen() {
  const { session } = useSession();
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    (async () => {
      const [profile, membership, athlete] = await Promise.all([
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
      ]);

      if (profile.error || membership.error || athlete.error) {
        setError(true);
        return;
      }

      setHome({
        firstName: profile.data?.full_name?.split(' ')[0] ?? null,
        role: membership.data?.role ?? null,
        organizationName: membership.data?.organizations?.name ?? null,
        coachName:
          athlete.data?.coaches.find((c) => c.role === 'primary')?.coach?.full_name ?? null,
        goals: athlete.data?.goals ?? null,
      });
    })();
  }, [session?.user.id]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              {today}
            </ThemedText>
            <ThemedText type="subtitle">
              {home?.firstName ? `Hi ${home.firstName}` : 'Today'}
            </ThemedText>
            {home?.organizationName && (
              <ThemedText type="small" themeColor="textSecondary">
                {home.organizationName}
              </ThemedText>
            )}
          </View>

          {!home && !error && <ActivityIndicator />}
          {error && <ThemedText>Couldn’t load your plan. Pull down to try again later.</ThemedText>}

          {home && (
            <>
              {home.role && isCoachingRole(home.role) ? (
                <Card title="Coach account">
                  <ThemedText themeColor="textSecondary">
                    Manage athletes and programs from the web dashboard. Coach tools in the app are
                    coming later.
                  </ThemedText>
                </Card>
              ) : (
                <>
                  <Card title="Today’s session">
                    <ThemedText themeColor="textSecondary">
                      {home.coachName
                        ? `${home.coachName} hasn’t assigned a program yet. Your workouts will show up here.`
                        : 'Your workouts will show up here once your coach assigns a program.'}
                    </ThemedText>
                  </Card>
                  {home.goals && (
                    <Card title="Your goal">
                      <ThemedText>{home.goals}</ThemedText>
                    </Card>
                  )}
                </>
              )}
            </>
          )}

          <View style={styles.footer}>
            <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  footer: { marginTop: Spacing.four },
});
