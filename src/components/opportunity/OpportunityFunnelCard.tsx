import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { captureClientError } from '@/lib/clientMonitoring';
import {
  loadOpportunityFunnelSummary,
  opportunityConversionRate,
  type OpportunityFunnelSummary,
} from '@/lib/opportunityFunnel';

export function OpportunityFunnelCard({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const [summary, setSummary] = useState<OpportunityFunnelSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const next = await loadOpportunityFunnelSummary(opportunityId);
      if (!next) {
        setUnavailable(true);
        return;
      }
      setSummary(next);
      setUnavailable(false);
    } catch (loadError) {
      captureClientError(loadError, 'opportunity_funnel_summary');
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [opportunityId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (unavailable) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleCopy}>
          <Text style={styles.eyebrow}>Link performance</Text>
          <Text style={styles.title}>Your opportunity funnel</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.accentStrong} size="small" />
        ) : (
          <View style={styles.conversion}>
            <Text style={styles.conversionValue}>
              {summary ? opportunityConversionRate(summary) : 0}%
            </Text>
            <Text style={styles.conversionLabel}>view to packet</Text>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>Performance could not be refreshed.</Text>
          <Pressable
            accessibilityLabel="Retry opportunity performance"
            accessibilityRole="button"
            onPress={() => void load()}
            style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.stats}>
          <FunnelStat
            icon="eye-outline"
            label="Views"
            value={summary?.views ?? 0}
          />
          <FunnelStat
            icon="open-outline"
            label="Started"
            value={summary?.applicationStarts ?? 0}
          />
          <FunnelStat
            icon="paper-plane-outline"
            label="Applied"
            value={summary?.applications ?? 0}
          />
          <FunnelStat
            icon="scan-outline"
            label="Reviewed"
            value={summary?.creatorReviews ?? 0}
          />
          <FunnelStat
            icon="chatbubble-ellipses-outline"
            label="Messaged"
            value={summary?.messageStarts ?? 0}
          />
        </View>
      )}

      <Text style={styles.note}>
        Private counts since tracking started. Repeat opens are reduced so the signal stays useful.
      </Text>
    </View>
  );
}

function FunnelStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons color={theme.colors.accentStrong} name={icon} size={15} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  titleCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
  },
  conversion: {
    alignItems: 'flex-end',
  },
  conversionValue: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.subheading,
  },
  conversionLabel: {
    color: theme.colors.muted,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    gap: 3,
    minWidth: 86,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  statValue: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.cardTitle,
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
  },
  note: {
    color: theme.colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  errorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  errorText: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: theme.typography.caption,
  },
  retry: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.caption,
  },
  pressed: {
    opacity: 0.65,
  },
});
