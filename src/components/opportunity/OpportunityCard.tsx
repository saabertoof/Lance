import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SaveButton } from '@/components/saved';
import { Chip } from '@/components/ui';
import { theme } from '@/constants/theme';
import { formatCompensation } from '@/lib/opportunity';
import { getOptionLabel } from '@/types/profile';
import {
  OpportunityRecord,
  timeCommitmentOptions,
  workArrangementOptions,
  workTypeOptions,
} from '@/types/opportunity';

import {
  CompensationBadge,
  OpportunityStatusBadge,
  WorkArrangementBadge,
} from './OpportunityBadges';

type OpportunityCardProps = {
  isSaved?: boolean;
  opportunity: OpportunityRecord;
  onPress: () => void;
  onSavePress?: () => void;
};

export function OpportunityCard({
  isSaved,
  onPress,
  onSavePress,
  opportunity,
}: OpportunityCardProps) {
  const mark = opportunity.poster.name.charAt(0).toUpperCase() || 'L';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.posterRow}>
        <View style={styles.imageWrap}>
          {opportunity.poster.imageUrl ? (
            <Image
              contentFit="cover"
              source={opportunity.poster.imageUrl}
              style={styles.image}
            />
          ) : (
            <Text style={styles.mark}>{mark}</Text>
          )}
        </View>
        <View style={styles.posterCopy}>
          <Text style={styles.poster}>{opportunity.poster.name}</Text>
          <Text style={styles.identity}>
            {opportunity.poster.identityType === 'business' ? 'Business' : 'Personal profile'}
          </Text>
        </View>
        {onSavePress ? (
          <SaveButton
            compact
            isSaved={Boolean(isSaved)}
            onPress={(event) => {
              event?.stopPropagation();
              onSavePress();
            }}
          />
        ) : (
          <OpportunityStatusBadge status={opportunity.status} />
        )}
      </View>

      <View style={styles.titleRow}>
        <Text numberOfLines={2} style={styles.title}>
          {opportunity.title}
        </Text>
        <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
      </View>

      <Text numberOfLines={3} style={styles.summary}>
        {opportunity.shortSummary}
      </Text>

      <View style={styles.badges}>
        <CompensationBadge
          compensationType={opportunity.compensationType}
          label={formatCompensation(opportunity)}
        />
        <WorkArrangementBadge
          label={getOptionLabel(workArrangementOptions, opportunity.workplace)}
        />
      </View>

      <Text style={styles.meta}>
        {getOptionLabel(workTypeOptions, opportunity.workType)} ·{' '}
        {getOptionLabel(timeCommitmentOptions, opportunity.timeCommitment)}
      </Text>

      <View style={styles.skills}>
        {opportunity.skills.slice(0, 4).map((skill) => (
          <Chip key={skill.toLowerCase()} label={skill} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  posterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  imageWrap: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  mark: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  posterCopy: {
    flex: 1,
    gap: 2,
  },
  poster: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  identity: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  summary: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    lineHeight: 21,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
});
