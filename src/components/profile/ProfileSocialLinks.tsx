import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { ProfileLink, ProfileLinkType } from '@/types/profile';
import type { CustomProfileLink } from '@/types/profilePolish';

import { profileVisual } from './profileVisual';

export function ProfileSocialLinks({
  links,
  customLinks = [],
  onError,
}: {
  links: ProfileLink[];
  customLinks?: CustomProfileLink[];
  onError: (message: string) => void;
}) {
  const recognizedCustom = customLinks
    .map((link) => ({ ...link, platform: recognizedSocialPlatform(link.url) }))
    .filter((link) => link.platform);

  async function open(target: string, label: string) {

    try {
      const isSafeTarget = target.startsWith('https://') || target.startsWith('mailto:');
      if (!isSafeTarget || !(await Linking.canOpenURL(target))) {
        throw new Error('Unsupported link');
      }
      await Linking.openURL(target);
    } catch {
      onError(`${label} could not be opened on this device.`);
    }
  }

  return (
    <View style={styles.links}>
      {links.map((link) => (
        <Pressable
          accessibilityLabel={link.label}
          accessibilityRole="link"
          key={`${link.linkType}:${link.value}`}
          onPress={() =>
            void open(link.linkType === 'email' ? `mailto:${link.value}` : link.value, link.label)
          }
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          <Ionicons
            color={profileVisual.purple}
            name={profileLinkIcons[link.linkType]}
            size={20}
          />
        </Pressable>
      ))}
      {recognizedCustom.map((link) => (
        <Pressable
          accessibilityLabel={link.label}
          accessibilityRole="link"
          key={link.id}
          onPress={() => void open(link.url, link.label)}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          <Ionicons
            color={profileVisual.purple}
            name={link.platform === 'youtube' ? 'logo-youtube' : 'globe-outline'}
            size={20}
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

export function recognizedSocialPlatform(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtube.com' || host === 'youtu.be') return 'youtube';
    return null;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  link: {
    alignItems: 'center',
    backgroundColor: profileVisual.purpleSoft,
    borderColor: profileVisual.borderStrong,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  pressed: {
    opacity: 0.65,
  },
});
