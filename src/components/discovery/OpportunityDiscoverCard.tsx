import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import {
  formatCompensation,
  formatOpportunityLocation,
  needsCompensationWarning,
} from '@/lib/opportunity';
import {
  timeCommitmentOptions,
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
  const warning = needsCompensationWarning(opportunity.compensationType);
  const locationLabel = formatOpportunityLocation(opportunity);

  return (
    <View style={styles.card}>
      <View style={styles.fallback}>
        <View style={styles.fallbackAccent} />
        <View style={styles.fallbackAccentSecondary} />
        <Text style={styles.fallbackMark}>{mark}</Text>
        {opportunity.poster.imageUrl ? (
          <View
            style={[
              styles.heroLogo,
              opportunity.poster.identityType === 'personal' &&
                styles.heroPortrait,
            ]}>
            <Image
              contentFit={
                opportunity.poster.identityType === 'business'
                  ? 'contain'
                  : 'cover'
              }
              source={opportunity.poster.imageUrl}
              style={styles.image}
              transition={160}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.mediaWash} />
      <View style={styles.fadeTop} />
      <View style={styles.fadeMiddle} />
      <View style={styles.fadeBottom} />

      <View style={styles.content}>
        <View style={styles.posterRow}>
          <View style={styles.posterMark}>
            {opportunity.poster.imageUrl ? (
              <Image
                contentFit="cover"
                source={opportunity.poster.imageUrl}
                style={styles.image}
              />
            ) : (
              <Text style={styles.posterInitial}>{mark}</Text>
            )}
          </View>
          <View style={styles.posterCopy}>
            <Text numberOfLines={1} style={styles.posterName}>
              {opportunity.poster.name}
            </Text>
            <Text style={styles.posterType}>
              {opportunity.poster.identityType === 'business'
                ? 'Business or project'
                : 'Personal profile'}
            </Text>
          </View>
          {isSaved ? (
            <View style={styles.savedIndicator}>
              <Ionicons color={theme.colors.white} name="bookmark" size={15} />
            </View>
          ) : null}
        </View>

        <Text numberOfLines={2} style={styles.title}>
          {opportunity.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons
            color="rgba(255,255,255,0.84)"
            name="location-outline"
            size={15}
          />
          <Text numberOfLines={1} style={styles.metaText}>
            {locationLabel}
          </Text>
        </View>

        <View style={styles.compensationRow}>
          <View style={[styles.compensation, warning && styles.compensationWarning]}>
            <Ionicons
              color={warning ? '#FFD28A' : '#C8BEFF'}
              name={warning ? 'warning-outline' : 'cash-outline'}
              size={14}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.compensationText,
                warning && styles.compensationWarningText,
              ]}>
              {formatCompensation(opportunity)}
            </Text>
          </View>
        </View>

        <Text numberOfLines={1} style={styles.workMeta}>
          {getOptionLabel(workTypeOptions, opportunity.workType)} |{' '}
          {getOptionLabel(
            timeCommitmentOptions,
            opportunity.timeCommitment,
          )}
        </Text>

        {opportunity.skills.length > 0 ? (
          <View style={styles.skills}>
            {opportunity.skills.slice(0, 3).map((skill) => (
              <OverlayPill key={skill.toLowerCase()} label={skill} />
            ))}
          </View>
        ) : null}

        <Text numberOfLines={2} style={styles.summary}>
          {opportunity.shortSummary}
        </Text>

        {reasons.length > 0 ? (
          <View style={styles.reason}>
            <Ionicons color="#C8BEFF" name="sparkles-outline" size={14} />
            <Text numberOfLines={1} style={styles.reasonText}>
              {reasons.join(' | ')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function OverlayPill({ label }: { label: string }) {
  return (
    <View style={styles.skill}>
      <Text numberOfLines={1} style={styles.skillText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#26212F',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 390,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#26212F',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackAccent: {
    backgroundColor: theme.colors.accent,
    height: '140%',
    opacity: 0.28,
    position: 'absolute',
    right: '15%',
    transform: [{ rotate: '22deg' }],
    width: 104,
  },
  fallbackAccentSecondary: {
    backgroundColor: '#4462D6',
    height: '80%',
    left: '7%',
    opacity: 0.13,
    position: 'absolute',
    transform: [{ rotate: '-18deg' }],
    width: 74,
  },
  fallbackMark: {
    color: 'rgba(255,255,255,0.18)',
    fontSize: 144,
    fontWeight: '900',
  },
  heroLogo: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    height: 144,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: theme.spacing.md,
    transform: [{ translateY: -72 }],
    width: 144,
  },
  heroPortrait: {
    borderRadius: 72,
    padding: 0,
  },
  mediaWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,10,0.22)',
  },
  fadeTop: {
    backgroundColor: 'rgba(5,5,10,0.18)',
    bottom: 0,
    height: '74%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  fadeMiddle: {
    backgroundColor: 'rgba(5,5,10,0.23)',
    bottom: 0,
    height: '60%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  fadeBottom: {
    backgroundColor: 'rgba(5,5,10,0.38)',
    bottom: 0,
    height: '46%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  content: {
    bottom: 0,
    gap: 7,
    left: 0,
    padding: theme.spacing.lg,
    position: 'absolute',
    right: 0,
  },
  posterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  posterMark: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  posterInitial: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  posterCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  posterName: {
    color: theme.colors.white,
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  posterType: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '700',
  },
  savedIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(124,92,255,0.86)',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  title: {
    color: theme.colors.white,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 29,
    textShadowColor: 'rgba(0,0,0,0.34)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 4,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  metaText: {
    color: 'rgba(255,255,255,0.86)',
    flex: 1,
    fontSize: theme.typography.tiny,
    fontWeight: '700',
  },
  compensationRow: {
    flexDirection: 'row',
  },
  compensation: {
    alignItems: 'center',
    backgroundColor: 'rgba(66,48,145,0.72)',
    borderColor: 'rgba(205,196,255,0.38)',
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  compensationWarning: {
    backgroundColor: 'rgba(107,62,4,0.72)',
    borderColor: 'rgba(255,210,138,0.42)',
  },
  compensationText: {
    color: '#E4DEFF',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '900',
  },
  compensationWarningText: {
    color: '#FFE0A8',
  },
  workMeta: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: theme.typography.tiny,
    fontWeight: '700',
  },
  skills: {
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
  },
  skill: {
    backgroundColor: 'rgba(8,10,18,0.54)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    maxWidth: '31%',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  skillText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  summary: {
    color: theme.colors.white,
    fontSize: theme.typography.small,
    fontWeight: '600',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 3,
  },
  reason: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  reasonText: {
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
});
