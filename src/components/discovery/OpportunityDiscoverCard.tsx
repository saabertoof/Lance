import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
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
        {opportunity.poster.imageUrl ? (
          <Image
            blurRadius={18}
            cachePolicy="memory-disk"
            contentFit="cover"
            priority="high"
            source={opportunity.poster.imageUrl}
            style={styles.backgroundImage}
            transition={0}
          />
        ) : (
          <>
            <View style={styles.fallbackAccent} />
            <View style={styles.fallbackAccentSecondary} />
            <Text style={styles.fallbackMark}>{mark}</Text>
          </>
        )}
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
                cachePolicy="memory-disk"
                contentFit="cover"
                priority="high"
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
                ? 'Team profile'
                : 'Personal profile'}
            </Text>
          </View>
          <View style={styles.savedIndicator}>
            <Ionicons
              color={isSaved ? v.purpleStrong : v.text}
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={23}
            />
          </View>
        </View>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Open</Text>
        </View>

        <Text numberOfLines={2} style={styles.title}>
          {opportunity.title}
        </Text>

        <Text numberOfLines={3} style={styles.summary}>
          {opportunity.shortSummary}
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
          {getOptionLabel(workTypeOptions, opportunity.workType)} ·{' '}
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

        {reasons.length > 0 ? (
          <View style={styles.reason}>
            <Ionicons color="#C8BEFF" name="sparkles-outline" size={14} />
            <Text numberOfLines={1} style={styles.reasonText}>
              {reasons.join(' · ')}
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
    backgroundColor: v.surface,
    borderColor: v.borderPurple,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    minHeight: 390,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.76,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: v.surface,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackAccent: {
    backgroundColor: v.purple,
    height: '140%',
    opacity: 0.12,
    position: 'absolute',
    right: '15%',
    transform: [{ rotate: '22deg' }],
    width: 104,
  },
  fallbackAccentSecondary: {
    backgroundColor: '#4462D6',
    height: '80%',
    left: '7%',
    opacity: 0.08,
    position: 'absolute',
    transform: [{ rotate: '-18deg' }],
    width: 74,
  },
  fallbackMark: {
    color: 'rgba(255,255,255,0.08)',
    fontSize: 144,
    fontWeight: '600',
  },
  mediaWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,10,0.45)',
  },
  fadeTop: {
    backgroundColor: 'rgba(5,5,10,0.24)',
    bottom: 0,
    height: '74%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  fadeMiddle: {
    backgroundColor: 'rgba(5,5,10,0.3)',
    bottom: 0,
    height: '60%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  fadeBottom: {
    backgroundColor: 'rgba(5,5,10,0.52)',
    bottom: 0,
    height: '46%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  content: {
    bottom: 0,
    gap: 11,
    left: 0,
    padding: 20,
    position: 'absolute',
    right: 0,
  },
  posterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  posterMark: {
    alignItems: 'center',
    backgroundColor: v.surfaceStrong,
    borderColor: v.borderStrong,
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  posterInitial: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  posterCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  posterName: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
  },
  posterType: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
  },
  savedIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,10,0.44)',
    borderColor: v.borderStrong,
    borderRadius: 22,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 30,
    paddingHorizontal: 10,
  },
  statusDot: {
    backgroundColor: v.purple,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusText: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 27,
    fontWeight: '600',
    lineHeight: 32,
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
    color: v.textSoft,
    flex: 1,
    fontFamily: operatorFonts.sans,
    fontSize: 13,
  },
  compensationRow: {
    flexDirection: 'row',
  },
  compensation: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    maxWidth: '100%',
    minHeight: 30,
    paddingHorizontal: 10,
  },
  compensationWarning: {
    backgroundColor: 'rgba(107,62,4,0.72)',
    borderColor: 'rgba(255,210,138,0.42)',
  },
  compensationText: {
    color: v.purpleStrong,
    flexShrink: 1,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  compensationWarningText: {
    color: '#FFE0A8',
  },
  workMeta: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 13,
  },
  skills: {
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
  },
  skill: {
    backgroundColor: 'rgba(8,10,18,0.56)',
    borderColor: v.borderStrong,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    maxWidth: '31%',
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 10,
  },
  skillText: {
    color: v.text,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  summary: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 3,
  },
  reason: {
    alignItems: 'center',
    borderTopColor: v.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
    paddingTop: 12,
  },
  reasonText: {
    color: v.textSoft,
    flex: 1,
    fontFamily: operatorFonts.sans,
    fontSize: 11,
  },
});
