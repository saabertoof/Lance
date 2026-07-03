import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { BusinessRecord } from '@/types/business';
import type { OpportunityDraft } from '@/types/opportunity';

type PostingIdentitySelectorProps = {
  businesses: BusinessRecord[];
  displayName: string;
  profileImageUrl: string | null;
  selectedBusinessId: string | null;
  selectedIdentity: OpportunityDraft['postingIdentity'];
  onSelectPersonal: () => void;
  onSelectBusiness: (businessId: string) => void;
  onCreateBusiness: () => void;
};

export function PostingIdentitySelector({
  businesses,
  displayName,
  onCreateBusiness,
  onSelectBusiness,
  onSelectPersonal,
  profileImageUrl,
  selectedBusinessId,
  selectedIdentity,
}: PostingIdentitySelectorProps) {
  return (
    <View style={styles.list}>
      <IdentityOption
        imageUrl={profileImageUrl}
        label={displayName}
        meta="My personal profile"
        onPress={onSelectPersonal}
        selected={selectedIdentity === 'personal'}
      />
      {businesses.map((business) => (
        <IdentityOption
          imageUrl={business.logoUrl}
          key={business.id}
          label={business.name}
          meta="Business or project"
          onPress={() => onSelectBusiness(business.id)}
          selected={
            selectedIdentity === 'business' && selectedBusinessId === business.id
          }
        />
      ))}
      {businesses.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onCreateBusiness}
          style={({ pressed }) => [styles.create, pressed && styles.pressed]}>
          <Text style={styles.createLabel}>Create a business or project</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function IdentityOption({
  imageUrl,
  label,
  meta,
  onPress,
  selected,
}: {
  imageUrl: string | null;
  label: string;
  meta: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}>
      <View style={styles.logo}>
        {imageUrl ? (
          <Image contentFit="cover" source={imageUrl} style={styles.image} />
        ) : (
          <Text style={styles.mark}>{label.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  option: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 68,
    padding: theme.spacing.md,
  },
  selected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: theme.colors.chip,
    borderRadius: theme.radii.md,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  mark: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.body,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
  },
  radio: {
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 2,
    height: 22,
    width: 22,
  },
  radioSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    borderWidth: 6,
  },
  create: {
    alignItems: 'center',
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  createLabel: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontFamily: theme.typography.familySemiBold,
  },
  pressed: {
    opacity: 0.7,
  },
});
