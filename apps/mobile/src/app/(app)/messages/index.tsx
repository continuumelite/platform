import {
  messageBodySchema,
  messageErrorText,
  newId,
  timeAgo,
  type ChatMessage,
} from '@continuum/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockedCard } from '@/components/locked';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canUse } from '@/lib/entitlements';
import { useHomeData } from '@/lib/home';
import { fetchMessages, getThread, markRead, sendMessage, subscribeToThread } from '@/lib/messages';
import { useSession } from '@/lib/session';

/** Coach hub: the athlete's conversation with their coaches, updating live. */
export default function MessagesScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: home } = useHomeData();
  const athleteProfileId = home?.athleteProfileId ?? null;
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const reload = useCallback(
    async (thread: string) => {
      const list = await fetchMessages(thread);
      setMessages(list);
      if (userId) void markRead(thread, userId);
    },
    [userId],
  );

  useEffect(() => {
    if (!athleteProfileId) return;
    let active = true;
    let unsubscribe = () => {};
    getThread(athleteProfileId)
      .then(async (thread) => {
        if (!active) return;
        setThreadId(thread);
        await reload(thread);
        unsubscribe = subscribeToThread(thread, () => void reload(thread));
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [athleteProfileId, reload]);

  const send = async () => {
    const body = messageBodySchema.safeParse(draft);
    if (!body.success || !threadId || !userId) return;
    setSending(true);
    const { error } = await sendMessage({
      id: newId(),
      threadId,
      senderId: userId,
      body: body.data,
    });
    setSending(false);
    if (error) {
      Alert.alert('Not sent', messageErrorText(error));
      return;
    }
    setDraft('');
    await reload(threadId);
  };

  const locked = home && !canUse(home.entitlements, 'messaging');
  const coachName = home?.coachName ?? 'your coach';

  return (
    <>
      <Stack.Screen options={{ title: 'Coach hub' }} />
      <ThemedView style={styles.flex}>
        {locked ? (
          <View style={styles.padded}>
            <LockedCard title="Messaging" planName={home.entitlements?.plan?.name} />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={100}
          >
            {failed && (
              <ThemedText themeColor="textSecondary" style={styles.padded}>
                Couldn’t open your conversation. Try again later.
              </ThemedText>
            )}
            {!messages && !failed && <ActivityIndicator style={styles.padded} />}
            {messages && (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m) => m.id}
                contentContainerStyle={styles.list}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                  <ThemedText themeColor="textSecondary" style={styles.empty}>
                    Questions about training, food or how you’re feeling? Message {coachName} here.
                  </ThemedText>
                }
                renderItem={({ item }) => {
                  const mine = item.senderId === userId;
                  return (
                    <View style={[styles.row, mine && styles.rowMine]}>
                      <View
                        style={[
                          styles.bubble,
                          { backgroundColor: mine ? theme.cream : theme.backgroundElement },
                        ]}
                      >
                        {!mine && (
                          <ThemedText type="small" style={{ color: theme.cream }}>
                            {item.senderName}
                          </ThemedText>
                        )}
                        <ThemedText style={mine && { color: theme.background }}>
                          {item.body}
                        </ThemedText>
                        <ThemedText
                          type="small"
                          style={[
                            styles.time,
                            { color: mine ? theme.backgroundSelected : theme.textSecondary },
                          ]}
                        >
                          {timeAgo(item.createdAt)}
                        </ThemedText>
                      </View>
                    </View>
                  );
                }}
              />
            )}
            <SafeAreaView
              edges={['bottom']}
              style={[styles.composer, { borderTopColor: theme.rule }]}
            >
              <Input
                accessibilityLabel="Message"
                placeholder={`Message ${coachName}…`}
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={4000}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                onPress={send}
                disabled={sending || !draft.trim()}
                style={[
                  styles.send,
                  { backgroundColor: theme.cream },
                  (sending || !draft.trim()) && styles.dim,
                ]}
              >
                <Ionicons name="arrow-up" size={20} color={theme.background} />
              </Pressable>
            </SafeAreaView>
          </KeyboardAvoidingView>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: Spacing.four },
  list: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: Spacing.six },
  row: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  time: { fontSize: 11, lineHeight: 14, alignSelf: 'flex-end' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, maxHeight: 120 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.4 },
});
