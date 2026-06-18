import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function CreateScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Create</Text>
      <Text style={styles.subtitle}>Share an opportunity when the right structure is ready.</Text>
      <Card style={styles.card}>
        <View style={styles.icon}>
          <Ionicons color={theme.colors.accentStrong} name="add-outline" size={26} />
        </View>
        <EmptyState
          title="Creation is coming later"
          body="A future phase will let personal accounts and businesses publish structured opportunities."
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.sm,
  },
  card: {
    alignItems: 'flex-start',
    gap: theme.spacing.lg,
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
