import { postBodySchema, type FeedPost } from '@continuum/shared';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/community/post-card';
import { Card, TabScreen } from '@/components/layout';
import { LockedCard } from '@/components/locked';
import { ThemedText } from '@/components/themed-text';
import { Button, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { postActions } from '@/lib/community-actions';
import { createPost, fetchFeed, setLiked } from '@/lib/community';
import { canUse } from '@/lib/entitlements';
import { useHomeData } from '@/lib/home';
import { useSession } from '@/lib/session';

/** The whole organization's feed, with a composer at the top. */
export default function CommunityScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: home } = useHomeData();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setPosts(await fetchFeed(userId));
      setError(false);
    } catch {
      setError(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (userId)
        fetchFeed(userId).then(
          (p) => active && (setPosts(p), setError(false)),
          () => active && setError(true),
        );
      return () => {
        active = false;
      };
    }, [userId]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const staff = home?.entitlements?.staff ?? false;
  const canView = canUse(home?.entitlements, 'community.view');
  const canPost = canUse(home?.entitlements, 'community.post');

  const submit = async () => {
    const body = postBodySchema.safeParse(draft);
    if (!body.success || !userId || !home?.organizationId) return;
    setPosting(true);
    try {
      await createPost(home.organizationId, userId, body.data);
      setDraft('');
      await load();
    } catch {
      Alert.alert('Couldn’t post', 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const like = async (post: FeedPost) => {
    if (!userId) return;
    // Optimistic: flip it now, reload to settle.
    setPosts(
      (all) =>
        all?.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
            : p,
        ) ?? null,
    );
    await setLiked(post.id, userId, !post.likedByMe).catch(() => undefined);
    await load();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Community' }} />
      <TabScreen refreshing={refreshing} onRefresh={refresh}>
        {home && !canView ? (
          <LockedCard title="Community" planName={home.entitlements?.plan?.name} />
        ) : (
          <>
            {canPost && (
              <Card>
                <Input
                  accessibilityLabel="New post"
                  placeholder="Share a win, ask a question…"
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  maxLength={4000}
                  style={styles.composer}
                />
                <Button title="Post" onPress={submit} loading={posting} />
              </Card>
            )}
            {!posts && !error && <ActivityIndicator />}
            {error && (
              <ThemedText themeColor="textSecondary">
                Couldn’t load the feed. Pull down to try again.
              </ThemedText>
            )}
            {posts?.length === 0 && (
              <ThemedText themeColor="textSecondary">No posts yet. Say hello!</ThemedText>
            )}
            <View style={styles.list}>
              {posts?.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  numberOfLines={8}
                  onPress={() =>
                    router.push({ pathname: '/community/[postId]', params: { postId: post.id } })
                  }
                  onLike={() => like(post)}
                  onMore={
                    userId ? () => postActions(post, userId, staff, () => void load()) : undefined
                  }
                />
              ))}
            </View>
          </>
        )}
      </TabScreen>
    </>
  );
}

const styles = StyleSheet.create({
  composer: { minHeight: 72, textAlignVertical: 'top' },
  list: { gap: Spacing.three },
});
