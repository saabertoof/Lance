import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type SelectableOptionProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
};

export function SelectableOption({ label, onPress, selected }: SelectableOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
      <View style={[styles.indicator, selected && styles.selectedIndicator]}>
        {selected ? <Ionicons color={theme.colors.white} name="checkmark" size={14} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  selected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: 'rgba(139,92,246,0.65)',
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    color: theme.colors.text,
    flex: 1,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
  },
  selectedLabel: {
    color: theme.colors.accentStrong,
  },
  indicator: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  selectedIndicator: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
});
