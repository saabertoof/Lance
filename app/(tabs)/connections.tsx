import { StyleSheet, Text } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function ConnectionsScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Connections</Text>
      <EmptyState
        title="No matches yet"
        body="Confirmed matches and saved profiles will appear here when the matching flow is built."
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
