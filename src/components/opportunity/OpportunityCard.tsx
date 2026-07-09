import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SaveButton } from '@/components/saved';
import { Chip } from '@/components/ui';
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
import { theme } from '@/constants/theme';
import { formatCompensation, formatOpportunityLocation } from '@/lib/opportunity';
import { getOptionLabel } from '@/types/profile';
import {
  OpportunityRecord,
  timeCommitmentOptions,
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
  variant?: 'default' | 'terminal';
};

export function OpportunityCard({
  isSaved,
  onPress,
  onSavePress,
  opportunity,
  variant = 'default',
}: OpportunityCardProps) {
  const mark = opportunity.poster.name.charAt(0).toUpperCase() || 'L';
  const terminal = variant === 'terminal';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        terminal && styles.terminalCard,
        pressed && styles.pressed,
      ]}>
      <View style={styles.posterRow}>
        <View style={[styles.imageWrap, terminal && styles.terminalImageWrap]}>
          {opportunity.poster.imageUrl ? (
            <Image
              contentFit="cover"
              source={opportunity.poster.imageUrl}
              style={styles.image}
            />
          ) : (
            <Text style={[styles.mark, terminal && styles.terminalMark]}>{mark}</Text>
          )}
        </View>
        <View style={styles.posterCopy}>
          <Text style={[styles.poster, terminal && styles.terminalPoster]}>
            {opportunity.poster.name}
          </Text>
          <Text style={[styles.identity, terminal && styles.terminalMuted]}>
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
        <Text numberOfLines={2} style={[styles.title, terminal && styles.terminalTitle]}>
          {opportunity.title}
        </Text>
        <Ionicons color={terminal ? v.muted : theme.colors.muted} name="chevron-forward" size={20} />
      </View>

      <Text numberOfLines={3} style={[styles.summary, terminal && styles.terminalSummary]}>
        {opportunity.shortSummary}
      </Text>

      {terminal ? (
        <View style={styles.badges}>
          <TerminalChip label={formatCompensation(opportunity)} />
          <TerminalChip label={formatOpportunityLocation(opportunity)} />
        </View>
      ) : (
        <View style={styles.badges}>
          <CompensationBadge
            compensationType={opportunity.compensationType}
            label={formatCompensation(opportunity)}
          />
          <WorkArrangementBadge
            label={formatOpportunityLocation(opportunity)}
          />
        </View>
      )}

      <Text style={[styles.meta, terminal && styles.terminalMuted]}>
        {getOptionLabel(workTypeOptions, opportunity.workType)} ·{' '}
        {getOptionLabel(timeCommitmentOptions, opportunity.timeCommitment)}
      </Text>

      <View style={styles.skills}>
        {opportunity.skills.slice(0, 4).map((skill) => (
          terminal ? (
            <TerminalChip key={skill.toLowerCase()} label={skill} />
          ) : (
            <Chip key={skill.toLowerCase()} label={skill} />
          )
        ))}
      </View>
    </Pressable>
  );
}

function TerminalChip({ label }: { label: string }) {
  return (
    <View style={styles.terminalChip}>
      <Text numberOfLines={1} style={styles.terminalChipText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    gap: 10,
    padding: theme.spacing.md,
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
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.body,
  },
  posterCopy: {
    flex: 1,
    gap: 2,
  },
  poster: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
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
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.sectionHeading,
    lineHeight: 21,
  },
  summary: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption,
    lineHeight: 17,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    lineHeight: 17,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
  terminalCard: {
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 18,
    elevation: 0,
    gap: 11,
    padding: 13,
    shadowOpacity: 0,
  },
  terminalImageWrap: {
    backgroundColor: v.purpleSoft,
  },
  terminalMark: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontWeight: '600',
  },
  terminalPoster: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  terminalTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 23,
  },
  terminalSummary: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  terminalMuted: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
  },
  terminalChip: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: v.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: 9,
  },
  terminalChipText: {
    color: v.textSoft,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
});
