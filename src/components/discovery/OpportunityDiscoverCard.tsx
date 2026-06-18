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
  reasons = [],
}: {
  isSaved: boolean;
  opportunity: OpportunityRecord;
  reasons?: string[];
}) {
  const mark = opportunity.poster.name.charAt(0).toUpperCase() || 'L';

  return (
    <View style={styles.card}>
      <View style={styles.visual}>
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
        <View style={styles.savedMark}>
          <Ionicons
            color={isSaved ? theme.colors.accentStrong : theme.colors.muted}
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={23}
          />
        </View>
      </View>

      <View style={styles.content}>
      <View style={styles.hero}>
        <Text numberOfLines={3} style={styles.title}>
          {opportunity.title}
        </Text>
        <Text numberOfLines={3} style={styles.summary}>
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
      {reasons.length > 0 ? (
        <View style={styles.reason}>
          <Ionicons color={theme.colors.accentStrong} name="sparkles-outline" size={16} />
          <Text numberOfLines={2} style={styles.reasonText}>
            Why you&apos;re seeing this: {reasons.join(' · ')}
          </Text>
        </View>
      ) : null}
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
    flex: 1,
    gap: 0,
    minHeight: 430,
    overflow: 'hidden',
    padding: 0,
  },
  visual: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 130,
    padding: theme.spacing.xl,
    position: 'relative',
  },
  imageWrap: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.lg,
    height: 82,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 82,
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
  savedMark: { alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 20, height: 40, justifyContent: 'center', position: 'absolute', right: 14, top: 14, width: 40 },
  content: { flex: 1, gap: theme.spacing.md, padding: theme.spacing.lg },
  hero: {
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
    lineHeight: 28,
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
  reason: { alignItems: 'flex-start', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.sm, flexDirection: 'row', gap: theme.spacing.sm, marginTop: 'auto', padding: theme.spacing.sm },
  reasonText: { color: theme.colors.accentStrong, flex: 1, fontSize: theme.typography.tiny, fontWeight: '700', lineHeight: 17 },
});
