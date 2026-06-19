import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type SegmentedControlProps<T extends string> = {
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  value: T;
};

export function SegmentedControl<T extends string>({
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="tablist" style={styles.control}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.86}
              numberOfLines={1}
              style={[styles.label, selected && styles.selectedLabel]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 2,
  },
  option: {
    alignItems: 'center',
    borderRadius: theme.radii.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.sm,
  },
  selected: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    ...theme.shadows.card,
  },
  label: {
    color: theme.colors.muted,
    fontSize: theme.typography.label,
    fontWeight: '800',
  },
  selectedLabel: {
    color: theme.colors.text,
  },
  pressed: {
    opacity: 0.72,
  },
});
