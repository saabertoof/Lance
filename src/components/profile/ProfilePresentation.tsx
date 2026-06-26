import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui';
import { theme } from '@/constants/theme';
import {
  availabilityOptions,
  experienceOptions,
  getOptionLabel,
  opportunityInterestOptions,
  remotePreferenceOptions,
  type PublicProfile,
} from '@/types/profile';
import {
  currentIntentOptions,
  profilePromptOptions,
} from '@/types/profilePolish';

import { PortfolioCarousel } from './PortfolioCarousel';
import {
  ProfileSocialLinks,
  recognizedSocialPlatform,
} from './ProfileSocialLinks';

export function ProfileHero({
  accent,
  onEditBanner,
  profile,
  topBar,
}: {
  accent: string;
  onEditBanner?: () => void;
  profile: PublicProfile;
  topBar: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.banner, { height: 176 + insets.top }]}>
      {profile.polish.bannerUrl ? (
        <Image
          accessibilityLabel={`${profile.displayName} profile banner`}
          contentFit="cover"
          source={profile.polish.bannerUrl}
          style={styles.fill}
          transition={180}
        />
      ) : (
        <View style={[styles.defaultBanner, { backgroundColor: `${accent}18` }]}>
          <View style={[styles.bannerPanel, { backgroundColor: `${accent}28` }]} />
          <View style={[styles.bannerLine, { backgroundColor: accent }]} />
        </View>
      )}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>{topBar}</View>
      {onEditBanner ? (
        <Pressable
          accessibilityLabel="Edit profile banner"
          accessibilityRole="button"
          onPress={onEditBanner}
          style={({ pressed }) => [
            styles.mediaEdit,
            pressed && styles.pressed,
          ]}>
          <Ionicons color={theme.colors.text} name="camera-outline" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ProfileIdentityBlock({
  action,
  accent,
  onEditAvatar,
  onError,
  profile,
}: {
  action?: ReactNode;
  accent: string;
  onEditAvatar?: () => void;
  onError: (message: string) => void;
  profile: PublicProfile;
}) {
  const centered = profile.polish.theme.headerAlignment === 'center';
  const initials = initialsFor(profile.displayName);
  const hasSocial =
    profile.links.length > 0 ||
    profile.polish.customLinks.some((link) =>
      recognizedSocialPlatform(link.url),
    );
  const avatar = (
    <View style={[styles.avatar, { borderColor: theme.colors.surface }]}>
      {profile.avatarUrl ? (
        <Image
          accessibilityLabel={`${profile.displayName} profile photo`}
          contentFit="cover"
          source={profile.avatarUrl}
          style={styles.fill}
          transition={160}
        />
      ) : (
        <Text style={[styles.initials, { color: accent }]}>{initials}</Text>
      )}
      {onEditAvatar ? (
        <View style={styles.avatarEdit}>
          <Ionicons color={theme.colors.white} name="camera" size={14} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.identity, centered && styles.centered]}>
      {onEditAvatar ? (
        <Pressable
          accessibilityLabel="Edit profile photo"
          accessibilityRole="button"
          onPress={onEditAvatar}
          style={({ pressed }) => pressed && styles.pressed}>
          {avatar}
        </Pressable>
      ) : (
        avatar
      )}
      <Text
        numberOfLines={1}
        style={[
          styles.name,
          profile.polish.theme.template === 'bold' && styles.boldName,
          centered && styles.centerText,
        ]}>
        {profile.displayName}
      </Text>
      <Text numberOfLines={1} style={styles.username}>
        @{profile.username}
      </Text>
      <Text
        numberOfLines={2}
        style={[styles.headline, centered && styles.centerText]}>
        {profile.headline}
      </Text>
      <View style={[styles.meta, centered && styles.centerWrap]}>
        {[profile.primaryRole, profile.polish.location?.label ?? profile.city]
          .filter(Boolean)
          .map((value) => (
            <Text key={value} numberOfLines={1} style={styles.metaText}>
              {value}
            </Text>
          ))}
      </View>
      <View style={[styles.meta, centered && styles.centerWrap]}>
        <Text style={styles.metaText}>
          {getOptionLabel(availabilityOptions, profile.availability)}
        </Text>
        <Text style={styles.metaDot}>|</Text>
        <Text style={styles.metaText}>
          {getOptionLabel(remotePreferenceOptions, profile.remotePreference)}
        </Text>
      </View>
      {profile.polish.currentIntents.length > 0 ? (
        <View style={[styles.chips, centered && styles.centerWrap]}>
          {profile.polish.currentIntents.slice(0, 3).map((intent) => (
            <View
              key={intent}
              style={[styles.intent, { borderColor: `${accent}55` }]}>
              <Text style={[styles.intentText, { color: accent }]}>
                {currentIntentOptions.find((option) => option.value === intent)
                  ?.label ?? intent}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {hasSocial ? (
        <ProfileSocialLinks
          customLinks={profile.polish.customLinks}
          links={profile.links}
          onError={onError}
        />
      ) : null}
      {action}
    </View>
  );
}

export function ProfileFeaturedSection({
  accent,
  onEdit,
  onError,
  profile,
  radius,
}: {
  accent: string;
  onEdit?: () => void;
  onError: (message: string) => void;
  profile: PublicProfile;
  radius: number;
}) {
  if (profile.polish.portfolio.length === 0 && !onEdit) return null;

  return (
    <ProfileSection
      action={
        onEdit ? (
          <SectionEditButton label="Edit featured work" onPress={onEdit} />
        ) : undefined
      }
      title="Featured">
      {profile.polish.portfolio.length > 0 ? (
        <PortfolioCarousel
          accent={accent}
          items={profile.polish.portfolio}
          onError={onError}
          radius={radius}
        />
      ) : onEdit ? (
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [
            styles.ownerEmpty,
            { borderRadius: radius },
            pressed && styles.pressed,
          ]}>
          <Ionicons color={accent} name="images-outline" size={26} />
          <View style={styles.emptyCopy}>
            <Text style={styles.ownerEmptyTitle}>
              Show people what you have built.
            </Text>
            <Text style={styles.ownerEmptyBody}>Add featured work</Text>
          </View>
          <Ionicons color={accent} name="add-circle-outline" size={24} />
        </Pressable>
      ) : null}
    </ProfileSection>
  );
}

export function ProfilePromptSection({
  accent,
  onEdit,
  profile,
  radius,
}: {
  accent: string;
  onEdit?: () => void;
  profile: PublicProfile;
  radius: number;
}) {
  const prompts = profile.polish.prompts
    .filter((prompt) => prompt.answer.trim())
    .slice(0, 3);
  if (prompts.length === 0) return null;

  return (
    <ProfileSection
      action={
        onEdit ? <SectionEditButton label="Edit prompts" onPress={onEdit} /> : undefined
      }
      title="Right now">
      <View style={styles.promptGrid}>
        {prompts.map((prompt) => (
          <View key={prompt.id} style={[styles.prompt, { borderRadius: radius }]}>
            <Text style={[styles.promptLabel, { color: accent }]}>
              {profilePromptOptions.find(
                (option) => option.value === prompt.promptKey,
              )?.label ?? prompt.promptKey}
            </Text>
            <Text style={styles.promptAnswer}>{prompt.answer}</Text>
          </View>
        ))}
      </View>
    </ProfileSection>
  );
}

export function ProfileProfessionalSections({
  accent,
  onEdit,
  onError,
  profile,
  radius,
}: {
  accent: string;
  onEdit?: () => void;
  onError: (message: string) => void;
  profile: PublicProfile;
  radius: number;
}) {
  const customLinks = profile.polish.customLinks.filter(
    (link) => !recognizedSocialPlatform(link.url),
  );

  return (
    <>
      {profile.opportunityInterests.length > 0 ? (
        <ProfileSection title="Open to">
          <View style={styles.chips}>
            {profile.opportunityInterests.slice(0, 8).map((interest) => (
              <Chip
                accent
                key={interest}
                label={getOptionLabel(opportunityInterestOptions, interest)}
              />
            ))}
          </View>
        </ProfileSection>
      ) : null}

      {profile.skills.length > 0 ? (
        <ProfileSection
          action={
            onEdit ? <SectionEditButton label="Edit skills" onPress={onEdit} /> : undefined
          }
          title="Skills">
          <View style={styles.chips}>
            {profile.skills.slice(0, 10).map((skill) => (
              <Chip key={skill.toLowerCase()} label={skill} />
            ))}
          </View>
        </ProfileSection>
      ) : null}

      {profile.bio ? (
        <ProfileSection
          action={
            onEdit ? <SectionEditButton label="Edit about" onPress={onEdit} /> : undefined
          }
          title="About">
          <Text style={styles.bodyText}>{profile.bio}</Text>
        </ProfileSection>
      ) : null}

      {customLinks.length > 0 ? (
        <ProfileSection
          action={
            onEdit ? <SectionEditButton label="Edit links" onPress={onEdit} /> : undefined
          }
          title="Links">
          <View style={styles.linkList}>
            {customLinks.map((link) => (
              <Pressable
                accessibilityLabel={`Open ${link.label}`}
                accessibilityRole="link"
                key={link.id}
                onPress={() => void openCustomLink(link.url, onError)}
                style={({ pressed }) => [
                  styles.customLink,
                  { borderRadius: radius },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.linkIcon, { backgroundColor: `${accent}14` }]}>
                  <Ionicons color={accent} name="link-outline" size={20} />
                </View>
                <View style={styles.linkCopy}>
                  <Text numberOfLines={1} style={styles.linkLabel}>
                    {link.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.linkHost}>
                    {safeHost(link.url)}
                  </Text>
                </View>
                <Ionicons color={theme.colors.muted} name="open-outline" size={18} />
              </Pressable>
            ))}
          </View>
        </ProfileSection>
      ) : null}

      <ProfileSection title="Background">
        <View style={styles.experienceLine}>
          <Ionicons
            color={accent}
            name="ribbon-outline"
            size={19}
          />
          <Text style={styles.experienceText}>
            {getOptionLabel(experienceOptions, profile.experienceLevel)}
          </Text>
        </View>
        {profile.industryExperience.length > 0 ? (
          <View style={styles.chips}>
            {profile.industryExperience.slice(0, 8).map((industry) => (
              <Chip key={industry.toLowerCase()} label={industry} />
            ))}
          </View>
        ) : null}
      </ProfileSection>
    </>
  );
}

export function ProfileSection({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function SectionEditButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.sectionEdit, pressed && styles.pressed]}>
      <Ionicons color={theme.colors.accentStrong} name="create-outline" size={18} />
    </Pressable>
  );
}

async function openCustomLink(
  url: string,
  onError: (message: string) => void,
) {
  try {
    if (!url.startsWith('https://') || !(await Linking.canOpenURL(url))) {
      throw new Error('Unsupported URL');
    }
    await Linking.openURL(url);
  } catch {
    onError('This link could not be opened safely.');
  }
}

function safeHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function initialsFor(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'L'
  );
}

export function profileShapeRadius(
  shape: PublicProfile['polish']['theme']['cardShape'],
) {
  if (shape === 'pill') return 28;
  if (shape === 'squared') return 8;
  return 18;
}

export function profileBackground(
  background: PublicProfile['polish']['theme']['background'],
) {
  if (background === 'soft_gradient') return '#FAF8FF';
  if (background === 'banner_led') return '#FCFCFE';
  return theme.colors.background;
}

export const profileAccentColors = {
  purple: '#6843F4',
  blue: '#1769E0',
  green: '#147A4B',
  rose: '#B52B62',
  charcoal: '#252730',
};

const styles = StyleSheet.create({
  banner: {
    height: 176,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    width: '100%',
  },
  defaultBanner: {
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bannerPanel: {
    height: 230,
    position: 'absolute',
    right: -38,
    top: -96,
    transform: [{ rotate: '22deg' }],
    width: 120,
  },
  bannerLine: {
    height: 5,
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 18,
    position: 'absolute',
    right: 18,
  },
  mediaEdit: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 18,
    bottom: 14,
    height: theme.layout.minTouchTarget,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    width: theme.layout.minTouchTarget,
  },
  identity: {
    alignItems: 'flex-start',
    gap: theme.density.controlGap,
  },
  centered: {
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 50,
    borderWidth: 4,
    height: 100,
    justifyContent: 'center',
    marginTop: -52,
    overflow: 'hidden',
    width: 100,
  },
  avatarEdit: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,10,18,0.78)',
    borderRadius: 14,
    bottom: 5,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 5,
    width: 28,
  },
  initials: {
    fontSize: theme.typography.title,
    fontWeight: '900',
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.screenHeading,
    fontWeight: '900',
    maxWidth: '100%',
  },
  boldName: {
    fontSize: 28,
  },
  centerText: {
    textAlign: 'center',
  },
  username: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  headline: {
    color: theme.colors.textSoft,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    maxWidth: 430,
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metaText: {
    color: theme.colors.muted,
    flexShrink: 1,
    fontSize: theme.typography.small,
  },
  metaDot: {
    color: theme.colors.mutedLight,
    fontSize: theme.typography.tiny,
  },
  centerWrap: {
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  intent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
  },
  intentText: {
    fontSize: theme.typography.tiny,
    fontWeight: '800',
  },
  section: {
    gap: theme.density.contentGap,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  sectionEdit: {
    alignItems: 'center',
    height: theme.layout.minTouchTarget,
    justifyContent: 'center',
    width: theme.layout.minTouchTarget,
  },
  ownerEmpty: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  emptyCopy: {
    flex: 1,
    gap: 3,
  },
  ownerEmptyTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  ownerEmptyBody: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  promptGrid: {
    gap: theme.spacing.md,
  },
  prompt: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  promptLabel: {
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  promptAnswer: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    lineHeight: 21,
  },
  bodyText: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    lineHeight: 21,
  },
  experienceLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  experienceText: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  linkList: {
    gap: theme.spacing.sm,
  },
  customLink: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 68,
    paddingHorizontal: theme.spacing.md,
  },
  linkIcon: {
    alignItems: 'center',
    borderRadius: theme.radii.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  linkCopy: {
    flex: 1,
    minWidth: 0,
  },
  linkLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  linkHost: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.72,
  },
});
