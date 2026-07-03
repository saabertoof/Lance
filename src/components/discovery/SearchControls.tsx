import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
import { theme } from '@/constants/theme';

export function SearchBar({
  accessibilityLabel = 'Search',
  clearAccessibilityLabel = 'Clear search',
  onChangeText,
  placeholder,
  value,
  variant = 'default',
}: {
  accessibilityLabel?: string;
  clearAccessibilityLabel?: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
  variant?: 'default' | 'operator';
}) {
  const operator = variant === 'operator';

  return (
    <View style={[styles.search, operator && styles.operatorSearch]}>
      <Ionicons
        color={operator ? v.textSoft : theme.colors.muted}
        name="search-outline"
        size={operator ? 18 : theme.icons.standard}
      />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={operator ? v.muted : theme.colors.mutedLight}
        returnKeyType="search"
        style={[styles.input, operator && styles.operatorInput]}
        value={value}
      />
      {value ? (
        <Pressable
          accessibilityLabel={clearAccessibilityLabel}
          accessibilityRole="button"
          onPress={() => onChangeText('')}
          style={styles.clear}>
          <Ionicons
            color={operator ? v.textSoft : theme.colors.muted}
            name={operator ? 'close' : 'close-circle'}
            size={operator ? 18 : theme.icons.standard}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export function FilterButton({
  compact,
  count,
  onPress,
  variant = 'default',
}: {
  compact?: boolean;
  count: number;
  onPress: () => void;
  variant?: 'default' | 'operator';
}) {
  const operator = variant === 'operator';

  return (
    <Pressable
      accessibilityLabel={
        count ? `Open filters, ${count} active` : 'Open filters'
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.filter,
        compact && styles.compactFilter,
        operator && styles.operatorFilter,
        count > 0 && styles.active,
        operator && count > 0 && styles.operatorActive,
        pressed && styles.pressed,
      ]}>
      <Ionicons
        color={
          operator
            ? count > 0
              ? v.purpleStrong
              : v.text
            : count > 0
              ? theme.colors.accentStrong
              : theme.colors.text
        }
        name="options-outline"
        size={operator ? 19 : theme.icons.standard}
      />
      {!compact ? (
        <Text style={[styles.filterLabel, count > 0 && styles.activeLabel]}>
          Filters
        </Text>
      ) : null}
      {operator && compact && count > 0 ? (
        <View style={styles.operatorDot} />
      ) : count > 0 ? (
        <View style={[styles.count, compact && styles.compactCount]}>
          <Text style={styles.countLabel}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: theme.density.controlGap,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: 12,
  },
  input: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.body,
    minHeight: theme.layout.inputHeight,
    paddingVertical: 0,
  },
  operatorSearch: {
    backgroundColor: '#0E0E16',
    borderColor: v.borderStrong,
    borderRadius: 16,
    minHeight: 44,
    paddingHorizontal: 13,
  },
  operatorInput: {
    color: v.text,
    fontFamily: operatorFonts.sans,
    fontSize: 14,
    minHeight: 44,
  },
  clear: {
    alignItems: 'center',
    height: theme.layout.minTouchTarget,
    justifyContent: 'center',
    width: theme.layout.minTouchTarget,
  },
  filter: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.density.controlGap,
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
  },
  active: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  operatorActive: {
    backgroundColor: v.surface,
    borderColor: v.borderPurple,
  },
  compactFilter: {
    alignSelf: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 0,
    width: 44,
  },
  operatorFilter: {
    backgroundColor: v.surface,
    borderColor: v.borderStrong,
    borderRadius: 16,
    height: 42,
    minHeight: 42,
    width: 42,
  },
  filterLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontFamily: operatorFonts.sansSemiBold,
    fontWeight: '600',
  },
  activeLabel: {
    color: theme.colors.accentStrong,
  },
  count: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 6,
  },
  compactCount: {
    borderColor: theme.colors.surface,
    borderWidth: 2,
    height: 20,
    minWidth: 20,
    position: 'absolute',
    right: -5,
    top: -5,
  },
  countLabel: {
    color: theme.colors.white,
    fontSize: theme.typography.tiny,
    fontWeight: '600',
  },
  operatorDot: {
    backgroundColor: v.purple,
    borderColor: v.surface,
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    position: 'absolute',
    right: -3,
    top: -3,
    width: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
