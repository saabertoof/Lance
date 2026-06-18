import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OpportunityCard } from '@/components/opportunity';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  formatOpportunityError,
  groupOpportunities,
  loadMyOpportunities,
} from '@/lib/opportunity';
import { routes } from '@/lib/routes';
import type { OpportunityRecord } from '@/types/opportunity';

export default function MyOpportunitiesScreen() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        if (!user) return;
        setIsLoading(true);
        setError(null);

        try {
          const result = await loadMyOpportunities(user.id);
          if (active) setOpportunities(result);
        } catch (loadError) {
          if (active) setError(formatOpportunityError(loadError));
        } finally {
          if (active) setIsLoading(false);
        }
      }

      void load();
      return () => {
        active = false;
      };
    }, [user]),
  );

  if (isLoading) return <LoadingState message="Loading your opportunities" />;

  const groups = groupOpportunities(opportunities);

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>My opportunities</Text>
        <View style={styles.placeholder} />
      </View>
      <Text style={styles.subtitle}>
        Draft, publish, pause, close, and archive opportunities you created.
      </Text>
      <Button
        label="Post an opportunity"
        onPress={() => router.push(routes.newOpportunity())}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {opportunities.length === 0 ? (
        <EmptyState
          body="Start with a draft or publish when every required detail is ready."
          title="You have not posted an opportunity yet."
        />
      ) : (
        <>
          <OpportunityGroup items={groups.published} title="Published" />
          <OpportunityGroup items={groups.drafts} title="Drafts" />
          <OpportunityGroup items={groups.paused} title="Paused" />
          <OpportunityGroup items={groups.closed} title="Closed and archived" />
        </>
      )}
    </Screen>
  );
}

function OpportunityGroup({
  items,
  title,
}: {
  items: OpportunityRecord[];
  title: string;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.list}>
        {items.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            onPress={() => router.push(routes.opportunity(opportunity.id))}
            opportunity={opportunity}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xl,
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
  placeholder: {
    height: 44,
    width: 44,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
  group: {
    gap: theme.spacing.md,
  },
  groupTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  list: {
    gap: theme.spacing.md,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    textAlign: 'center',
  },
});
