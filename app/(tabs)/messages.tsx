import { StyleSheet, Text } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function MessagesScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Messages</Text>
      <EmptyState
        title="No conversations"
        body="Direct messages will appear here after confirmed matches are created."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
    marginBottom: theme.spacing.xl,
  },
});
