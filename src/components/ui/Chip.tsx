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
    borderRadius: theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  accent: {
    backgroundColor: theme.colors.accentSoft,
  },
  label: {
    color: theme.colors.textSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  accentLabel: {
    color: theme.colors.accentStrong,
  },
});
