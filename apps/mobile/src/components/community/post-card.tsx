import { timeAgo, type FeedPost } from '@continuum/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** One post in the feed. Coach posts get a cream edge and a Coach badge. */
export function PostCard({
  post,
  onPress,
  onLike,
  onMore,
  numberOfLines,
}: {
  post: FeedPost;
  onPress?: () => void;
  onLike?: () => void;
  /** Report / delete menu. */
  onMore?: () => void;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        post.fromCoach && { borderLeftWidth: 3, borderLeftColor: theme.cream },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="smallBold">{post.authorName}</ThemedText>
        {post.fromCoach && (
          <View style={[styles.badge, { backgroundColor: theme.cream }]}>
            <ThemedText style={[styles.badgeText, { color: theme.background }]}>Coach</ThemedText>
          </View>
        )}
        {post.pinned && (
          <ThemedText style={[styles.pinned, { color: theme.accent }]}>Pinned</ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          {timeAgo(post.createdAt)}
        </ThemedText>
      </View>
      <ThemedText numberOfLines={numberOfLines}>{post.body}</ThemedText>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={post.likedByMe ? 'Unlike' : 'Like'}
          accessibilityState={{ selected: post.likedByMe }}
          onPress={onLike}
          disabled={!onLike}
          hitSlop={8}
          style={styles.stat}
        >
          <Ionicons
            name={post.likedByMe ? 'heart' : 'heart-outline'}
            size={18}
            color={post.likedByMe ? theme.accent : theme.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {post.likeCount}
          </ThemedText>
        </Pressable>
        <View style={styles.stat}>
          <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            {post.commentCount}
          </ThemedText>
        </View>
        <View style={styles.flex} />
        {onMore && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More actions"
            onPress={onMore}
            hitSlop={8}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  pinned: { fontSize: 10, lineHeight: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
});
