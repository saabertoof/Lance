import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OpportunityResponseRow } from '@/components/communication';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  formatCommunicationError,
  COMMUNICATION_PAGE_SIZE,
  loadOpportunityResponses,
  markOpportunityResponsesViewed,
} from '@/lib/communication';
import {
  formatOpportunityError,
  loadOpportunity,
} from '@/lib/opportunity';
import { routes } from '@/lib/routes';
import type { OpportunityResponseRecord } from '@/types/communication';
import type { OpportunityRecord } from '@/types/opportunity';

export default function OpportunityResponsesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [opportunity, setOpportunity] = useState<OpportunityRecord | null>(null);
  const [responses, setResponses] = useState<OpportunityResponseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const opportunityResult = await loadOpportunity(id);
      setOpportunity(opportunityResult);
      if (opportunityResult.ownerProfileId !== user?.id) return;
      const responseResult = await loadOpportunityResponses({
        direction: 'received',
        opportunityId: id,
      });
      setResponses(responseResult);
      setHasMore(responseResult.length === COMMUNICATION_PAGE_SIZE);
      await markOpportunityResponsesViewed({ opportunityId: id });
    } catch (loadError) {
      setError(
        formatCommunicationError(loadError) || formatOpportunityError(loadError),
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await loadOpportunityResponses({
        direction: 'received',
        opportunityId: id,
        offset: responses.length,
      });
      setResponses((current) => [...current, ...result]);
      setHasMore(result.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading interested talent" />;
  const isOwner = opportunity?.ownerProfileId === user?.id;

  return (
    <Screen
      onRefresh={() => void load()}
      refreshing={isLoading}
      scroll
      contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Interested talent</Text>
        <View style={styles.iconButton} />
      </View>
      {opportunity ? (
        <View style={styles.context}>
          <Text style={styles.contextLabel}>Opportunity</Text>
          <Text style={styles.contextTitle}>{opportunity.title}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!isOwner ? (
        <EmptyState
          title="Owner access only"
          body="Only the opportunity owner can review these responses."
        />
      ) : responses.length > 0 ? (
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
              label="Load more responses"
              loading={isLoadingMore}
              onPress={() => void loadMore()}
              variant="ghost"
            />
          ) : null}
        </View>
      ) : (
        <EmptyState
          title="No responses yet"
          body="People who explicitly Express Interest will appear here. Private saves never appear."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  title: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  context: { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.md, gap: 3, padding: theme.spacing.md },
  contextLabel: { color: theme.colors.accentStrong, fontSize: theme.typography.tiny, fontWeight: '800', textTransform: 'uppercase' },
  contextTitle: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '900' },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20 },
});
