import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { theme } from '@/constants/theme';

type EliteTone = 'accent' | 'cyan' | 'neutral' | 'success' | 'warning';

const toneStyles = {
  accent: {
    border: 'rgba(167,139,250,0.26)',
    glow: theme.colors.accentSoft,
    icon: theme.colors.accentStrong,
    line: theme.colors.accent,
  },
  cyan: {
    border: 'rgba(56,213,255,0.22)',
    glow: theme.colors.accentCyanSoft,
    icon: theme.colors.accentCyan,
    line: theme.colors.accentCyan,
  },
  neutral: {
    border: theme.colors.border,
    glow: theme.colors.glass,
    icon: theme.colors.textSoft,
    line: theme.colors.borderStrong,
  },
  success: {
    border: 'rgba(52,216,112,0.22)',
    glow: 'rgba(52,216,112,0.11)',
    icon: theme.colors.success,
    line: theme.colors.success,
  },
  warning: {
    border: 'rgba(248,196,107,0.24)',
    glow: theme.colors.warningSoft,
    icon: theme.colors.warning,
    line: theme.colors.warning,
  },
} as const;

export function EliteCard({
  children,
  compact,
  style,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: EliteTone;
}) {
  const colors = toneStyles[tone];

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { borderColor: colors.border },
        style,
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.cardWash,
          { backgroundColor: colors.glow, borderColor: colors.border },
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.cardAccent, { backgroundColor: colors.line }]}
      />
      {children}
    </View>
  );
}

export function EliteSectionHeader({
  actionLabel,
  eyebrow,
  icon,
  onAction,
  subtitle,
  title,
  tone = 'accent',
}: {
  actionLabel?: string;
  eyebrow?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  subtitle?: string;
  title: string;
  tone?: EliteTone;
}) {
  const colors = toneStyles[tone];

  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? (
          <View style={styles.eyebrowRow}>
            {icon ? <Ionicons color={colors.icon} name={icon} size={13} /> : null}
            <Text style={[styles.eyebrow, { color: colors.icon }]}>{eyebrow}</Text>
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}>
          <Text style={[styles.headerActionText, { color: colors.icon }]}>
            {actionLabel}
          </Text>
          <Ionicons color={colors.icon} name="arrow-forward" size={14} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function EliteSignalPill({
  icon,
  label,
  tone = 'neutral',
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: EliteTone;
  value?: string;
}) {
  const colors = toneStyles[tone];

  return (
    <View
      style={[
        styles.signal,
        { backgroundColor: colors.glow, borderColor: colors.border },
      ]}>
      <Ionicons color={colors.icon} name={icon} size={15} />
      <View style={styles.signalCopy}>
        <Text numberOfLines={1} style={styles.signalLabel}>
          {label}
        </Text>
        {value ? (
          <Text numberOfLines={1} style={styles.signalValue}>
            {value}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function EliteHairline({ tone = 'neutral' }: { tone?: EliteTone }) {
  return (
    <View
      style={[
        styles.hairline,
        { backgroundColor: toneStyles[tone].border },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    gap: theme.spacing.md,
    overflow: 'hidden',
    padding: theme.spacing.md,
    position: 'relative',
    ...theme.shadows.card,
  },
  cardCompact: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.sm,
  },
  cardWash: {
    borderBottomLeftRadius: theme.radii.xl,
    borderBottomWidth: 1,
    height: 92,
    position: 'absolute',
    right: -32,
    top: -42,
    transform: [{ rotate: '-16deg' }],
    width: 180,
  },
  cardAccent: {
    borderRadius: theme.radii.pill,
    height: 2,
    left: theme.spacing.md,
    opacity: 0.82,
    position: 'absolute',
    right: theme.spacing.md,
    top: 0,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  eyebrow: {
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.cardTitle,
  },
  subtitle: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption,
    lineHeight: 17,
  },
  headerAction: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  headerActionText: {
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.caption,
  },
  signal: {
    alignItems: 'center',
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  signalCopy: {
    gap: 1,
    minWidth: 0,
  },
  signalLabel: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.caption,
  },
  signalValue: {
    color: theme.colors.muted,
    fontSize: 9,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  pressed: {
    opacity: 0.68,
  },
});
