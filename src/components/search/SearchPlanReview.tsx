import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import {
  getSearchPlanChips,
  type SearchPlanChip,
} from '@/lib/searchPlan';
import type { SearchPlanV1 } from '../../../supabase/functions/_shared/search-plan';

export function SearchPlanReview({
  onRemove,
  plan,
}: {
  onRemove: (chip: SearchPlanChip) => void;
  plan: SearchPlanV1;
}) {
  const chips = getSearchPlanChips(plan);
  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <Ionicons
          color={theme.colors.accentStrong}
          name="sparkles"
          size={16}
        />
        <Text style={styles.heading}>Lance understood</Text>
      </View>
      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <Pressable
              accessibilityLabel={`Remove ${chip.label} filter`}
              accessibilityRole="button"
              key={chip.id}
              onPress={() => onRemove(chip)}
              style={styles.chip}>
              <Text style={styles.chipText}>{chip.label}</Text>
              <Ionicons
                color={theme.colors.accentStrong}
                name="close"
                size={14}
              />
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>No extra filters. Try a normal search term.</Text>
      )}
      {plan.ignored_unsafe_constraints.length > 0 ? (
        <Text accessibilityLiveRegion="polite" style={styles.safety}>
          Lance can search by work-related qualifications, but not protected
          personal characteristics.
        </Text>
      ) : null}
    </View>
  );
}

export function MatchReasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <View style={styles.reasons}>
      {reasons.map((reason) => (
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: '#D8CEFF',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  heading: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  chipText: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.label,
    fontWeight: '700',
  },
  empty: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  safety: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 17,
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
});
