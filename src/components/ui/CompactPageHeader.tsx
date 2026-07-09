import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type CompactPageHeaderProps = {
  eyebrow?: string;
  onBackPress?: () => void;
  rightAction?: ReactNode;
  subtitle?: string;
  title: string;
};

export function CompactPageHeader({
  eyebrow,
  onBackPress,
  rightAction,
  subtitle,
  title,
}: CompactPageHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBackPress ?? (() => router.back())}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <Ionicons color={theme.colors.textSoft} name="arrow-back" size={20} />
      </Pressable>

      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.action}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
  },
  backButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingTop: 1,
  },
  eyebrow: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: 20,
    lineHeight: 24,
  },
  subtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.family,
    fontSize: theme.typography.caption,
    lineHeight: 16,
  },
  action: {
    alignItems: 'flex-end',
    minHeight: 44,
    minWidth: 44,
  },
  pressed: {
    opacity: 0.66,
  },
});
