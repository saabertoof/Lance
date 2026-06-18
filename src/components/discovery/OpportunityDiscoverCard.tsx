import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import {
  CompensationBadge,
  WorkArrangementBadge,
} from '@/components/opportunity';
import { Chip } from '@/components/ui';
import { theme } from '@/constants/theme';
import { formatCompensation } from '@/lib/opportunity';
import {
  opportunityExperienceOptions,
  timeCommitmentOptions,
  workArrangementOptions,
  workTypeOptions,
  type OpportunityRecord,
} from '@/types/opportunity';
import { getOptionLabel } from '@/types/profile';

export function OpportunityDiscoverCard({
  isSaved,
  opportunity,
}: {
  isSaved: boolean;
  opportunity: OpportunityRecord;
}) {
  const mark = opportunity.poster.name.charAt(0).toUpperCase() || 'L';

  return (
    <View style={styles.card}>
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
          <Text numberOfLines={1} style={styles.poster}>
            {opportunity.poster.name}
          </Text>
          <Text style={styles.identity}>
            {opportunity.poster.identityType === 'business'
              ? 'Business or project'
              : 'Personal profile'}
          </Text>
        </View>
        <Ionicons
          color={isSaved ? theme.colors.accentStrong : theme.colors.muted}
          name={isSaved ? 'bookmark' : 'bookmark-outline'}
          size={24}
        />
      </View>

      <View style={styles.hero}>
        <Text numberOfLines={3} style={styles.title}>
          {opportunity.title}
        </Text>
        <Text numberOfLines={5} style={styles.summary}>
          {opportunity.shortSummary}
        </Text>
      </View>

      <View style={styles.badges}>
        <CompensationBadge
          compensationType={opportunity.compensationType}
          label={formatCompensation(opportunity)}
        />
        <WorkArrangementBadge
          label={getOptionLabel(workArrangementOptions, opportunity.workplace)}
        />
      </View>

      <View style={styles.details}>
        <Detail
          label="Work"
          value={getOptionLabel(workTypeOptions, opportunity.workType)}
        />
        <Detail
          label="Time"
          value={getOptionLabel(timeCommitmentOptions, opportunity.timeCommitment)}
        />
        <Detail
          label="Experience"
          value={getOptionLabel(
            opportunityExperienceOptions,
            opportunity.experienceLevel,
          )}
        />
        {opportunity.location ? <Detail label="Location" value={opportunity.location} /> : null}
      </View>

      <View style={styles.skills}>
        {opportunity.skills.slice(0, 5).map((skill) => (
          <Chip key={skill.toLowerCase()} label={skill} />
        ))}
      </View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.lg,
    minHeight: 430,
    padding: theme.spacing.xl,
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
    height: 58,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 58,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  mark: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  posterCopy: {
    flex: 1,
    gap: 2,
  },
  poster: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  identity: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
  },
  hero: {
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
    lineHeight: 35,
  },
  summary: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  details: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  detail: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  detailValue: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '800',
    textAlign: 'right',
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
});
