import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui';
import { theme } from '@/constants/theme';
import { getOptionLabel } from '@/types/profile';
import { businessTypeOptions, BusinessRecord } from '@/types/business';

type BusinessCardProps = {
  business: BusinessRecord;
  onPress: () => void;
  showDrafts?: boolean;
};

export function BusinessCard({ business, onPress, showDrafts = true }: BusinessCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.logo}>
          {business.logoUrl ? (
            <Image contentFit="cover" source={business.logoUrl} style={styles.image} />
          ) : (
            <Text style={styles.mark}>{business.name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {business.name}
          </Text>
          <Text style={styles.type}>
            {getOptionLabel(businessTypeOptions, business.businessType)}
          </Text>
        </View>
        <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
      </View>
      <Text numberOfLines={2} style={styles.description}>
        {business.shortDescription}
      </Text>
      <View style={styles.meta}>
        <Chip
          accent={business.activeOpportunityCount > 0}
          label={`${business.activeOpportunityCount} active`}
        />
        {showDrafts ? <Chip label={`${business.draftOpportunityCount} drafts`} /> : null}
        {business.status === 'archived' ? <Chip label="Archived" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 52,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  mark: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  copy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  type: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  description: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
});
