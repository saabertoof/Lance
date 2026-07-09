import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
import { theme } from '@/constants/theme';

type SegmentedControlProps<T extends string> = {
  compact?: boolean;
  onChange: (value: T) => void;
  options: readonly {
    icon?: keyof typeof Ionicons.glyphMap;
    label: string;
    value: T;
  }[];
  value: T;
  variant?: 'default' | 'operator';
};

export function SegmentedControl<T extends string>({
  compact,
  onChange,
  options,
  value,
  variant = 'default',
}: SegmentedControlProps<T>) {
  const operator = variant === 'operator';

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.control,
        operator && styles.operatorControl,
        compact && styles.compactControl,
      ]}>
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
              operator && styles.operatorOption,
              compact && styles.compactOption,
              selected && styles.selected,
              operator && selected && styles.operatorSelected,
              pressed && styles.pressed,
            ]}>
            {option.icon ? (
              <Ionicons
                color={
                  operator
                    ? selected
                      ? v.purpleStrong
                      : v.textSoft
                    : selected
                      ? theme.colors.text
                      : theme.colors.muted
                }
                name={option.icon}
                size={compact ? 15 : operator ? 15 : 16}
              />
            ) : null}
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.86}
              numberOfLines={1}
              style={[
                styles.label,
                operator && styles.operatorLabel,
                compact && styles.compactLabel,
                selected && styles.selectedLabel,
                operator && selected && styles.operatorSelectedLabel,
              ]}>
              {option.label}
            </Text>
            {operator && selected ? <View style={styles.operatorLine} /> : null}
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
  operatorControl: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: v.borderStrong,
    borderRadius: 22,
    padding: 3,
  },
  compactControl: {
    borderRadius: 18,
    flex: 1,
    minWidth: 0,
    padding: 2,
  },
  option: {
    alignItems: 'center',
    borderRadius: theme.radii.sm,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.sm,
    position: 'relative',
  },
  operatorOption: {
    borderRadius: 19,
    gap: 3,
    minHeight: 40,
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
  compactOption: {
    borderRadius: 15,
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 6,
  },
  selected: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    ...theme.shadows.card,
  },
  operatorSelected: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    color: theme.colors.muted,
    fontSize: theme.typography.label,
    fontWeight: '600',
  },
  operatorLabel: {
    color: v.textSoft,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  compactLabel: {
    fontSize: 10,
    letterSpacing: 0.7,
  },
  selectedLabel: {
    color: theme.colors.text,
  },
  operatorSelectedLabel: {
    color: v.purpleStrong,
  },
  operatorLine: {
    backgroundColor: v.purple,
    borderRadius: 2,
    bottom: 0,
    height: 2,
    left: 16,
    position: 'absolute',
    right: 16,
  },
  pressed: {
    opacity: 0.72,
  },
});
