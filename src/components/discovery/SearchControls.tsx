import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '@/constants/theme';

export function SearchBar({
  accessibilityLabel = 'Search',
  clearAccessibilityLabel = 'Clear search',
  onChangeText,
  placeholder,
  value,
}: {
  accessibilityLabel?: string;
  clearAccessibilityLabel?: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons
        color={theme.colors.muted}
        name="search-outline"
        size={theme.icons.standard}
      />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.mutedLight}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value ? (
        <Pressable
          accessibilityLabel={clearAccessibilityLabel}
          accessibilityRole="button"
          onPress={() => onChangeText('')}
          style={styles.clear}>
          <Ionicons
            color={theme.colors.muted}
            name="close-circle"
            size={theme.icons.standard}
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
}: {
  compact?: boolean;
  count: number;
  onPress: () => void;
}) {
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
        count > 0 && styles.active,
        pressed && styles.pressed,
      ]}>
      <Ionicons
        color={count > 0 ? theme.colors.accentStrong : theme.colors.text}
        name="options-outline"
        size={theme.icons.standard}
      />
      {!compact ? (
        <Text style={[styles.filterLabel, count > 0 && styles.activeLabel]}>
          Filters
        </Text>
      ) : null}
      {count > 0 ? (
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
    borderColor: '#D8CEFF',
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
  filterLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
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
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.7,
  },
});
