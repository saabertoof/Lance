import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { OwnerProfileSummary } from '@/lib/profileHub';

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
      <OwnerAction icon="share-outline" label="Share" onPress={onShare} />
      <OwnerAction icon="eye-outline" label="Preview" onPress={onPreview} />
    </View>
  );
}

export function ProfileStatsRow({
  onApplied,
  onConnections,
  onJobs,
  summary,
}: {
  onApplied: () => void;
  onConnections: () => void;
  onJobs: () => void;
  summary: OwnerProfileSummary | null;
}) {
  return (
    <View style={styles.stats}>
      <Stat
        badge={summary?.pendingRequests}
        emphasized
        label="Connections"
        onPress={onConnections}
        value={summary?.connections ?? null}
      />
      <Stat
        label="Applied"
        onPress={onApplied}
        value={summary?.applied ?? null}
      />
      <Stat
        badge={summary?.newApplicants}
        label="Jobs"
        onPress={onJobs}
        value={summary?.jobs ?? null}
      />
    </View>
  );
}

export function ProfileOwnerDashboard({
  groups,
}: {
  groups: ProfileDashboardGroup[];
}) {
  return (
    <View style={styles.dashboard}>
      <Text style={styles.dashboardTitle}>Your Lance</Text>
      {groups.map((group) => (
        <View key={group.title} style={styles.dashboardGroup}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.tiles}>
            {group.items.map((item) => (
              <DashboardTile item={item} key={item.label} />
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
          color={theme.colors.accentStrong}
          name="arrow-forward"
          size={20}
        />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${completion}%` }]} />
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
        color={primary ? theme.colors.white : theme.colors.text}
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
  emphasized,
  label,
  onPress,
  value,
}: {
  badge?: number;
  emphasized?: boolean;
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
        emphasized && styles.statEmphasized,
        pressed && styles.pressed,
      ]}>
      {badge ? (
        <View style={styles.statBadge}>
          <Text style={styles.statBadgeText}>{Math.min(badge, 99)}</Text>
        </View>
      ) : null}
      <Text style={[styles.statValue, emphasized && styles.statValueEmphasized]}>
        {value ?? '-'}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.statLabel, emphasized && styles.statLabelEmphasized]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DashboardTile({ item }: { item: ProfileDashboardItem }) {
  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="button"
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.tile,
        pressed && styles.pressed,
      ]}>
      <View style={styles.tileTop}>
        <View style={styles.tileIcon}>
          <Ionicons color={theme.colors.accentStrong} name={item.icon} size={20} />
        </View>
        {item.badge ? (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>{Math.min(item.badge, 99)}</Text>
          </View>
        ) : item.count != null ? (
          <Text style={styles.tileCount}>{item.count}</Text>
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.tileLabel}>
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ownerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    width: '100%',
  },
  ownerAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  ownerActionPrimary: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
    flex: 1.25,
  },
  ownerActionLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.tiny,
    fontWeight: '800',
  },
  ownerActionLabelPrimary: {
    color: theme.colors.white,
  },
  stats: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 76,
    paddingHorizontal: 4,
    position: 'relative',
  },
  statEmphasized: {
    backgroundColor: theme.colors.accentSoft,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  statValueEmphasized: {
    color: theme.colors.accentStrong,
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  statLabelEmphasized: {
    color: theme.colors.accentStrong,
  },
  statBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
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
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  dashboard: {
    gap: theme.density.contentGap,
  },
  dashboardTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sectionHeading,
    fontWeight: '900',
  },
  dashboardGroup: {
    gap: theme.spacing.sm,
  },
  groupTitle: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tile: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    minHeight: 94,
    padding: theme.spacing.md,
    width: '48.5%',
  },
  tileTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tileIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  tileCount: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  tileBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    minHeight: 22,
    minWidth: 22,
    paddingHorizontal: 6,
  },
  tileBadgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  tileLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
    lineHeight: 18,
  },
  completion: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: '#D9D0FF',
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
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
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  completionValue: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.tiny,
    fontWeight: '800',
  },
  track: {
    backgroundColor: 'rgba(104,67,244,0.16)',
    borderRadius: theme.radii.pill,
    height: 7,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    height: '100%',
  },
  completionActions: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  overlayButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    opacity: 0.7,
  },
});
