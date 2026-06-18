import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, EmptyState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function DiscoverScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Image
          accessibilityLabel="Lance"
          contentFit="contain"
          source={require('../../assets/images/lance_wordmark_transparent.png')}
          style={styles.wordmark}
        />
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
  wordmark: {
    height: 34,
    width: 132,
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
