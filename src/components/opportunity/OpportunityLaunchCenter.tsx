import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OpportunityLinkPreviewCard } from '@/components/create/OpportunityLinkPreviewCard';
import { EliteCard, EliteSectionHeader, EliteSignalPill } from '@/components/ui';
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
  const statusLabel = opportunity.status === 'published' ? 'Live' : opportunity.status;
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

  async function copyShareText(label: string, value: string) {
    try {
      await Clipboard.setStringAsync(value);
      showSuccess(`${label} copied.`);
    } catch {
      showWarning(`${label} could not be copied. Try again.`);
    }
  }

  return (
    <EliteCard style={styles.shell} tone="accent">
      <View style={styles.header}>
        <EliteSignalPill
          icon="radio-outline"
          label="Live link"
          tone="success"
          value="public"
        />
        <Pressable
          accessibilityLabel="Preview public opportunity page"
          accessibilityRole="button"
          onPress={() => router.push(routes.publicOpportunity(slugOrId))}
          style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}>
          <Text style={styles.previewText}>Preview</Text>
          <Ionicons color={theme.colors.accentStrong} name="open-outline" size={16} />
        </Pressable>
      </View>

      <EliteSectionHeader
        eyebrow="Creator command"
        icon="sparkles-outline"
        subtitle="Launch the link, post the card, and review applicants without digging through DMs."
        title="Launch center"
      />

      <View style={styles.statusGrid}>
        <LaunchStatus
          icon="radio-outline"
          label="Page"
          tone="success"
          value={statusLabel}
        />
        <LaunchStatus
          icon="image-outline"
          label="Share card"
          tone="accent"
          value="4:5"
        />
        <LaunchStatus
          icon="people-outline"
          label="Applicants"
          tone="cyan"
          value="ready"
        />
      </View>

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

      <View style={styles.copyKit}>
        <View style={styles.copyKitHeader}>
          <Text style={styles.sectionLabel}>Post anywhere kit</Text>
          <Text style={styles.previewHint}>tap to copy</Text>
        </View>
        <LaunchCopyRow
          icon="leaf-outline"
          label="Bio / Linktree title"
          onPress={() => void copyShareText('Bio title', share.linktreeText)}
          value={share.linktreeText}
        />
        <LaunchCopyRow
          icon="camera-outline"
          label="Story line"
          onPress={() => void copyShareText('Story line', share.storyText)}
          value={share.storyText}
        />
        <LaunchCopyRow
          icon="chatbubble-ellipses-outline"
          label="Community caption"
          onPress={() => void copyShareText('Caption', share.socialCaption)}
          value={share.socialCaption}
        />
      </View>

      <OpportunityFunnelCard opportunityId={opportunity.id} />
    </EliteCard>
  );
}

function LaunchStatus({
  icon,
  label,
  tone,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: 'accent' | 'cyan' | 'success';
  value: string;
}) {
  const color =
    tone === 'success'
      ? theme.colors.success
      : tone === 'cyan'
        ? theme.colors.accentCyan
        : theme.colors.accentStrong;

  return (
    <View style={styles.statusItem}>
      <Ionicons color={color} name={icon} size={15} />
      <Text numberOfLines={1} style={styles.statusItemValue}>
        {value}
      </Text>
      <Text numberOfLines={1} style={styles.statusItemLabel}>
        {label}
      </Text>
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

function LaunchCopyRow({
  icon,
  label,
  onPress,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`Copy ${label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.copyRow, pressed && styles.pressed]}>
      <View style={styles.copyIcon}>
        <Ionicons color={theme.colors.accentStrong} name={icon} size={16} />
      </View>
      <View style={styles.copyText}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.copyValue}>
          {value}
        </Text>
      </View>
      <Ionicons color={theme.colors.muted} name="copy-outline" size={17} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  statusGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statusItem: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 74,
    padding: theme.spacing.sm,
  },
  statusItemValue: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
    textTransform: 'capitalize',
  },
  statusItemLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
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
  copyKit: {
    gap: theme.spacing.sm,
  },
  copyKitHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  copyRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 58,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  copyIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  copyText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  copyLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  copyValue: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.68,
  },
});
