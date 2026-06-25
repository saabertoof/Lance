import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ChatRow,
  ComposeMessageSheet,
  ConnectionRequestRow,
  OpportunityResponseRow,
} from '@/components/communication';
import { SearchBar } from '@/components/discovery';
import { Button, EmptyState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAdaptiveTabBar } from '@/context/AdaptiveTabBarContext';
import { useMessaging } from '@/context/MessagingContext';
import {
  COMMUNICATION_PAGE_SIZE,
  formatCommunicationError,
  loadConnectionRequests,
  loadConversationSummaries,
  loadOpportunityResponses,
  loadPendingInboxRequestCount,
  subscribeToInbox,
} from '@/lib/communication';
import { routes } from '@/lib/routes';
import type {
  ConnectionRequestRecord,
  ConversationSummary,
  OpportunityResponseRecord,
} from '@/types/communication';

type MainTab = 'chats' | 'requests';
type Direction = 'received' | 'sent';

export default function MessagesScreen() {
  const params = useLocalSearchParams<{
    direction?: string;
    view?: string;
  }>();
  const { refreshUnread } = useMessaging();
  const { expand } = useAdaptiveTabBar();
  const mounted = useRef(true);
  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>(
    params.view === 'requests' ? 'requests' : 'chats',
  );
  const [direction, setDirection] = useState<Direction>(
    params.direction === 'sent' ? 'sent' : 'received',
  );
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [chats, setChats] = useState<ConversationSummary[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<
    ConnectionRequestRecord[]
  >([]);
  const [opportunityResponses, setOpportunityResponses] = useState<
    OpportunityResponseRecord[]
  >([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreChats, setHasMoreChats] = useState(false);
  const [hasMoreRequests, setHasMoreRequests] = useState(false);
  const [hasMoreResponses, setHasMoreResponses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (params.view === 'requests') setMainTab('requests');
    if (params.direction === 'sent' || params.direction === 'received') {
      setDirection(params.direction);
    }
  }, [params.direction, params.view]);

  const load = useCallback(
    async (refreshing = false, silent = false) => {
      if (refreshing) setIsRefreshing(true);
      else if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [chatResult, requestResult, responseResult, pendingCount] =
          await Promise.all([
            loadConversationSummaries(),
            loadConnectionRequests(direction),
            loadOpportunityResponses({ direction }),
            loadPendingInboxRequestCount(),
          ]);
        if (!mounted.current) return;
        setChats(chatResult);
        setConnectionRequests(requestResult);
        setOpportunityResponses(responseResult);
        setPendingRequestCount(pendingCount);
        setHasMoreChats(chatResult.length === COMMUNICATION_PAGE_SIZE);
        setHasMoreRequests(requestResult.length === COMMUNICATION_PAGE_SIZE);
        setHasMoreResponses(responseResult.length === COMMUNICATION_PAGE_SIZE);
        await refreshUnread();
      } catch (loadError) {
        if (mounted.current) setError(formatCommunicationError(loadError));
      } finally {
        if (mounted.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [direction, refreshUnread],
  );

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      void load();
      const unsubscribe = subscribeToInbox(() => {
        if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
        realtimeTimer.current = setTimeout(() => {
          if (mounted.current) void load(false, true);
        }, 300);
      });
      return () => {
        mounted.current = false;
        if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
        realtimeTimer.current = null;
        unsubscribe();
      };
    }, [load]),
  );

  const filteredChats = useMemo(() => {
    const normalized = debouncedQuery.toLowerCase();
    if (!normalized) return chats;
    return chats.filter((chat) =>
      [
        chat.otherProfile.displayName,
        chat.otherProfile.username,
        chat.opportunityTitle,
        chat.businessName,
        chat.lastMessageBody,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [chats, debouncedQuery]);

  async function loadMoreChats() {
    if (isLoadingMore || !hasMoreChats) return;
    setIsLoadingMore(true);
    try {
      const next = await loadConversationSummaries(chats.length);
      setChats((current) => mergeById(current, next));
      setHasMoreChats(next.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function loadMoreRequests() {
    if (isLoadingMore || !hasMoreRequests) return;
    setIsLoadingMore(true);
    try {
      const next = await loadConnectionRequests(
        direction,
        connectionRequests.length,
      );
      setConnectionRequests((current) => mergeById(current, next));
      setHasMoreRequests(next.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function loadMoreResponses() {
    if (isLoadingMore || !hasMoreResponses) return;
    setIsLoadingMore(true);
    try {
      const next = await loadOpportunityResponses({
        direction,
        offset: opportunityResponses.length,
      });
      setOpportunityResponses((current) => mergeById(current, next));
      setHasMoreResponses(next.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  function selectMainTab(value: MainTab) {
    setMainTab(value);
    if (value === 'requests') setQuery('');
    expand();
  }

  return (
    <Screen
      compact
      onRefresh={() => void load(true)}
      refreshing={isRefreshing}
      scroll
      contentStyle={styles.screen}>
      <View style={styles.topRow}>
        <SearchBar
          accessibilityLabel="Search messages"
          clearAccessibilityLabel="Clear message search"
          onChangeText={(value) => {
            setQuery(value);
            if (value && mainTab !== 'chats') setMainTab('chats');
          }}
          placeholder="Search messages"
          value={query}
        />
        <Pressable
          accessibilityLabel="New message"
          accessibilityRole="button"
          onPress={() => setComposeOpen(true)}
          style={({ pressed }) => [
            styles.compose,
            pressed && styles.pressed,
          ]}>
          <Ionicons color={theme.colors.text} name="create-outline" size={24} />
        </Pressable>
      </View>

      <View accessibilityRole="tablist" style={styles.sections}>
        <SectionTab
          label="Chats"
          onPress={() => selectMainTab('chats')}
          selected={mainTab === 'chats'}
        />
        <SectionTab
          badge={pendingRequestCount}
          label="Requests"
          onPress={() => selectMainTab('requests')}
          selected={mainTab === 'requests'}
        />
      </View>

      {mainTab === 'requests' ? (
        <View style={styles.direction}>
          <DirectionTab
            label="Received"
            onPress={() => {
              setDirection('received');
              expand();
            }}
            selected={direction === 'received'}
          />
          <DirectionTab
            label="Sent"
            onPress={() => {
              setDirection('sent');
              expand();
            }}
            selected={direction === 'sent'}
          />
        </View>
      ) : null}

      <View style={(isLoading || error) && styles.contentFill}>
        {isLoading ? <InboxSkeletons /> : null}

        {!isLoading && error ? (
          <View style={styles.state}>
            <Text style={styles.error}>{error}</Text>
            <Button label="Retry" onPress={() => void load()} />
          </View>
        ) : null}

        {!isLoading && !error && mainTab === 'chats' ? (
          filteredChats.length > 0 ? (
            <View style={styles.list}>
              {filteredChats.map((chat) => (
                <ChatRow
                  chat={chat}
                  key={chat.id}
                  onPress={() => router.push(routes.conversation(chat.id))}
                />
              ))}
              {hasMoreChats && !debouncedQuery ? (
                <Button
                  label="Load more conversations"
                  loading={isLoadingMore}
                  onPress={() => void loadMoreChats()}
                  variant="ghost"
                />
              ) : null}
            </View>
          ) : debouncedQuery ? (
            <EmptyState
              body="Try another name, username, opportunity, business, or message phrase."
              title="No conversations found."
            />
          ) : (
            <View style={styles.state}>
              <EmptyState
                body="Connect with someone or apply to an opportunity to start talking."
                title="No conversations yet"
              />
              <View style={styles.emptyActions}>
                <Button
                  label="Discover people"
                  onPress={() => router.push('/discover')}
                />
                <Button
                  label="Browse opportunities"
                  onPress={() => router.push('/search')}
                  variant="secondary"
                />
              </View>
            </View>
          )
        ) : null}

        {!isLoading && !error && mainTab === 'requests' ? (
          connectionRequests.length + opportunityResponses.length > 0 ? (
            <View style={styles.requestList}>
              {connectionRequests.length > 0 ? (
                <RequestSection title="Connect requests">
                  {connectionRequests.map((request) => (
                    <ConnectionRequestRow
                      direction={direction}
                      key={request.id}
                      onPress={() =>
                        router.push(routes.connectRequest(request.id))
                      }
                      request={request}
                    />
                  ))}
                  {hasMoreRequests ? (
                    <Button
                      label="Load more Connect requests"
                      loading={isLoadingMore}
                      onPress={() => void loadMoreRequests()}
                      variant="ghost"
                    />
                  ) : null}
                </RequestSection>
              ) : null}
              {opportunityResponses.length > 0 ? (
                <RequestSection title="Opportunity applications">
                  {opportunityResponses.map((response) => (
                    <OpportunityResponseRow
                      direction={direction}
                      key={response.id}
                      onPress={() =>
                        router.push(routes.opportunityResponse(response.id))
                      }
                      response={response}
                    />
                  ))}
                  {hasMoreResponses ? (
                    <Button
                      label="Load more opportunity applications"
                      loading={isLoadingMore}
                      onPress={() => void loadMoreResponses()}
                      variant="ghost"
                    />
                  ) : null}
                </RequestSection>
              ) : null}
            </View>
          ) : (
            <EmptyState
              body={
                direction === 'received'
                  ? 'New Connect requests and opportunity applications will appear here.'
                  : 'Connect requests and opportunity applications you send will appear here.'
              }
              title={`No ${direction} requests`}
            />
          )
        ) : null}
      </View>

      <ComposeMessageSheet
        onClose={() => setComposeOpen(false)}
        onSelect={(conversationId) =>
          router.push(routes.conversation(conversationId))
        }
        visible={composeOpen}
      />
    </Screen>
  );
}

function SectionTab({
  badge,
  label,
  onPress,
  selected,
}: {
  badge?: number;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sectionTab,
        pressed && styles.pressed,
      ]}>
      <View style={styles.sectionLabelRow}>
        <Text
          style={[
            styles.sectionLabel,
            selected && styles.sectionLabelSelected,
          ]}>
          {label}
        </Text>
        {badge ? (
          <View style={styles.requestBadge}>
            <Text style={styles.requestBadgeText}>{Math.min(badge, 99)}</Text>
          </View>
        ) : null}
      </View>
      <View
        style={[
          styles.sectionIndicator,
          selected && styles.sectionIndicatorSelected,
        ]}
      />
    </Pressable>
  );
}

function DirectionTab({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.directionTab, selected && styles.directionTabSelected]}>
      <Text
        style={[
          styles.directionLabel,
          selected && styles.directionLabelSelected,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function RequestSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.requestSection}>
      <Text style={styles.requestTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InboxSkeletons() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, { width: '48%' }]} />
            <View style={[styles.skeletonLine, { width: '86%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function mergeById<T extends { id: string }>(current: T[], next: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.density.contentGap,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  compose: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: theme.layout.inputHeight,
    justifyContent: 'center',
    width: theme.layout.inputHeight,
  },
  sections: {
    flexDirection: 'row',
  },
  sectionTab: {
    flex: 1,
    minHeight: 44,
  },
  sectionLabelRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  sectionLabel: {
    color: theme.colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionLabelSelected: {
    color: theme.colors.text,
    fontWeight: '900',
  },
  sectionIndicator: {
    backgroundColor: 'transparent',
    borderRadius: 2,
    height: 3,
  },
  sectionIndicatorSelected: {
    backgroundColor: theme.colors.text,
  },
  requestBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 5,
  },
  requestBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  direction: {
    alignSelf: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.xs,
    padding: 3,
  },
  directionTab: {
    alignItems: 'center',
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    minHeight: theme.layout.minTouchTarget,
    minWidth: 104,
    paddingHorizontal: theme.spacing.md,
  },
  directionTabSelected: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  directionLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  directionLabelSelected: {
    color: theme.colors.text,
  },
  contentFill: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    paddingTop: theme.spacing.sm,
  },
  requestList: {
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  requestSection: {
    gap: theme.spacing.xs,
  },
  requestTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
    marginBottom: theme.spacing.xs,
  },
  state: {
    gap: theme.spacing.md,
  },
  emptyActions: {
    gap: theme.spacing.sm,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  skeletonList: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 78,
  },
  skeletonAvatar: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 29,
    height: 58,
    width: 58,
  },
  skeletonCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  skeletonLine: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 5,
    height: 12,
  },
  pressed: {
    opacity: 0.65,
  },
});
