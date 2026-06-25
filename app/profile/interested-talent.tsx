import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OpportunityResponseRow } from '@/components/communication';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import {
  COMMUNICATION_PAGE_SIZE,
  formatCommunicationError,
  loadOpportunityResponses,
  markOpportunityResponsesViewed,
} from '@/lib/communication';
import { routes } from '@/lib/routes';
import type { OpportunityResponseRecord } from '@/types/communication';

export default function InterestedTalentScreen() {
  const [responses, setResponses] = useState<OpportunityResponseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadOpportunityResponses({ direction: 'received' });
      setResponses(await markViewed(result));
      setHasMore(result.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function loadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const result = await loadOpportunityResponses({
        direction: 'received',
        offset: responses.length,
      });
      const viewed = await markViewed(result);
      setResponses((current) => [...current, ...viewed]);
      setHasMore(result.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading interested talent" />;

  return (
    <Screen
      onRefresh={() => void load()}
      refreshing={isLoading}
      scroll
      contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Interested Talent</Text>
        <View style={styles.iconButton} />
      </View>
      <Text style={styles.subtitle}>
        People who applied to opportunities posted by you or your businesses.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {responses.length > 0 ? (
        <View>
          {responses.map((response) => (
            <OpportunityResponseRow
              direction="received"
              key={response.id}
              onPress={() =>
                router.push(routes.opportunityResponse(response.id))
              }
              response={response}
            />
          ))}
          {hasMore ? (
            <Button
              label="Load more"
              loading={isLoadingMore}
              onPress={() => void loadMore()}
              variant="ghost"
            />
          ) : null}
        </View>
      ) : (
        <EmptyState
          body="New applications will appear here while your opportunities are accepting responses."
          title="No interested talent yet"
        />
      )}
    </Screen>
  );
}

async function markViewed(responses: OpportunityResponseRecord[]) {
  const businessIds = [
    ...new Set(
      responses
        .map((response) => response.businessId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const personalOpportunityIds = [
    ...new Set(
      responses
        .filter((response) => !response.businessId)
        .map((response) => response.opportunityId),
    ),
  ];

  try {
    await Promise.all([
      ...businessIds.map((businessId) =>
        markOpportunityResponsesViewed({ businessId }),
      ),
      ...personalOpportunityIds.map((opportunityId) =>
        markOpportunityResponsesViewed({ opportunityId }),
      ),
    ]);
  } catch {
    return responses;
  }

  const viewedAt = new Date().toISOString();
  return responses.map((response) => ({
    ...response,
    ownerViewedAt: response.ownerViewedAt ?? viewedAt,
  }));
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 21,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
});
