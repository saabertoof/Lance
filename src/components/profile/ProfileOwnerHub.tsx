import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { OwnerProfileSummary } from '@/lib/profileHub';
import {
  availabilityOptions,
  experienceOptions,
  getOptionLabel,
  opportunityInterestOptions,
  remotePreferenceOptions,
  type PublicProfile,
} from '@/types/profile';
import {
  currentIntentOptions,
} from '@/types/profilePolish';

import { profileFonts, profileVisual } from './profileVisual';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ProfileDashboardItem = {
  badge?: number;
  count?: number | null;
  icon: IconName;
  label: string;
  onPress: () => void;
};

export type ProfileDashboardGroup = {
  items: ProfileDashboardItem[];
  title: string;
};

export function ProfileOwnerActions({
  onEdit,
  onPreview,
  onShare,
}: {
  onEdit: () => void;
  onPreview: () => void;
  onShare: () => void;
}) {
  return (
    <View style={styles.ownerActions}>
      <OwnerAction
        icon="create-outline"
        label="Edit profile"
        onPress={onEdit}
        primary
      />
      <OwnerAction icon="eye-outline" label="Preview" onPress={onPreview} />
      <OwnerAction icon="share-outline" label="Share" onPress={onShare} />
    </View>
  );
}

export function ProfileStatsRow({
  onApplied,
  onOpportunities,
  onSaved,
  summary,
}: {
  onApplied: () => void;
  onOpportunities: () => void;
  onSaved: () => void;
  summary: OwnerProfileSummary | null;
}) {
  return (
    <View style={styles.statsPanel}>
      <Stat
        label="Applied"
        onPress={onApplied}
        value={summary?.applied ?? null}
      />
      <Stat
        label="Opportunities"
        onPress={onOpportunities}
        value={summary?.opportunities ?? null}
      />
      <Stat
        label="Saved"
        onPress={onSaved}
        value={summary?.saved ?? null}
      />
    </View>
  );
}

export function ProfileConnectionLine({
  onPress,
  summary,
}: {
  onPress: () => void;
  summary: OwnerProfileSummary | null;
}) {
  const count = summary?.connections ?? 0;
  return (
    <Pressable
      accessibilityLabel={`${count} connections`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.connectionLine,
        pressed && styles.pressed,
      ]}>
      <Ionicons color={profileVisual.textSoft} name="people-outline" size={16} />
      <Text style={styles.connectionText}>{count} Connections</Text>
      {summary?.pendingRequests ? (
        <View style={styles.connectionBadge}>
          <Text style={styles.connectionBadgeText}>
            +{Math.min(summary.pendingRequests, 99)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ProfileSignalPillRow({ profile }: { profile: PublicProfile }) {
  return (
    <View style={styles.signalGrid}>
      <SignalPill
        dot
        icon="ellipse"
        label={compactAvailabilityLabel(
          getOptionLabel(availabilityOptions, profile.availability),
        )}
      />
      <SignalPill
        icon="paper-plane-outline"
        label={getOptionLabel(remotePreferenceOptions, profile.remotePreference)}
      />
      <SignalPill
        icon="git-network-outline"
        label={compactExperienceLabel(
          getOptionLabel(experienceOptions, profile.experienceLevel),
        )}
      />
    </View>
  );
}

export function ProfileCurrentBuildingCard({
  onEdit,
  profile,
}: {
  onEdit: () => void;
  profile: PublicProfile;
}) {
  const buildingPrompt =
    profile.polish.prompts.find(
      (prompt) => prompt.promptKey === 'building' && prompt.answer.trim(),
    ) ?? profile.polish.prompts.find((prompt) => prompt.answer.trim());
  const intent = profile.polish.currentIntents[0];
  const title =
    intent
      ? currentIntentOptions.find((option) => option.value === intent)?.label
      : profile.primaryRole || 'Currently building';
  const body =
    buildingPrompt?.answer.trim() ||
    profile.bio.trim() ||
    profile.headline.trim() ||
    'Add a sharp line about what you are building right now.';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onEdit}
      style={({ pressed }) => [
        styles.wideCard,
        pressed && styles.pressed,
      ]}>
      <SectionKicker icon="paper-plane-outline" label="Currently building" />
      <View style={styles.buildingBody}>
        <View style={styles.buildingIcon}>
          <Ionicons color={profileVisual.purple} name="people-outline" size={22} />
        </View>
        <View style={styles.buildingCopy}>
          <Text numberOfLines={1} style={styles.buildingTitle}>
            {title}
          </Text>
          <Text numberOfLines={2} style={styles.buildingText}>
            {body}
          </Text>
        </View>
        <View style={styles.privatePill}>
          <Ionicons color={profileVisual.muted} name="lock-closed-outline" size={12} />
          <Text style={styles.privatePillText}>Private</Text>
        </View>
        <Ionicons color={profileVisual.textSoft} name="chevron-forward" size={16} />
      </View>
    </Pressable>
  );
}

export function ProfileFeaturedWorkCard({
  onPress,
  profile,
}: {
  onPress: () => void;
  profile: PublicProfile;
}) {
  const item = profile.polish.portfolio[0];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniCard,
        pressed && styles.pressed,
      ]}>
      <SectionKicker icon="cube-outline" label="Featured work" />
      {item ? (
        <View style={styles.featuredBody}>
          <View style={styles.featuredThumb}>
            {item.thumbnailUrl || item.mediaUrl ? (
              <Image
                accessibilityLabel={item.accessibilityDescription || item.title}
                contentFit="cover"
                source={item.thumbnailUrl ?? item.mediaUrl}
                style={styles.imageFill}
              />
            ) : (
              <Ionicons color={profileVisual.white} name="cube" size={23} />
            )}
          </View>
          <View style={styles.featuredCopy}>
            <Text numberOfLines={1} style={styles.featuredTitle}>{item.title}</Text>
            <Text numberOfLines={2} style={styles.featuredText}>
              {item.caption || 'Featured portfolio piece'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.featuredEmpty}>
          <View style={styles.featuredThumbSmall}>
            <Ionicons color={profileVisual.text} name="cube" size={20} />
          </View>
          <View style={styles.featuredCopy}>
            <Text style={styles.featuredTitle}>Showcase what you have built.</Text>
            <Text style={styles.featuredLink}>Add featured work</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function ProfileProofOfWorkCard({
  onApplied,
  onBusinesses,
  onOpportunities,
  summary,
}: {
  onApplied: () => void;
  onBusinesses: () => void;
  onOpportunities: () => void;
  summary: OwnerProfileSummary | null;
}) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.proofHeader}>
        <SectionKicker icon="analytics-outline" label="Proof of work" />
      </View>
      <View style={styles.proofStats}>
        <ProofStat label="Applied" onPress={onApplied} value={summary?.applied ?? 0} />
        <ProofStat label="Posted" onPress={onOpportunities} value={summary?.opportunities ?? 0} />
        <ProofStat label="Business" onPress={onBusinesses} value={summary?.businesses ?? 0} />
      </View>
    </View>
  );
}

export function ProfileSkillsOpenGrid({
  onEdit,
  profile,
}: {
  onEdit: () => void;
  profile: PublicProfile;
}) {
  return (
    <View style={styles.twoColumnRow}>
      <Pressable
        accessibilityRole="button"
        onPress={onEdit}
        style={({ pressed }) => [
          styles.miniCard,
          pressed && styles.pressed,
        ]}>
        <View style={styles.proofHeader}>
          <SectionKicker icon="code-slash-outline" label="Skills" />
          <Ionicons color={profileVisual.textSoft} name="add" size={21} />
        </View>
        <View style={styles.chipCloud}>
          {(profile.skills.length ? profile.skills : ['Add skills']).slice(0, 4).map((skill) => (
            <ProfileMicroChip key={skill.toLowerCase()} label={skill} />
          ))}
        </View>
      </Pressable>

      <View style={styles.miniCard}>
        <SectionKicker icon="locate-outline" label="Open to" />
        <View style={styles.chipCloud}>
          {(profile.opportunityInterests.length
            ? profile.opportunityInterests
                .map((interest) =>
                  getOptionLabel(opportunityInterestOptions, interest),
                )
            : ['Open to discussing']
          )
            .slice(0, 4)
            .map((interest) => (
              <ProfileMicroChip accent key={interest.toLowerCase()} label={interest} />
            ))}
        </View>
      </View>
    </View>
  );
}

export function ProfileBackgroundStrip({ profile }: { profile: PublicProfile }) {
  return (
    <View style={styles.backgroundStrip}>
      <SectionKicker icon="person-outline" label="Background" />
      <View style={styles.backgroundColumns}>
        <BackgroundFact
          label="Experience"
          value={getOptionLabel(experienceOptions, profile.experienceLevel)}
        />
        <BackgroundFact
          label="Availability"
          value={getOptionLabel(availabilityOptions, profile.availability)}
        />
        <BackgroundFact
          label="Work style"
          value={getOptionLabel(remotePreferenceOptions, profile.remotePreference)}
        />
      </View>
    </View>
  );
}

export function ProfileOwnerDashboard({
  groups,
}: {
  groups: ProfileDashboardGroup[];
}) {
  return (
    <View style={styles.dashboardPanel}>
      <View style={styles.dashboardHeader}>
        <SectionKicker icon="grid-outline" label="Manage & dashboard" />
        <Text style={styles.viewAllText}>View all</Text>
      </View>
      {groups.map((group) => (
        <View key={group.title} style={styles.dashboardGroup}>
          <View style={styles.rows}>
            {group.items.map((item) => (
              <DashboardRow item={item} key={item.label} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export function ProfileCompletionCard({
  actions,
  completion,
  onPress,
}: {
  actions: string[];
  completion: number;
  onPress: () => void;
}) {
  if (completion >= 90 || actions.length === 0) return null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.completion,
        pressed && styles.pressed,
      ]}>
      <View style={styles.completionHeader}>
        <View style={styles.completionCopy}>
          <Text style={styles.completionTitle}>Make your profile stand out</Text>
          <Text style={styles.completionValue}>{completion}% complete</Text>
        </View>
        <Ionicons
          color={profileVisual.purple}
          name="arrow-forward"
          size={20}
        />
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${completion}%` }]} />
      </View>
      <Text numberOfLines={2} style={styles.completionActions}>
        {actions.slice(0, 3).join('  |  ')}
      </Text>
    </Pressable>
  );
}

export function ProfileOverlayButton({
  children,
  label,
  onPress,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.overlayButton,
        pressed && styles.pressed,
      ]}>
      {children}
    </Pressable>
  );
}

function OwnerAction({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.ownerAction,
        primary && styles.ownerActionPrimary,
        pressed && styles.pressed,
      ]}>
      <Ionicons
        color={primary ? profileVisual.white : profileVisual.text}
        name={icon}
        size={18}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.ownerActionLabel,
          primary && styles.ownerActionLabelPrimary,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Stat({
  badge,
  label,
  onPress,
  value,
}: {
  badge?: number;
  label: string;
  onPress: () => void;
  value: number | null;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}, ${value ?? 'count unavailable'}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.stat,
        pressed && styles.pressed,
      ]}>
      {badge ? (
        <View style={styles.statBadge}>
          <Text style={styles.statBadgeText}>{Math.min(badge, 99)}</Text>
        </View>
      ) : null}
      <Text style={styles.statValue}>
        {value ?? '-'}
      </Text>
      <Text
        numberOfLines={1}
        style={styles.statLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function DashboardRow({ item }: { item: ProfileDashboardItem }) {
  const hasBadge = Boolean(item.badge);
  const accessory =
    hasBadge ? (
      <View style={styles.rowBadge}>
        <Text style={styles.rowBadgeText}>{Math.min(item.badge ?? 0, 99)}</Text>
      </View>
    ) : item.count != null ? (
      <Text style={styles.rowCount}>{item.count}</Text>
    ) : null;

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="button"
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.dashboardRow,
        pressed && styles.pressed,
      ]}>
      <View style={styles.rowIcon}>
        <Ionicons color={profileVisual.purple} name={item.icon} size={20} />
      </View>
      <Text numberOfLines={1} style={styles.rowLabel}>{item.label}</Text>
      {accessory}
    </Pressable>
  );
}

function SignalPill({
  dot,
  icon,
  label,
}: {
  dot?: boolean;
  icon: IconName;
  label: string;
}) {
  return (
    <View style={styles.signalPill}>
      {dot ? (
        <View style={styles.signalPillDot} />
      ) : (
        <Ionicons color={profileVisual.text} name={icon} size={16} />
      )}
      <Text numberOfLines={1} style={styles.signalPillText}>{label}</Text>
    </View>
  );
}

function compactAvailabilityLabel(label: string) {
  return label
    .replace('A few hours per week', 'A few hrs/wk')
    .replace(' hours per week', ' hrs/wk');
}

function compactExperienceLabel(label: string) {
  if (label === 'Just starting') return 'Starting';
  if (label === 'Some experience') return 'Some exp.';
  return label;
}

function SectionKicker({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.kickerRow}>
      <Ionicons color={profileVisual.textSoft} name={icon} size={15} />
      <Text numberOfLines={1} style={styles.kickerText}>{label}</Text>
    </View>
  );
}

function ProofStat({
  label,
  onPress,
  value,
}: {
  label: string;
  onPress: () => void;
  value: number;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}, ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.proofStat,
        pressed && styles.pressed,
      ]}>
      <Text style={styles.proofValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.proofLabel}>{label}</Text>
    </Pressable>
  );
}

function ProfileMicroChip({
  accent,
  label,
}: {
  accent?: boolean;
  label: string;
}) {
  return (
    <View style={[styles.microChip, accent && styles.microChipAccent]}>
      {accent ? <View style={styles.microChipDot} /> : null}
      <Text numberOfLines={1} style={styles.microChipText}>{label}</Text>
    </View>
  );
}

function BackgroundFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.backgroundFact}>
      <Text numberOfLines={1} style={styles.backgroundLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.backgroundValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ownerActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  ownerAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.052)',
    borderColor: profileVisual.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: theme.spacing.sm,
  },
  ownerActionPrimary: {
    backgroundColor: profileVisual.purpleStrong,
    borderColor: profileVisual.purple,
    flex: 1.35,
  },
  ownerActionLabel: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansMedium,
    fontSize: theme.typography.caption,
    fontWeight: '500',
  },
  ownerActionLabelPrimary: {
    color: profileVisual.white,
  },
  statsPanel: {
    backgroundColor: profileVisual.surface,
    borderColor: profileVisual.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    borderRightColor: profileVisual.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    minHeight: 66,
    paddingHorizontal: 4,
    position: 'relative',
  },
  statValue: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 21,
    fontWeight: '600',
  },
  statLabel: {
    color: profileVisual.muted,
    fontFamily: profileFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
  connectionLine: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    minHeight: 28,
    paddingHorizontal: 8,
  },
  connectionText: {
    color: profileVisual.textSoft,
    fontFamily: profileFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  connectionBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: theme.radii.pill,
    minHeight: 20,
    minWidth: 24,
    paddingHorizontal: 7,
  },
  connectionBadgeText: {
    color: profileVisual.textSoft,
    fontFamily: profileFonts.sansMedium,
    fontSize: 10,
    fontWeight: '500',
  },
  signalGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  signalPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: profileVisual.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  signalPillDot: {
    backgroundColor: profileVisual.purple,
    borderRadius: 6,
    height: 8,
    width: 8,
  },
  signalPillText: {
    color: profileVisual.text,
    flexShrink: 1,
    fontFamily: profileFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  wideCard: {
    backgroundColor: profileVisual.surface,
    borderColor: profileVisual.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  kickerRow: {
    alignItems: 'center',
    flexShrink: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  kickerText: {
    color: '#C7B8FF',
    flexShrink: 1,
    fontFamily: profileFonts.monoMedium,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  buildingBody: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  buildingIcon: {
    alignItems: 'center',
    backgroundColor: profileVisual.purpleSoft,
    borderColor: profileVisual.borderStrong,
    borderRadius: 14,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  buildingCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  buildingTitle: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
  },
  buildingText: {
    color: profileVisual.muted,
    fontFamily: profileFonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  privatePill: {
    alignItems: 'center',
    borderColor: profileVisual.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 26,
    paddingHorizontal: 8,
  },
  privatePillText: {
    color: profileVisual.textSoft,
    fontFamily: profileFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniCard: {
    backgroundColor: profileVisual.surface,
    borderColor: profileVisual.border,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    minHeight: 128,
    minWidth: 0,
    padding: 14,
  },
  featuredBody: {
    gap: 10,
  },
  featuredEmpty: {
    flexDirection: 'row',
    gap: 12,
  },
  featuredThumb: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 54,
  },
  featuredThumbSmall: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  imageFill: {
    height: '100%',
    width: '100%',
  },
  featuredCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  featuredTitle: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  featuredText: {
    color: profileVisual.textSoft,
    fontFamily: profileFonts.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  featuredLink: {
    color: profileVisual.purple,
    fontFamily: profileFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  proofHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  viewAllText: {
    color: profileVisual.purple,
    flexShrink: 0,
    fontFamily: profileFonts.sansMedium,
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '500',
  },
  proofStats: {
    borderTopColor: profileVisual.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingTop: 14,
  },
  proofStat: {
    alignItems: 'center',
    borderRightColor: profileVisual.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 3,
    minHeight: 46,
  },
  proofValue: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 17,
    fontWeight: '600',
  },
  proofLabel: {
    color: profileVisual.muted,
    fontFamily: profileFonts.sansMedium,
    fontSize: 10,
    fontWeight: '500',
  },
  chipCloud: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  microChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: profileVisual.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  microChipAccent: {
    backgroundColor: profileVisual.purpleSoft,
    borderColor: profileVisual.borderStrong,
  },
  microChipDot: {
    backgroundColor: profileVisual.purple,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  microChipText: {
    color: profileVisual.textSoft,
    flexShrink: 1,
    fontFamily: profileFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  backgroundStrip: {
    backgroundColor: profileVisual.surface,
    borderColor: profileVisual.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  backgroundColumns: {
    flexDirection: 'row',
  },
  backgroundFact: {
    borderRightColor: profileVisual.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 5,
    paddingRight: 8,
  },
  backgroundLabel: {
    color: profileVisual.muted,
    fontFamily: profileFonts.monoMedium,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  backgroundValue: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  statBadge: {
    alignItems: 'center',
    backgroundColor: profileVisual.danger,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 19,
    minWidth: 19,
    paddingHorizontal: 5,
    position: 'absolute',
    right: 8,
    top: 8,
  },
  statBadgeText: {
    color: profileVisual.white,
    fontSize: 10,
    fontWeight: '700',
  },
  dashboardPanel: {
    backgroundColor: profileVisual.surface,
    borderColor: profileVisual.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 13,
    padding: 14,
  },
  dashboardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  dashboardGroup: {
    gap: 8,
  },
  groupTitle: {
    color: profileVisual.mutedDim,
    fontFamily: profileFonts.monoMedium,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  rows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dashboardRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: profileVisual.border,
    borderRadius: 15,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 70,
    padding: 10,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: profileVisual.purpleSoft,
    borderColor: profileVisual.borderStrong,
    borderRadius: 13,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowLabel: {
    color: profileVisual.textSoft,
    fontFamily: profileFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
    maxWidth: '100%',
    textAlign: 'center',
  },
  rowCount: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  rowBadge: {
    alignItems: 'center',
    backgroundColor: profileVisual.purpleStrong,
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    minHeight: 21,
    minWidth: 21,
    paddingHorizontal: 6,
  },
  rowBadgeText: {
    color: profileVisual.white,
    fontSize: 10,
    fontWeight: '700',
  },
  completion: {
    backgroundColor: profileVisual.purpleSoft,
    borderColor: profileVisual.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  completionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  completionCopy: {
    flex: 1,
    gap: 2,
  },
  completionTitle: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  completionValue: {
    color: profileVisual.purple,
    fontFamily: profileFonts.sansMedium,
    fontSize: theme.typography.tiny,
    fontWeight: '500',
  },
  track: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: theme.radii.pill,
    height: 5,
    overflow: 'hidden',
  },
  trackFill: {
    backgroundColor: profileVisual.purple,
    borderRadius: theme.radii.pill,
    height: '100%',
  },
  completionActions: {
    color: profileVisual.muted,
    fontFamily: profileFonts.sans,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  overlayButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pressed: {
    opacity: 0.7,
  },
});
