import { timeAgo } from '@continuum/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';

import { ActivityRow } from '@/components/activity-row';
import { Card, Rule, SoonTag, TabScreen } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  disconnectDevice,
  fetchActivities,
  fetchConnections,
  type Activity,
  type DeviceConnection,
} from '@/lib/devices';
import { canUse } from '@/lib/entitlements';
import type { HomeData } from '@/lib/home';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

/**
 * More › Devices. Strava connects through the web app (its sign-in flow needs the web server);
 * Apple Health and Health Connect will connect right here once the native modules are added.
 */
export function DevicesScreen({ data }: { data: HomeData | null }) {
  const athleteProfileId = data?.athleteProfileId ?? null;
  const [connections, setConnections] = useState<DeviceConnection[] | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  const load = useCallback(async () => {
    if (!athleteProfileId) return;
    const [c, a] = await Promise.all([
      fetchConnections(athleteProfileId).catch(() => []),
      fetchActivities(athleteProfileId, 10).catch(() => []),
    ]);
    setConnections(c);
    setActivities(a);
  }, [athleteProfileId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const strava = connections?.find((c) => c.provider === 'strava');
  const allowed = canUse(data?.entitlements, 'devices.strava');

  const disconnect = (c: DeviceConnection) =>
    Alert.alert(
      'Disconnect Strava?',
      'New activities will stop coming in. Ones already imported stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => void disconnectDevice(c.id).then(load, load),
        },
      ],
    );

  return (
    <TabScreen>
      {!connections ? (
        <ActivityIndicator />
      ) : (
        <>
          <Card title="Strava" source={strava?.status === 'active' ? 'Connected' : undefined}>
            <ThemedText themeColor="textSecondary">
              {!allowed
                ? 'Strava isn’t included in your plan.'
                : strava?.status === 'active'
                  ? `Activities come in automatically${strava.lastSyncedAt ? `. Last synced ${timeAgo(strava.lastSyncedAt)}` : ''}.`
                  : strava?.status === 'error'
                    ? `Sync problem: ${strava.lastError ?? 'unknown'}. Reconnect from the web app.`
                    : 'Connect Strava from the web app (Devices page) and your runs and rides will show up here.'}
            </ThemedText>
            {allowed && strava && strava.status !== 'revoked' ? (
              <Button title="Disconnect" variant="secondary" onPress={() => disconnect(strava)} />
            ) : allowed && WEB_URL ? (
              <Button
                title="Open web app to connect"
                onPress={() => void Linking.openURL(`${WEB_URL}/dashboard/devices`)}
              />
            ) : null}
          </Card>

          {['Apple Health', 'Garmin'].map((name) => (
            <Card key={name} title={name} source="Coming soon">
              <ThemedText themeColor="textSecondary">
                {name === 'Apple Health'
                  ? 'Sleep, HRV, resting heart rate and steps from your iPhone and Apple Watch.'
                  : 'Workouts and health data from your Garmin watch.'}
              </ThemedText>
            </Card>
          ))}

          <Card title="Recent activities">
            {activities.length === 0 ? (
              <ThemedText themeColor="textSecondary">Nothing imported yet.</ThemedText>
            ) : (
              activities.map((a, i) => (
                <View key={a.id}>
                  {i > 0 && <Rule />}
                  <ActivityRow activity={a} />
                </View>
              ))
            )}
          </Card>
          <View style={styles.note}>
            <SoonTag label="Health data coming soon" />
          </View>
        </>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({ note: { alignItems: 'center', marginTop: Spacing.two } });
