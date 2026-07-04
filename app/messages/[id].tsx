import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileAvatar, SafetySheet } from '@/components/communication';
import { Button, LoadingState } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useMessaging } from '@/context/MessagingContext';
import {
  createClientNonce,
  formatCommunicationError,
  loadConversationDetail,
  loadRelationshipStatus,
  loadMessages,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
} from '@/lib/communication';
import { routes } from '@/lib/routes';
import type {
  ConversationDetail,
  MessageRecord,
} from '@/types/communication';

const MESSAGE_LIMIT = 2000;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess, showWarning } = useFeedback();
  const { refreshUnread } = useMessaging();
  const isFocused = useIsFocused();
  const listRef = useRef<FlatList<MessageRecord>>(null);
  const sending = useRef(false);
  const isNearBottom = useRef(true);
  const initialScrollComplete = useRef(false);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [reportedMessageId, setReportedMessageId] = useState<string | null>(null);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const markRead = useCallback(async () => {
    try {
      await markConversationRead(id);
      await refreshUnread();
    } catch {
      // A resume or the next focus event will safely retry.
    }
  }, [id, refreshUnread]);

  const refreshMessages = useCallback(async (markAsRead: boolean) => {
    const result = await loadMessages(id);
    setMessages((current) => mergeMessages(current, result));
    setHasEarlier(result.length >= 40);
    if (markAsRead) await markRead();
  }, [id, markRead]);

  useEffect(() => {
    let active = true;
    Promise.all([loadConversationDetail(id), loadMessages(id)])
      .then(async ([detailResult, messageResult]) => {
        if (!active) return;
        setDetail(detailResult);
        setMessages(messageResult);
        setHasEarlier(messageResult.length >= 40);
        const relationship = await loadRelationshipStatus(
          detailResult.otherProfile.id,
        );
        if (active) {
          setBlockedByMe(relationship.blockedByMe);
          requestAnimationFrame(() =>
            listRef.current?.scrollToEnd({ animated: false }),
          );
          if (isFocused) void markRead();
        }
      })
      .catch((loadError) => {
        if (active) setError(formatCommunicationError(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isFocused, markRead]);

  useFocusEffect(
    useCallback(() => {
      if (!isLoading) void markRead();
      return undefined;
    }, [isLoading, markRead]),
  );

  useEffect(() => {
    const unsubscribe = subscribeToConversation(id, (incoming) => {
      setMessages((current) => mergeMessages(current, [incoming]));
      if (isFocused && incoming.senderProfileId !== user?.id) void markRead();
      if (isNearBottom.current || incoming.senderProfileId === user?.id) {
        requestAnimationFrame(() =>
          listRef.current?.scrollToEnd({ animated: true }),
        );
      } else {
        setNewMessageCount((count) => count + 1);
      }
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshMessages(isFocused).catch((loadError) =>
          setError(formatCommunicationError(loadError)),
        );
      }
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [id, isFocused, markRead, refreshMessages, user?.id]);

  async function submit(existing?: MessageRecord) {
    const body = (existing?.body ?? draft).trim();
    if (!body || body.length > MESSAGE_LIMIT || sending.current) return;

    const nonce = existing?.clientNonce ?? createClientNonce();
    const optimistic: MessageRecord = {
      id: existing?.id ?? `pending:${nonce}`,
      conversationId: id,
      senderProfileId: user?.id ?? '',
      body,
      clientNonce: nonce,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      deliveryState: 'pending',
    };
    sending.current = true;
    setError(null);
    setDraft('');
    setMessages((current) => mergeMessages(current, [optimistic]));
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

    try {
      const saved = await sendMessage(id, body, nonce);
      setMessages((current) => mergeMessages(current, [saved]));
    } catch (sendError) {
      setMessages((current) =>
        current.map((message) =>
          message.clientNonce === nonce
            ? { ...message, deliveryState: 'failed' }
            : message,
        ),
      );
      setError(formatCommunicationError(sendError));
    } finally {
      sending.current = false;
    }
  }

  async function loadEarlier() {
    const first = messages.find((message) => !message.id.startsWith('pending:'));
    if (!first || isLoadingEarlier) return;
    setIsLoadingEarlier(true);
    try {
      const result = await loadMessages(id, first.createdAt);
      setMessages((current) => mergeMessages(result, current));
      setHasEarlier(result.length >= 40);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingEarlier(false);
    }
  }

  function openMessageActions(message: MessageRecord) {
    const mine = message.senderProfileId === user?.id;
    Alert.alert('Message options', undefined, [
      {
        text: 'Copy',
        onPress: () => {
          void Clipboard.setStringAsync(message.body)
            .then(() => showSuccess('Message copied.'))
            .catch(() => showWarning('Message could not be copied.'));
        },
      },
      ...(!mine
        ? [
            {
              text: 'Report message',
              style: 'destructive' as const,
              onPress: () => {
                setReportedMessageId(message.id);
                setSafetyOpen(true);
              },
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (isLoading) return <LoadingState message="Opening conversation" />;
  if (!detail) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.error}>{error ?? 'This conversation is unavailable.'}</Text>
          <Button label="Go back" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const readOnly = detail.status !== 'active';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.iconButton}>
            <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.profile(detail.otherProfile.id))}
            style={styles.identity}>
            <ProfileAvatar profile={detail.otherProfile} size={40} />
            <View style={styles.identityCopy}>
              <Text numberOfLines={1} style={styles.name}>
                {detail.otherProfile.displayName}
              </Text>
              <Text numberOfLines={1} style={styles.context}>
                {detail.type === 'opportunity'
                  ? detail.opportunityTitle
                  : 'Connection'}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel="Conversation safety options"
            onPress={() => {
              setReportedMessageId(null);
              setSafetyOpen(true);
            }}
            style={styles.iconButton}>
            <Ionicons
              color={theme.colors.text}
              name="ellipsis-horizontal"
              size={22}
            />
          </Pressable>
        </View>

        {detail.type === 'opportunity' && detail.opportunityId ? (
          <View style={styles.opportunityContext}>
            <Pressable
              onPress={() => router.push(routes.opportunity(detail.opportunityId!))}
              style={styles.opportunityBanner}>
              <Ionicons
                color={theme.colors.accentStrong}
                name="briefcase-outline"
                size={18}
              />
              <View style={styles.opportunityCopy}>
                <Text numberOfLines={1} style={styles.opportunityText}>
                  {detail.businessName
                    ? `${detail.businessName}: ${detail.opportunityTitle}`
                    : detail.opportunityTitle}
                </Text>
                <Text style={styles.opportunityMeta}>
                  {[detail.compensationSummary, detail.opportunityStatus]
                    .filter(Boolean)
                    .join(' | ')}
                </Text>
              </View>
              <Ionicons color={theme.colors.muted} name="chevron-forward" size={17} />
            </Pressable>
            {detail.responseNote ||
            detail.responseSkills.length > 0 ||
            detail.responsePortfolioTitle ? (
              <View style={styles.responseContext}>
                <Text style={styles.responseLabel}>Submitted response</Text>
                {detail.responseNote ? (
                  <Text numberOfLines={2} style={styles.responseText}>
                    {detail.responseNote}
                  </Text>
                ) : null}
                {detail.responseSkills.length > 0 ? (
                  <Text numberOfLines={1} style={styles.responseMeta}>
                    Skills: {detail.responseSkills.join(', ')}
                  </Text>
                ) : null}
                {detail.responsePortfolioTitle ? (
                  <Text numberOfLines={1} style={styles.responseMeta}>
                    Portfolio: {detail.responsePortfolioTitle}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <FlatList
          contentContainerStyle={[
            styles.list,
            messages.length === 0 && styles.emptyList,
          ]}
          data={messages}
          keyExtractor={(message) => message.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Start with a thoughtful message. Contact details are shared only if you
              choose to send them.
            </Text>
          }
          ListHeaderComponent={
            hasEarlier ? (
              <Button
                label="Load earlier messages"
                loading={isLoadingEarlier}
                onPress={() => void loadEarlier()}
                variant="ghost"
              />
            ) : null
          }
          onContentSizeChange={() => {
            if (!initialScrollComplete.current) {
              initialScrollComplete.current = true;
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onScroll={({ nativeEvent }) => {
            const distance =
              nativeEvent.contentSize.height -
              nativeEvent.layoutMeasurement.height -
              nativeEvent.contentOffset.y;
            isNearBottom.current = distance < 80;
            if (isNearBottom.current && newMessageCount > 0) {
              setNewMessageCount(0);
            }
          }}
          scrollEventThrottle={80}
          ref={listRef}
          renderItem={({ item }) => {
            const mine = item.senderProfileId === user?.id;
            return (
              <Pressable
                delayLongPress={350}
                onLongPress={() => openMessageActions(item)}
                style={[styles.messageRow, mine && styles.messageRowMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                    {item.body}
                  </Text>
                  <View style={styles.messageMeta}>
                    <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>
                      {new Date(item.createdAt).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                    {item.deliveryState === 'pending' ? (
                      <Text style={[styles.messageTime, styles.messageTimeMine]}>
                        Sending
                      </Text>
                    ) : null}
                  </View>
                </View>
                {item.deliveryState === 'failed' ? (
                  <Pressable onPress={() => void submit(item)}>
                    <Text style={styles.retry}>Not sent. Tap to retry.</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          }}
        />

        {newMessageCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setNewMessageCount(0);
              listRef.current?.scrollToEnd({ animated: true });
            }}
            style={styles.newMessages}>
            <Ionicons color={theme.colors.white} name="arrow-down" size={17} />
            <Text style={styles.newMessagesText}>
              {newMessageCount === 1
                ? '1 new message'
                : `${newMessageCount} new messages`}
            </Text>
          </Pressable>
        ) : null}
        {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        {readOnly ? (
          <View style={styles.readOnly}>
            <Ionicons color={theme.colors.muted} name="lock-closed-outline" size={18} />
            <Text style={styles.readOnlyText}>
              This conversation is read-only.
            </Text>
          </View>
        ) : (
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Message"
              maxLength={MESSAGE_LIMIT}
              multiline
              onChangeText={setDraft}
              placeholder="Write a message"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
              value={draft}
            />
            <Pressable
              accessibilityLabel="Send message"
              disabled={!draft.trim() || sending.current}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.send,
                (!draft.trim() || sending.current) && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <Ionicons color={theme.colors.white} name="arrow-up" size={22} />
            </Pressable>
          </View>
        )}

        <SafetySheet
          blockedByMe={blockedByMe}
          onClose={() => setSafetyOpen(false)}
          onStateChange={() => router.back()}
          profileId={detail.otherProfile.id}
          targetId={reportedMessageId ?? detail.id}
          targetKind={reportedMessageId ? 'message' : 'conversation'}
          visible={safetyOpen}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function mergeMessages(
  current: MessageRecord[],
  incoming: MessageRecord[],
) {
  const byKey = new Map<string, MessageRecord>();
  for (const message of [...current, ...incoming]) {
    const key = message.clientNonce
      ? `nonce:${message.clientNonce}`
      : `id:${message.id}`;
    const previous = byKey.get(key);
    if (!previous || message.deliveryState === 'sent') byKey.set(key, message);
  }
  return [...byKey.values()].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.background, flex: 1 },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.lg,
    justifyContent: 'center',
    padding: theme.layout.screenPadding,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 64,
    paddingHorizontal: theme.spacing.md,
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  identity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minWidth: 0,
  },
  identityCopy: { flex: 1, minWidth: 0 },
  name: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '900' },
  context: { color: theme.colors.muted, fontSize: theme.typography.tiny },
  opportunityBanner: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 42,
    paddingHorizontal: theme.spacing.lg,
  },
  opportunityContext: {
    backgroundColor: theme.colors.accentSoft,
    borderBottomColor: 'rgba(167,139,250,0.18)',
    borderBottomWidth: 1,
  },
  opportunityCopy: { flex: 1, minWidth: 0 },
  opportunityText: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.tiny,
    fontWeight: '800',
  },
  opportunityMeta: {
    color: theme.colors.muted,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  responseContext: {
    borderTopColor: 'rgba(167,139,250,0.18)',
    borderTopWidth: 1,
    gap: 3,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  responseLabel: {
    color: theme.colors.accentStrong,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  responseText: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.tiny,
    lineHeight: 17,
  },
  responseMeta: {
    color: theme.colors.muted,
    fontSize: 10,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  emptyList: { justifyContent: 'center' },
  empty: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 21,
    textAlign: 'center',
  },
  messageRow: {
    alignItems: 'flex-start',
    marginVertical: 3,
    maxWidth: '84%',
  },
  messageRowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: {
    borderRadius: theme.radii.lg,
    maxWidth: '100%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: theme.colors.accent,
    borderBottomRightRadius: theme.radii.sm,
  },
  bubbleOther: {
    backgroundColor: theme.colors.surfaceMuted,
    borderBottomLeftRadius: theme.radii.sm,
  },
  messageText: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    lineHeight: 22,
  },
  messageTextMine: { color: theme.colors.white },
  messageMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: { color: theme.colors.muted, fontSize: 10 },
  messageTimeMine: { color: '#C8CBD4' },
  retry: { color: theme.colors.danger, fontSize: 11, marginTop: 3 },
  inlineError: {
    color: theme.colors.danger,
    fontSize: theme.typography.tiny,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    textAlign: 'center',
  },
  newMessages: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  newMessagesText: {
    color: theme.colors.white,
    fontSize: theme.typography.tiny,
    fontWeight: '900',
  },
  composer: {
    alignItems: 'flex-end',
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.body,
    maxHeight: 120,
    minHeight: 46,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 11,
  },
  send: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  readOnly: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    minHeight: 58,
    padding: theme.spacing.md,
  },
  readOnlyText: { color: theme.colors.muted, fontSize: theme.typography.small },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
});
