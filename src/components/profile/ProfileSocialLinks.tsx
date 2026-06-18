import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { ProfileLink, ProfileLinkType } from '@/types/profile';

export function ProfileSocialLinks({
  links,
  onError,
}: {
  links: ProfileLink[];
  onError: (message: string) => void;
}) {
  async function open(link: ProfileLink) {
    const target = link.linkType === 'email' ? `mailto:${link.value}` : link.value;

    try {
      const isSafeTarget = target.startsWith('https://') || target.startsWith('mailto:');
      if (!isSafeTarget || !(await Linking.canOpenURL(target))) {
        throw new Error('Unsupported link');
      }
      await Linking.openURL(target);
    } catch {
      onError(`${link.label} could not be opened on this device.`);
    }
  }

  return (
    <View style={styles.links}>
      {links.map((link) => (
        <Pressable
          accessibilityLabel={link.label}
          accessibilityRole="link"
          key={`${link.linkType}:${link.value}`}
          onPress={() => void open(link)}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          <Ionicons
            color={theme.colors.accentStrong}
            name={profileLinkIcons[link.linkType]}
            size={23}
          />
        </Pressable>
      ))}
    </View>
  );
}

const profileLinkIcons: Record<
  ProfileLinkType,
  ComponentProps<typeof Ionicons>['name']
> = {
  portfolio: 'briefcase-outline',
  website: 'globe-outline',
  instagram: 'logo-instagram',
  tiktok: 'logo-tiktok',
  x: 'logo-x',
  linkedin: 'logo-linkedin',
  github: 'logo-github',
  discord: 'logo-discord',
  calendly: 'calendar-outline',
  email: 'mail-outline',
};

const styles = StyleSheet.create({
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  link: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderColor: '#DDD4FF',
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  pressed: {
    opacity: 0.65,
  },
});
