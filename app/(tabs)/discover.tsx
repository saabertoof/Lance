import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, EmptyState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function DiscoverScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Lance</Text>
        <Text style={styles.title}>Discover</Text>
      </View>

      <Card style={styles.modeCard}>
        <View style={styles.modeRow}>
          <Chip accent label="People" />
          <Chip label="Opportunities" />
        </View>
        <EmptyState
          title="No cards yet"
          body="Your discovery feed will come online after onboarding, profiles, and opportunities are added."
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.display,
    fontWeight: '900',
  },
  modeCard: {
    gap: theme.spacing.xl,
  },
  modeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
});
