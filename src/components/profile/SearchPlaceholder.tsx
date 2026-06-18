import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip } from '@/components/ui';
import { theme } from '@/constants/theme';

export function SearchPlaceholder() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.searchBar}>
        <Ionicons color={theme.colors.muted} name="search" size={20} />
        <Text style={styles.searchText}>Search Lance</Text>
      </View>
      <View style={styles.modes}>
        <Chip accent label="People" />
        <Chip label="Opportunities" />
        <Chip label="Businesses" />
      </View>
      <Card style={styles.card}>
        <View style={styles.icon}>
          <Ionicons color={theme.colors.accentStrong} name="options-outline" size={24} />
        </View>
        <Text style={styles.title}>Search is taking shape</Text>
        <Text style={styles.body}>
          Soon you will be able to search real people, opportunities, and businesses using
          structured details such as skills, role, location, and availability.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.lg,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: theme.spacing.lg,
  },
  searchText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
  },
  modes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  card: {
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  body: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
});
