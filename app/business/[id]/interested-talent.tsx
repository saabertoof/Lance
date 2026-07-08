import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OpportunityResponseRow } from '@/components/communication';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { formatBusinessError, loadBusiness } from '@/lib/business';
import {
  formatCommunicationError,
  COMMUNICATION_PAGE_SIZE,
  loadOpportunityResponses,
  markOpportunityResponsesViewed,
} from '@/lib/communication';
import { routes } from '@/lib/routes';
import type { BusinessRecord } from '@/types/business';
import type { OpportunityResponseRecord } from '@/types/communication';

export default function InterestedTalentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [responses, setResponses] = useState<OpportunityResponseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBusiness(null);
    setResponses([]);
    setHasMore(false);
    setError(null);
    setIsLoading(true);
  }, [id]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const businessResult = await loadBusiness(id);
      setBusiness(businessResult);
      if (businessResult.ownerProfileId !== user?.id) return;
      const responseResult = await loadOpportunityResponses({
        direction: 'received',
        businessId: id,
      });
      setResponses(responseResult);
      setHasMore(responseResult.length === COMMUNICATION_PAGE_SIZE);
      await markOpportunityResponsesViewed({ businessId: id });
    } catch (loadError) {
      setError(
        formatCommunicationError(loadError) || formatBusinessError(loadError),
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
        businessId: id,
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

  const grouped = useMemo(() => {
    const groups = new Map<string, OpportunityResponseRecord[]>();
    for (const response of responses) {
      const current = groups.get(response.opportunityId) ?? [];
      current.push(response);
      groups.set(response.opportunityId, current);
    }
    return [...groups.entries()];
  }, [responses]);

  if (isLoading) return <LoadingState message="Loading interested talent" />;
  const isOwner = business?.ownerProfileId === user?.id;

  return (
    <Screen
      onRefresh={() => void load()}
      refreshing={isLoading}
      scroll
      contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Interested talent</Text>
        <View style={styles.iconButton} />
      </View>
      {business ? (
        <View style={styles.context}>
          <Text style={styles.contextLabel}>Business profile</Text>
          <Text style={styles.contextTitle}>{business.name}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!isOwner ? (
        <EmptyState
          title="Owner access only"
          body="Only the business owner can review these responses."
        />
      ) : grouped.length > 0 ? (
        grouped.map(([opportunityId, items]) => (
          <View key={opportunityId} style={styles.group}>
            <Pressable
              onPress={() => router.push(routes.opportunity(opportunityId))}
              style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{items[0].opportunityTitle}</Text>
              <View style={styles.count}>
                <Text style={styles.countText}>{items.length}</Text>
              </View>
              <Ionicons color={theme.colors.muted} name="chevron-forward" size={18} />
            </Pressable>
            {items.map((response) => (
              <OpportunityResponseRow
                direction="received"
                key={response.id}
                onPress={() =>
                  router.push(routes.opportunityResponse(response.id))
                }
                response={response}
              />
            ))}
          </View>
        ))
      ) : (
        <EmptyState
          title="No responses yet"
          body="People who explicitly Express Interest in this business's opportunities will appear here."
        />
      )}
      {isOwner && hasMore ? (
        <Button
          label="Load more responses"
          loading={isLoadingMore}
          onPress={() => void loadMore()}
          variant="ghost"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  title: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  context: { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.md, gap: 3, padding: theme.spacing.md },
  contextLabel: { color: theme.colors.accentStrong, fontSize: theme.typography.tiny, fontWeight: '800', textTransform: 'uppercase' },
  contextTitle: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '900' },
  group: { marginBottom: theme.spacing.lg },
  groupHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm, minHeight: 44 },
  groupTitle: { color: theme.colors.text, flex: 1, fontSize: theme.typography.subheading, fontWeight: '900' },
  count: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.pill, justifyContent: 'center', minHeight: 24, minWidth: 24, paddingHorizontal: 7 },
  countText: { color: theme.colors.accentStrong, fontSize: theme.typography.tiny, fontWeight: '900' },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20 },
});
