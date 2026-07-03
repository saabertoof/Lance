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
import { Button, Screen } from '@/components/ui';
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
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
      style={styles.canvas}
      contentStyle={styles.screen}>
      <View style={styles.console}>
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
            variant="operator"
          />
          <Pressable
            accessibilityLabel="New message"
            accessibilityRole="button"
            onPress={() => setComposeOpen(true)}
            style={({ pressed }) => [
              styles.compose,
              pressed && styles.pressed,
            ]}>
            <Ionicons color={v.purpleStrong} name="create-outline" size={20} />
          </Pressable>
        </View>
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
            <InboxState body={error} icon="warning-outline" title="Inbox unavailable" />
            <Button
              label="Retry"
              labelStyle={styles.primaryButtonLabel}
              onPress={() => void load()}
              style={styles.primaryButton}
            />
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
                  labelStyle={styles.ghostButtonLabel}
                  loading={isLoadingMore}
                  onPress={() => void loadMoreChats()}
                  style={styles.ghostButton}
                  variant="ghost"
                />
              ) : null}
            </View>
          ) : debouncedQuery ? (
            <InboxState
              body="Try another name, username, opportunity, business, or message phrase."
              icon="search-outline"
              title="No conversations found"
            />
          ) : (
            <View style={styles.state}>
              <InboxState
                body="Start with a builder, applicant, or opportunity match."
                icon="chatbubble-ellipses-outline"
                title="No conversations yet"
              />
              <View style={styles.emptyActions}>
                <Button
                  label="Discover people"
                  labelStyle={styles.primaryButtonLabel}
                  onPress={() => router.push('/discover')}
                  style={styles.primaryButton}
                />
                <Button
                  label="Browse opportunities"
                  labelStyle={styles.secondaryButtonLabel}
                  onPress={() => router.push('/search')}
                  style={styles.secondaryButton}
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
                      labelStyle={styles.ghostButtonLabel}
                      loading={isLoadingMore}
                      onPress={() => void loadMoreRequests()}
                      style={styles.ghostButton}
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
                      labelStyle={styles.ghostButtonLabel}
                      loading={isLoadingMore}
                      onPress={() => void loadMoreResponses()}
                      style={styles.ghostButton}
                      variant="ghost"
                    />
                  ) : null}
                </RequestSection>
              ) : null}
            </View>
          ) : (
            <InboxState
              body={
                direction === 'received'
                  ? 'Requests and applications will show up here.'
                  : 'Connect requests and opportunity applications you send will appear here.'
              }
              icon="file-tray-outline"
              title={direction === 'received' ? 'No requests yet' : 'No sent requests'}
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

function InboxState({
  body,
  icon,
  title,
}: {
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.inboxState}>
      <View style={styles.stateIcon}>
        <Ionicons color={v.purpleStrong} name={icon} size={20} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
    </View>
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
      <View style={styles.requestGroup}>{children}</View>
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
  canvas: {
    backgroundColor: v.background,
  },
  screen: {
    gap: 10,
    paddingBottom: 44,
  },
  console: {
    gap: 0,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  compose: {
    alignItems: 'center',
    backgroundColor: '#0E0E16',
    borderColor: v.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sections: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: v.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  sectionTab: {
    alignItems: 'center',
    borderRadius: 15,
    flex: 1,
    minHeight: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  sectionLabelRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  sectionLabel: {
    color: v.textSoft,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionLabelSelected: {
    color: v.purpleStrong,
  },
  sectionIndicator: {
    backgroundColor: 'transparent',
    borderRadius: 2,
    bottom: 0,
    height: 2,
    left: 18,
    position: 'absolute',
    right: 18,
  },
  sectionIndicatorSelected: {
    backgroundColor: v.purple,
  },
  requestBadge: {
    alignItems: 'center',
    backgroundColor: v.purple,
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 5,
  },
  requestBadgeText: {
    color: v.white,
    fontSize: 10,
    fontWeight: '600',
  },
  direction: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: v.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
    marginTop: 0,
    padding: 3,
  },
  directionTab: {
    alignItems: 'center',
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 96,
    paddingHorizontal: 14,
  },
  directionTabSelected: {
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderWidth: 1,
  },
  directionLabel: {
    color: v.textSoft,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  directionLabelSelected: {
    color: v.purpleStrong,
  },
  contentFill: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    gap: 8,
    paddingTop: 2,
  },
  requestList: {
    gap: 14,
    paddingTop: 2,
  },
  requestSection: {
    gap: 8,
  },
  requestGroup: {
    gap: 8,
  },
  requestTitle: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  state: {
    gap: 10,
  },
  emptyActions: {
    gap: 8,
  },
  error: {
    color: v.danger,
    fontFamily: operatorFonts.sans,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  inboxState: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: 18,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stateTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  stateBody: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: v.purple,
    borderColor: v.purple,
    borderWidth: 1,
    minHeight: 42,
  },
  secondaryButton: {
    backgroundColor: v.surface,
    borderColor: v.borderPurple,
    borderWidth: 1,
    minHeight: 42,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderColor: v.border,
    borderWidth: 1,
    minHeight: 40,
  },
  primaryButtonLabel: {
    color: v.white,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButtonLabel: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  ghostButtonLabel: {
    color: v.textSoft,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  skeletonList: {
    gap: 8,
    paddingTop: 2,
  },
  skeletonRow: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 74,
    paddingHorizontal: 12,
  },
  skeletonAvatar: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 23,
    height: 46,
    width: 46,
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 5,
    height: 10,
  },
  pressed: {
    opacity: 0.65,
  },
});
