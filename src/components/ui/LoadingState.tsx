import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = 'Loading Lance' }: LoadingStateProps) {
  return (
    <View style={styles.wrapper} accessibilityRole="progressbar">
      <ActivityIndicator color={theme.colors.accent} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  message: {
    color: theme.colors.muted,
    fontFamily: theme.typography.familyMonoMedium,
    fontSize: theme.typography.small,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
