import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ChatRow,
  ConnectionRequestRow,
  OpportunityResponseRow,
} from '@/components/communication';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useMessaging } from '@/context/MessagingContext';
import {
  COMMUNICATION_PAGE_SIZE,
  formatCommunicationError,
  loadConnectionRequests,
  loadConversationSummaries,
  loadOpportunityResponses,
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
  const mounted = useRef(true);
  const [mainTab, setMainTab] = useState<MainTab>(
    params.view === 'requests' ? 'requests' : 'chats',
  );
  const [direction, setDirection] = useState<Direction>(
    params.direction === 'sent' ? 'sent' : 'received',
  );
  const [chats, setChats] = useState<ConversationSummary[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<
    ConnectionRequestRecord[]
  >([]);
  const [opportunityResponses, setOpportunityResponses] = useState<
    OpportunityResponseRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreChats, setHasMoreChats] = useState(false);
  const [hasMoreRequests, setHasMoreRequests] = useState(false);
  const [hasMoreResponses, setHasMoreResponses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.view === 'requests') setMainTab('requests');
    if (params.direction === 'sent' || params.direction === 'received') {
      setDirection(params.direction);
    }
  }, [params.direction, params.view]);

  const load = useCallback(
    async (refreshing = false) => {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      try {
        const [chatResult, requestResult, responseResult] = await Promise.all([
          loadConversationSummaries(),
          loadConnectionRequests(direction),
          loadOpportunityResponses({ direction }),
        ]);
        if (!mounted.current) return;
        setChats(chatResult);
        setConnectionRequests(requestResult);
        setOpportunityResponses(responseResult);
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
      return () => {
        mounted.current = false;
      };
    }, [load]),
  );

  async function loadMoreChats() {
    if (isLoadingMore || !hasMoreChats) return;
    setIsLoadingMore(true);
    try {
      const next = await loadConversationSummaries(chats.length);
      setChats((current) => [...current, ...next]);
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
      const next = await loadConnectionRequests(direction, connectionRequests.length);
      setConnectionRequests((current) => [...current, ...next]);
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
      setOpportunityResponses((current) => [...current, ...next]);
      setHasMoreResponses(next.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading messages" />;

  return (
    <Screen
      onRefresh={() => void load(true)}
      refreshing={isRefreshing}
      scroll
      contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>
          Private conversations and requests, kept in separate lanes.
        </Text>
      </View>

      <Segmented
        options={[
          { label: 'Chats', value: 'chats' },
          {
            label: `Requests (${connectionRequests.length + opportunityResponses.length})`,
            value: 'requests',
          },
        ]}
        selected={mainTab}
        onSelect={setMainTab}
      />

      {mainTab === 'requests' ? (
        <Segmented
          compact
          options={[
            { label: 'Received', value: 'received' },
            { label: 'Sent', value: 'sent' },
          ]}
          selected={direction}
          onSelect={setDirection}
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mainTab === 'chats' ? (
        chats.length > 0 ? (
          <View>
            {chats.map((chat) => (
              <ChatRow
                chat={chat}
                key={chat.id}
                onPress={() => router.push(routes.conversation(chat.id))}
              />
            ))}
            {hasMoreChats ? (
              <Button
                label="Load more"
                loading={isLoadingMore}
                onPress={() => void loadMoreChats()}
                variant="ghost"
              />
            ) : null}
          </View>
        ) : (
          <EmptyState
            title="No conversations yet"
            body="Accept a connection request or start a discussion from an opportunity response."
          />
        )
      ) : connectionRequests.length + opportunityResponses.length > 0 ? (
        <View>
          {connectionRequests.length > 0 ? (
            <RequestSection title="Connect requests">
              {connectionRequests.map((request) => (
                <ConnectionRequestRow
                  direction={direction}
                  key={request.id}
                  onPress={() => router.push(routes.connectRequest(request.id))}
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
            <RequestSection title="Opportunity responses">
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
                  label="Load more opportunity responses"
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
          title={`No ${direction} requests`}
          body={
            direction === 'received'
              ? 'New Connect requests and opportunity responses will appear here.'
              : 'Requests and opportunity responses you send will appear here.'
          }
        />
      )}

      <Text style={styles.badgeNote}>
        The tab badge counts unread messages only, not pending requests.
      </Text>
    </Screen>
  );
}

function Segmented<T extends string>({
  compact,
  onSelect,
  options,
  selected,
}: {
  compact?: boolean;
  onSelect: (value: T) => void;
  options: { label: string; value: T }[];
  selected: T;
}) {
  return (
    <View style={[styles.segmented, compact && styles.segmentedCompact]}>
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 21,
  },
  segmented: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    flexDirection: 'row',
    padding: 4,
  },
  segmentedCompact: {
    alignSelf: 'flex-start',
    minWidth: 220,
  },
  segment: {
    alignItems: 'center',
    borderRadius: theme.radii.sm,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  segmentActive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  segmentText: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: theme.colors.text,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
    marginBottom: theme.spacing.sm,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  badgeNote: {
    color: theme.colors.mutedLight,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
    textAlign: 'center',
  },
});
