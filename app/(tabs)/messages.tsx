import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, EmptyState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function MessagesScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>Chats, requests, and matches will eventually live together here.</Text>
      <View style={styles.modes}>
        <Chip accent label="Chats" />
        <Chip label="Requests" />
        <Chip label="Matches" />
      </View>
      <Card style={styles.card}>
        <View style={styles.icon}>
          <Ionicons color={theme.colors.accentStrong} name="chatbubbles-outline" size={24} />
        </View>
        <EmptyState
          title="No conversations yet"
          body="Messaging and message requests are planned for a later phase and are not active now."
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
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  modes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
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
