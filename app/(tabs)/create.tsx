import { StyleSheet, Text } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function CreateScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Create</Text>
      <EmptyState
        title="Nothing to publish yet"
        body="Opportunity creation starts in a later phase after profiles and business pages are ready."
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
