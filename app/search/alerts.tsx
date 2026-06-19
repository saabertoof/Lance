import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { OpportunityInterestAction } from '@/components/communication';
import { OpportunityCard } from '@/components/opportunity';
import { Button, Card, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useSaved } from '@/context/SavedContext';
import { useSearchAlerts } from '@/context/SearchAlertsContext';
import { loadPublicOpportunitiesByIds } from '@/lib/opportunity';
import { routes } from '@/lib/routes';
import {
  deleteSearchAlertEvent,
  loadSearchAlertEvents,
  markSearchAlertRead,
  SEARCH_ALERT_PAGE_SIZE,
} from '@/lib/searchPhase6';
import type { OpportunityRecord } from '@/types/opportunity';
import type { SearchAlertEventRecord } from '@/types/searchPhase6';

export default function SearchAlertInboxScreen() {
  const { user } = useAuth();
  const { showSuccess, showWarning } = useFeedback();
  const {
    isOpportunitySaved,
    setOpportunitySaved,
  } = useSaved();
  const { refreshUnread } = useSearchAlerts();
  const [events, setEvents] = useState<SearchAlertEventRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opportunityById = useMemo(
    () => new Map(opportunities.map((opportunity) => [opportunity.id, opportunity])),
    [opportunities],
  );

  const load = useCallback(async (reset = true, offset = 0) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const nextEvents = await loadSearchAlertEvents(
        reset ? 0 : offset,
        SEARCH_ALERT_PAGE_SIZE,
      );
      const ids = nextEvents
        .map((event) => event.opportunityId)
        .filter((id): id is string => Boolean(id));
      const nextOpportunities = await loadPublicOpportunitiesByIds(ids);
      setEvents((current) => (reset ? nextEvents : mergeById(current, nextEvents)));
      setOpportunities((current) =>
        reset
          ? nextOpportunities
          : mergeById(current, nextOpportunities),
      );
      setHasMore(nextEvents.length === SEARCH_ALERT_PAGE_SIZE);
    } catch {
      setError(
        'Job alerts are not available yet. Apply the Phase 6 migration, then try again.',
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openEvent(event: SearchAlertEventRecord) {
    if (!event.readAt) {
      try {
        await markSearchAlertRead(event.id);
        const now = new Date().toISOString();
        setEvents((current) =>
          current.map((item) =>
            item.id === event.id ? { ...item, readAt: now } : item,
          ),
        );
        await refreshUnread();
      } catch {
        showWarning('This alert could not be marked as read.');
      }
    }
    if (event.opportunityId && opportunityById.has(event.opportunityId)) {
      router.push(routes.opportunity(event.opportunityId));
    }
  }

  function dismiss(event: SearchAlertEventRecord) {
    Alert.alert('Dismiss this match?', 'It will be removed from this inbox.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSearchAlertEvent(event.id);
            setEvents((current) =>
              current.filter((item) => item.id !== event.id),
            );
            await refreshUnread();
            showSuccess('Alert dismissed.');
          } catch {
            showWarning('This alert could not be dismissed.');
          }
        },
      },
    ]);
  }

  return (
    <Screen
      compact
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      refreshing={refreshing}
      scroll
      contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.headerButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>New Job matches</Text>
          <Text style={styles.subtitle}>In-app alerts from saved Job searches</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {loading ? <LoadingState message="Loading Job alerts" /> : null}
      {!loading && error ? (
        <View style={styles.state}>
          <EmptyState body={error} title="Alerts unavailable" />
          <Button label="Retry" onPress={() => void load()} />
        </View>
      ) : null}
      {!loading && !error && events.length === 0 ? (
        <EmptyState
          body="Newly published Jobs matching an active alert will appear here."
          title="No new Job matches yet"
        />
      ) : null}

      {!loading && !error ? (
        <View style={styles.list}>
          {events.map((event) => {
            const opportunity = event.opportunityId
              ? opportunityById.get(event.opportunityId)
              : undefined;
            return (
              <View
                key={event.id}
                style={[styles.event, !event.readAt && styles.unreadEvent]}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventCopy}>
                    <Text style={styles.savedName}>{event.savedSearchName}</Text>
                    <Text style={styles.time}>{formatTimestamp(event.matchedAt)}</Text>
                  </View>
                  {!event.readAt ? <View style={styles.unreadDot} /> : null}
                  <Pressable
                    accessibilityLabel={`Dismiss ${event.opportunityTitle}`}
                    accessibilityRole="button"
                    onPress={() => dismiss(event)}
                    style={styles.dismiss}>
                    <Ionicons
                      color={theme.colors.muted}
                      name="close"
                      size={20}
                    />
                  </Pressable>
                </View>

                {opportunity ? (
                  <>
                    <OpportunityCard
                      isSaved={isOpportunitySaved(opportunity.id)}
                      onPress={() => void openEvent(event)}
                      onSavePress={
                        opportunity.ownerProfileId === user?.id
                          ? undefined
                          : () =>
                              void setOpportunitySaved(
                                opportunity.id,
                                !isOpportunitySaved(opportunity.id),
                              )
                      }
                      opportunity={opportunity}
                    />
                    {event.matchSummary.length > 0 ? (
                      <View style={styles.reasons}>
                        {event.matchSummary.map((reason) => (
                          <View key={reason} style={styles.reason}>
                            <Ionicons
                              color={theme.colors.accentStrong}
                              name="checkmark-circle-outline"
                              size={15}
                            />
                            <Text style={styles.reasonText}>{reason}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {opportunity.ownerProfileId !== user?.id ? (
                      <OpportunityInterestAction
                        deferLoad
                        onError={() =>
                          showWarning('Apply is temporarily unavailable.')
                        }
                        opportunity={opportunity}
                      />
                    ) : null}
                  </>
                ) : (
                  <Card style={styles.unavailable}>
                    <Text style={styles.unavailableTitle}>
                      {event.opportunityTitle}
                    </Text>
                    <Text style={styles.unavailablePoster}>
                      {event.posterName}
                    </Text>
                    <Text style={styles.unavailableBody}>
                      This Job is no longer available.
                    </Text>
                    {!event.readAt ? (
                      <Button
                        label="Mark as read"
                        onPress={() => void openEvent(event)}
                        variant="secondary"
                      />
                    ) : null}
                  </Card>
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {!loading && !error && hasMore ? (
        <Button
          label="Load more"
          loading={loadingMore}
          onPress={() => void load(false, events.length)}
          variant="secondary"
        />
      ) : null}
    </Screen>
  );
}

function mergeById<T extends { id: string }>(current: T[], next: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerCopy: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    textAlign: 'center',
  },
  state: {
    gap: theme.spacing.md,
  },
  list: {
    gap: theme.spacing.lg,
  },
  event: {
    gap: theme.spacing.sm,
  },
  unreadEvent: {
    backgroundColor: '#F4F1FF',
    borderRadius: theme.radii.md,
    marginHorizontal: -theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  eventHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  eventCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  savedName: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  time: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
  },
  unreadDot: {
    backgroundColor: theme.colors.accent,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  dismiss: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  reasons: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  reason: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  reasonText: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: theme.typography.tiny,
    fontWeight: '600',
  },
  unavailable: {
    borderRadius: theme.radii.md,
    gap: theme.spacing.sm,
  },
  unavailableTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '800',
  },
  unavailablePoster: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  unavailableBody: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
  },
});
