import type { FeedPost } from '@continuum/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/community/post-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fetchFeed } from '@/lib/community';

/** The latest community posts, under the personal cards on Home (brief, slide 3). */
export function CommunityPreview({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchFeed(userId, 3).then(
        (p) => active && setPosts(p),
        () => active && setPosts([]),
      );
      return () => {
        active = false;
      };
    }, [userId]),
  );

  if (!posts) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Community
        </ThemedText>
        <ThemedText
          type="eyebrow"
          themeColor="accent"
          accessibilityRole="button"
          onPress={() => router.push('/community')}
        >
          See all
        </ThemedText>
      </View>
      {posts.length === 0 ? (
        <ThemedText themeColor="textSecondary">Nothing yet. Be the first to post.</ThemedText>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            numberOfLines={3}
            onPress={() =>
              router.push({ pathname: '/community/[postId]', params: { postId: post.id } })
            }
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three, marginTop: Spacing.two },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
