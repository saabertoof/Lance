import { Ionicons } from '@expo/vector-icons';
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
        <View style={styles.icon}>
          <Ionicons color={theme.colors.accentStrong} name="sparkles-outline" size={24} />
        </View>
        <EmptyState
          title="Discovery comes next"
          body="This will become Lance's one-card-at-a-time experience for exploring real people and opportunities."
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
    alignItems: 'flex-start',
    gap: theme.spacing.xl,
  },
  modeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
});
