import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
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
          color={v.purpleStrong}
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
                color={v.purpleStrong}
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
            color={v.purpleStrong}
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
    backgroundColor: v.purpleWash,
    borderColor: v.borderPurple,
    borderRadius: 18,
    borderWidth: 1,
    gap: 9,
    padding: 12,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  heading: {
    color: v.text,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderWidth: 1,
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    minHeight: 28,
    paddingHorizontal: 10,
  },
  chipText: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
  empty: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
  },
  safety: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 11,
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
    color: v.textSoft,
    flex: 1,
    fontFamily: operatorFonts.sansMedium,
    fontSize: theme.typography.tiny,
    fontWeight: '500',
  },
});
