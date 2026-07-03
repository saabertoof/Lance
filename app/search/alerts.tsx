import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { OpportunityInterestAction } from '@/components/communication';
import { OpportunityCard } from '@/components/opportunity';
import { Button, Card, Screen } from '@/components/ui';
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
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
        'Opportunity alerts are not available yet. Apply the Phase 6 migration, then try again.',
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
      style={styles.canvas}
      contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.headerButton}>
          <Ionicons color={v.text} name="arrow-back" size={21} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>New opportunity matches</Text>
          <Text style={styles.subtitle}>In-app alerts from saved opportunity searches</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {loading ? <AlertPageState loading title="Loading opportunity alerts" /> : null}
      {!loading && error ? (
        <View style={styles.state}>
          <AlertPageState body={error} icon="warning-outline" title="Alerts unavailable" />
          <Button
            label="Retry"
            labelStyle={styles.buttonLabel}
            onPress={() => void load()}
            style={styles.primaryButton}
          />
        </View>
      ) : null}
      {!loading && !error && events.length === 0 ? (
        <AlertPageState
          body="Newly published opportunities matching an active alert will appear here."
          icon="notifications-outline"
          title="No new opportunity matches yet"
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
                      color={v.muted}
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
                      variant="terminal"
                    />
                    {event.matchSummary.length > 0 ? (
                      <View style={styles.reasons}>
                        {event.matchSummary.map((reason) => (
                          <View key={reason} style={styles.reason}>
                            <Ionicons
                              color={v.purpleStrong}
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
                        buttonLabelStyle={styles.buttonLabel}
                        buttonStyle={styles.primaryButton}
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
                      This opportunity is no longer available.
                    </Text>
                    {!event.readAt ? (
                      <Button
                        label="Mark as read"
                        labelStyle={styles.buttonLabel}
                        onPress={() => void openEvent(event)}
                        style={styles.secondaryButton}
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
          labelStyle={styles.buttonLabel}
          loading={loadingMore}
          onPress={() => void load(false, events.length)}
          style={styles.secondaryButton}
          variant="secondary"
        />
      ) : null}
    </Screen>
  );
}

function AlertPageState({
  body,
  icon = 'search-outline',
  loading,
  title,
}: {
  body?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  title: string;
}) {
  return (
    <View style={styles.pageState}>
      <View style={styles.pageStateIcon}>
        {loading ? (
          <ActivityIndicator color={v.purpleStrong} />
        ) : (
          <Ionicons color={v.purpleStrong} name={icon} size={19} />
        )}
      </View>
      <Text style={styles.pageStateTitle}>{title}</Text>
      {body ? <Text style={styles.pageStateBody}>{body}</Text> : null}
    </View>
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
  canvas: {
    backgroundColor: v.background,
  },
  screen: {
    gap: 16,
    paddingBottom: 28,
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
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
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
    backgroundColor: v.purpleWash,
    borderColor: v.borderPurple,
    borderWidth: 1,
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
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: theme.typography.small,
    fontWeight: '600',
  },
  time: {
    color: v.muted,
    fontFamily: operatorFonts.sans,
    fontSize: theme.typography.caption,
  },
  unreadDot: {
    backgroundColor: v.purpleStrong,
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
    color: v.textSoft,
    flex: 1,
    fontFamily: operatorFonts.sansMedium,
    fontSize: theme.typography.tiny,
    fontWeight: '500',
  },
  unavailable: {
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 18,
    gap: theme.spacing.sm,
  },
  unavailableTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: theme.typography.cardTitle,
    fontWeight: '600',
  },
  unavailablePoster: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: theme.typography.small,
  },
  unavailableBody: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: theme.typography.body,
  },
  pageState: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    padding: 18,
  },
  pageStateIcon: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pageStateTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
  },
  pageStateBody: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: v.purple,
    minHeight: 42,
  },
  secondaryButton: {
    backgroundColor: v.surfaceStrong,
    borderColor: v.borderStrong,
    minHeight: 42,
  },
  buttonLabel: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
});
