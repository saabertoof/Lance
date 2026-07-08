import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export function AuthStatusError() {
  const { refreshProfileStatus } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  async function retry() {
    if (isRetrying) return;
    setIsRetrying(true);
    await refreshProfileStatus();
    setIsRetrying(false);
  }

  return (
    <Screen centered contentStyle={styles.screen}>
      <View style={styles.mark} />
      <Text style={styles.title}>We could not check your profile.</Text>
      <Text style={styles.body}>
        Your account is still safe. Check your connection and try again.
      </Text>
      <Button
        label="Try again"
        loading={isRetrying}
        onPress={() => void retry()}
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  mark: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    height: 7,
    transform: [{ skewX: '-14deg' }],
    width: 44,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.heading,
    textAlign: 'center',
  },
  body: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 20,
    maxWidth: 320,
    textAlign: 'center',
  },
  button: {
    marginTop: theme.spacing.sm,
    minWidth: 150,
  },
});
