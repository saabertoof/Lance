import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type StepProgressProps = {
  current: number;
  total: number;
};

export function StepProgress({ current, total }: StepProgressProps) {
  const progress = Math.min(Math.max(current / total, 0), 1);

  return (
    <View accessibilityLabel={`Step ${current} of ${total}`} style={styles.wrapper}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.label}>
        {current} of {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  track: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    flex: 1,
    height: 5,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    height: '100%',
  },
  label: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    fontWeight: '700',
    minWidth: 32,
  },
});
