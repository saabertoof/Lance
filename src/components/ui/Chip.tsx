import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type ChipProps = {
  label: string;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ accent, label, style }: ChipProps) {
  return (
    <View style={[styles.chip, accent && styles.accent, style]}>
      <Text style={[styles.label, accent && styles.accentLabel]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.chip,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  accent: {
    backgroundColor: theme.colors.accentSoft,
  },
  label: {
    color: theme.colors.textSoft,
    fontFamily: theme.typography.familyMedium,
    fontSize: 12,
  },
  accentLabel: {
    color: theme.colors.accentStrong,
  },
});
