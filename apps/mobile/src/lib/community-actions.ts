import type { FeedPost } from '@continuum/shared';
import { Alert } from 'react-native';

import { deletePost, reportPost } from './community';

/** The "…" menu on a post: delete your own (or any, for coaches), or report someone else's. */
export function postActions(post: FeedPost, userId: string, staff: boolean, onChange: () => void) {
  const mine = post.authorId === userId;
  const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];
  if (mine || staff) {
    buttons.push({
      text: 'Delete post',
      style: 'destructive',
      onPress: () =>
        Alert.alert('Delete this post?', 'This can’t be undone.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => void deletePost(post.id).then(onChange, onChange),
          },
        ]),
    });
  }
  if (!mine) {
    buttons.push({
      text: 'Report post',
      onPress: () =>
        void reportPost(post.id, userId).then(() =>
          Alert.alert('Thanks', 'Your coaches will take a look.'),
        ),
    });
  }
  buttons.push({ text: 'Cancel', style: 'cancel' });
  Alert.alert('Post', undefined, buttons);
}
