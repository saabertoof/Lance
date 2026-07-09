import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OpportunityCard } from '@/components/opportunity';
import {
  CompactPageHeader,
  EmptyState,
  LoadingState,
  Screen,
} from '@/components/ui';
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
      <CompactPageHeader
        eyebrow="Your Lance"
        rightAction={
          <Pressable
            accessibilityLabel="Create opportunity"
            accessibilityRole="button"
            onPress={() => router.push(routes.newOpportunity())}
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.pressed,
            ]}>
            <Ionicons color={theme.colors.white} name="add" size={22} />
          </Pressable>
        }
        subtitle="Draft, publish, pause, close, and archive your links."
        title="Opportunities"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {opportunities.length === 0 ? (
        <View style={styles.emptyPanel}>
          <EmptyState
            actionLabel="Create your first link"
            body="Start with a draft, shape the details, then publish when it feels ready."
            onActionPress={() => router.push(routes.newOpportunity())}
            title="Your opportunity links live here"
          />
        </View>
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
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={styles.groupCount}>{items.length}</Text>
      </View>
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
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderColor: 'rgba(167,139,250,0.5)',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  emptyPanel: {
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    marginTop: theme.spacing.sm,
    overflow: 'hidden',
  },
  group: {
    gap: theme.spacing.sm,
  },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  groupTitle: {
    color: theme.colors.textSoft,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.tiny,
    textTransform: 'uppercase',
  },
  groupCount: {
    color: theme.colors.muted,
    fontFamily: theme.typography.familyMonoMedium,
    fontSize: theme.typography.tiny,
  },
  list: {
    gap: theme.spacing.sm,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
