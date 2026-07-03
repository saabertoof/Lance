import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type MultiSelectChipsProps<T extends string> = {
  options: readonly { label: string; value: T }[];
  selected: T[];
  onChange: (selected: T[]) => void;
};

export function MultiSelectChips<T extends string>({
  onChange,
  options,
  selected,
}: MultiSelectChipsProps<T>) {
  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((selectedValue) => selectedValue !== value)
        : [...selected, value],
    );
  }

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);

        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            key={option.value}
            onPress={() => toggle(option.value)}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.selectedChip,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    minHeight: theme.layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
  },
  selectedChip: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.label,
    fontFamily: theme.typography.familySemiBold,
  },
  selectedLabel: {
    color: theme.colors.accentStrong,
  },
});
