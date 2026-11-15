import { commentBodySchema, timeAgo, type FeedComment, type FeedPost } from '@continuum/shared';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/community/post-card';
import { Card, Rule, TabScreen } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { Button, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { postActions } from '@/lib/community-actions';
import { createComment, fetchPost, setLiked } from '@/lib/community';
import { canUse } from '@/lib/entitlements';
import { useHomeData } from '@/lib/home';
import { useSession } from '@/lib/session';

/** One post with its comments and a reply box. */
export default function PostScreen() {
  const theme = useTheme();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: home } = useHomeData();
  const [data, setData] = useState<
    { post: FeedPost; comments: FeedComment[] } | null | undefined
  >();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !postId) return;
    setData(await fetchPost(userId, postId).catch(() => null));
  }, [userId, postId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (userId && postId)
        fetchPost(userId, postId).then(
          (d) => active && setData(d),
          () => active && setData(null),
        );
      return () => {
        active = false;
      };
    }, [userId, postId]),
  );

  const send = async () => {
    const body = commentBodySchema.safeParse(reply);
    if (!body.success || !userId || !postId) return;
    setSending(true);
    try {
      await createComment(postId, userId, body.data);
      setReply('');
      await load();
    } catch {
      Alert.alert('Couldn’t reply', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const canPost = canUse(home?.entitlements, 'community.post');

  return (
    <>
      <Stack.Screen options={{ title: 'Post' }} />
      <TabScreen>
        {data === undefined && <ActivityIndicator />}
        {data === null && (
          <ThemedText themeColor="textSecondary">This post isn’t available any more.</ThemedText>
        )}
        {data && userId && (
          <>
            <PostCard
              post={data.post}
              onLike={() =>
                void setLiked(data.post.id, userId, !data.post.likedByMe).then(load, load)
              }
              onMore={() =>
                postActions(data.post, userId, home?.entitlements?.staff ?? false, () =>
                  router.back(),
                )
              }
            />
            <Card title={`${data.comments.length} comment${data.comments.length === 1 ? '' : 's'}`}>
              {data.comments.map((c, i) => (
                <View key={c.id}>
                  {i > 0 && <Rule />}
                  <View style={styles.comment}>
                    <View style={styles.commentHeader}>
                      <ThemedText type="smallBold">{c.authorName}</ThemedText>
                      {c.fromCoach && (
                        <ThemedText type="small" style={{ color: theme.cream }}>
                          Coach
                        </ThemedText>
                      )}
                      <ThemedText type="small" themeColor="textSecondary">
                        {timeAgo(c.createdAt)}
                      </ThemedText>
                    </View>
                    <ThemedText>{c.body}</ThemedText>
                  </View>
                </View>
              ))}
              {canPost && (
                <View style={styles.reply}>
                  <Input
                    accessibilityLabel="Write a comment"
                    placeholder="Write a comment…"
                    value={reply}
                    onChangeText={setReply}
                    multiline
                    maxLength={2000}
                  />
                  <Button title="Reply" variant="secondary" onPress={send} loading={sending} />
                </View>
              )}
            </Card>
          </>
        )}
      </TabScreen>
    </>
  );
}

const styles = StyleSheet.create({
  comment: { gap: 2, paddingVertical: Spacing.two },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  reply: { gap: Spacing.two, marginTop: Spacing.two },
});
