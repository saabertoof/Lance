import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OpportunityLinkPreviewCard } from '@/components/create/OpportunityLinkPreviewCard';
import { theme } from '@/constants/theme';
import { useFeedback } from '@/context/FeedbackContext';
import {
  formatCompensation,
  formatOpportunityLocation,
  getOpportunityPublicUrl,
  getOpportunityShareCopy,
} from '@/lib/opportunity';
import { routes } from '@/lib/routes';
import type { OpportunityRecord } from '@/types/opportunity';

import { OpportunityFunnelCard } from './OpportunityFunnelCard';

export function OpportunityLaunchCenter({
  onShare,
  opportunity,
}: {
  onShare: () => void;
  opportunity: OpportunityRecord;
}) {
  const { showSuccess, showWarning } = useFeedback();
  const publicUrl = getOpportunityPublicUrl(opportunity);
  const share = getOpportunityShareCopy(opportunity);
  const slugOrId = opportunity.slug || opportunity.id;
  const launchKit = [
    share.linktreeText,
    '',
    share.socialCaption,
    '',
    publicUrl,
  ].join('\n');

  async function copyLink() {
    try {
      await Clipboard.setStringAsync(publicUrl);
      showSuccess('Opportunity link copied.');
    } catch {
      showWarning('The opportunity link could not be copied. Try again.');
    }
  }

  async function copyLaunchKit() {
    try {
      await Clipboard.setStringAsync(launchKit);
      showSuccess('Launch kit copied.');
    } catch {
      showWarning('The launch kit could not be copied. Try again.');
    }
  }

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live link</Text>
        </View>
        <Pressable
          accessibilityLabel="Preview public opportunity page"
          accessibilityRole="button"
          onPress={() => router.push(routes.publicOpportunity(slugOrId))}
          style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}>
          <Text style={styles.previewText}>Preview</Text>
          <Ionicons color={theme.colors.accentStrong} name="open-outline" size={16} />
        </Pressable>
      </View>

      <Text style={styles.title}>Launch center</Text>
      <Text style={styles.body}>
        Share the creator link, watch the funnel, and review applicants from one place.
      </Text>

      <View style={styles.previewShell}>
        <View style={styles.previewHeader}>
          <Text style={styles.sectionLabel}>Live preview</Text>
          <Text style={styles.previewHint}>what applicants see first</Text>
        </View>
        <OpportunityLinkPreviewCard
          compensationLabel={formatCompensation(opportunity)}
          locationLabel={formatOpportunityLocation(opportunity)}
          posterImageUrl={opportunity.poster.imageUrl}
          posterLabel={opportunity.poster.name}
          skills={opportunity.skills}
          summary={opportunity.shortSummary}
          title={opportunity.title}
          urlLabel={publicUrl}
        />
      </View>

      <Pressable
        accessibilityLabel="Copy public opportunity link"
        accessibilityRole="button"
        onPress={() => void copyLink()}
        style={({ pressed }) => [styles.linkBox, pressed && styles.pressed]}>
        <View style={styles.linkIcon}>
          <Ionicons color={theme.colors.accentStrong} name="link-outline" size={18} />
        </View>
        <View style={styles.linkCopy}>
          <Text style={styles.linkLabel}>Public opportunity link</Text>
          <Text numberOfLines={1} style={styles.linkText}>
            {publicUrl}
          </Text>
        </View>
        <Ionicons color={theme.colors.muted} name="copy-outline" size={18} />
      </Pressable>

      <View style={styles.actionGrid}>
        <LaunchAction
          icon="people-outline"
          label="Review applicants"
          onPress={() => router.push(routes.opportunityTalent(opportunity.id))}
          primary
        />
        <LaunchAction
          icon="paper-plane-outline"
          label="Share kit"
          onPress={onShare}
        />
        <LaunchAction
          icon="albums-outline"
          label="Copy launch kit"
          onPress={() => void copyLaunchKit()}
        />
        <LaunchAction
          icon="eye-outline"
          label="Preview link"
          onPress={() => router.push(routes.publicOpportunity(slugOrId))}
        />
      </View>

      <OpportunityFunnelCard opportunityId={opportunity.id} />
    </View>
  );
}

function LaunchAction({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.actionIcon, primary && styles.actionIconPrimary]}>
        <Ionicons
          color={primary ? theme.colors.white : theme.colors.accentStrong}
          name={icon}
          size={18}
        />
      </View>
      <Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(167,139,250,0.24)',
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderColor: 'rgba(167,139,250,0.24)',
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 28,
    paddingHorizontal: 10,
  },
  liveDot: {
    backgroundColor: theme.colors.success,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  liveText: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  previewButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 11,
  },
  previewText: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.caption,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.cardTitle,
  },
  body: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption,
    lineHeight: 18,
  },
  previewShell: {
    gap: theme.spacing.sm,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  previewHint: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: 10,
    textAlign: 'right',
  },
  linkBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
  },
  linkIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  linkCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  linkLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  linkText: {
    color: theme.colors.text,
    fontFamily: theme.typography.familyMedium,
    fontSize: theme.typography.caption,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  action: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 8,
    minHeight: 78,
    padding: theme.spacing.sm,
  },
  actionPrimary: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  actionIconPrimary: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  actionLabel: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.caption,
  },
  actionLabelPrimary: {
    color: theme.colors.white,
  },
  pressed: {
    opacity: 0.68,
  },
});
