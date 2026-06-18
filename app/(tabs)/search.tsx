import { StyleSheet, Text } from 'react-native';

import { SearchPlaceholder } from '@/components/profile';
import { Screen } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function SearchScreen() {
  return (
    <Screen scroll>
      <Text style={styles.title}>Search</Text>
      <Text style={styles.subtitle}>Know what you need? Search will be the direct route.</Text>
      <SearchPlaceholder />
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
});
