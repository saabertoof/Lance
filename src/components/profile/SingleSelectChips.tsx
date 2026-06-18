import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type SingleSelectChipsProps<T extends string> = {
  options: readonly { label: string; value: T }[];
  selected: T;
  onChange: (selected: T) => void;
};

export function SingleSelectChips<T extends string>({
  onChange,
  options,
  selected,
}: SingleSelectChipsProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const isSelected = selected === option.value;

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            key={option.value}
            onPress={() => onChange(option.value)}
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
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
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
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  selectedLabel: {
    color: theme.colors.accentStrong,
  },
});
