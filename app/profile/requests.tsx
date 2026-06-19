import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ConnectionRequestRow,
  OpportunityResponseRow,
} from '@/components/communication';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import {
  formatCommunicationError,
  COMMUNICATION_PAGE_SIZE,
  loadConnectionRequests,
  loadOpportunityResponses,
} from '@/lib/communication';
import { routes } from '@/lib/routes';
import type {
  ConnectionRequestRecord,
  OpportunityResponseRecord,
} from '@/types/communication';

export default function SentRequestsScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const applicationsOnly = kind === 'applications';
  const [requests, setRequests] = useState<ConnectionRequestRecord[]>([]);
  const [responses, setResponses] = useState<OpportunityResponseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreRequests, setHasMoreRequests] = useState(false);
  const [hasMoreResponses, setHasMoreResponses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [requestResult, responseResult] = await Promise.all([
        applicationsOnly
          ? Promise.resolve([])
          : loadConnectionRequests('sent'),
        loadOpportunityResponses({ direction: 'sent' }),
      ]);
      setRequests(requestResult);
      setResponses(responseResult);
      setHasMoreRequests(requestResult.length === COMMUNICATION_PAGE_SIZE);
      setHasMoreResponses(responseResult.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [applicationsOnly]);

  async function loadMore(kind: 'requests' | 'responses') {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      if (kind === 'requests') {
        const result = await loadConnectionRequests('sent', requests.length);
        setRequests((current) => [...current, ...result]);
        setHasMoreRequests(result.length === COMMUNICATION_PAGE_SIZE);
      } else {
        const result = await loadOpportunityResponses({
          direction: 'sent',
          offset: responses.length,
        });
        setResponses((current) => [...current, ...result]);
        setHasMoreResponses(result.length === COMMUNICATION_PAGE_SIZE);
      }
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) return <LoadingState message="Loading sent activity" />;

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
        <Text style={styles.title}>
          {applicationsOnly ? 'Applications' : 'Sent requests'}
        </Text>
        <View style={styles.iconButton} />
      </View>
      <Text style={styles.subtitle}>
        {applicationsOnly
          ? 'Track job applications and active opportunity discussions.'
          : 'Track Connect requests and job applications you have sent.'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {requests.length + responses.length === 0 ? (
        <EmptyState
          title="Nothing sent yet"
          body={
            applicationsOnly
              ? 'Jobs you apply to will appear here.'
              : 'Connect requests and job applications will appear here.'
          }
        />
      ) : (
        <>
          {!applicationsOnly && requests.length > 0 ? (
            <Section title="Connect requests">
              {requests.map((request) => (
                <ConnectionRequestRow
                  direction="sent"
                  key={request.id}
                  onPress={() => router.push(routes.connectRequest(request.id))}
                  request={request}
                />
              ))}
              {hasMoreRequests ? (
                <Button
                  label="Load more Connect requests"
                  loading={isLoadingMore}
                  onPress={() => void loadMore('requests')}
                  variant="ghost"
                />
              ) : null}
            </Section>
          ) : null}
          {responses.length > 0 ? (
            <Section title="Applications">
              {responses.map((response) => (
                <OpportunityResponseRow
                  direction="sent"
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
                  onPress={() => void loadMore('responses')}
                  variant="ghost"
                />
              ) : null}
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Section({
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
  screen: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  title: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, fontSize: theme.typography.small, lineHeight: 21 },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900', marginBottom: theme.spacing.sm },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20 },
});
