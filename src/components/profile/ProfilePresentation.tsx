import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
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

type IconName = ComponentProps<typeof Ionicons>['name'];

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
    <View style={[styles.banner, { height: 168 + insets.top }]}>
      {profile.polish.bannerUrl ? (
        <Image
          accessibilityLabel={`${profile.displayName} profile banner`}
          contentFit="cover"
          source={profile.polish.bannerUrl}
          style={styles.fill}
          transition={180}
        />
      ) : (
        <View style={[styles.defaultBanner, { backgroundColor: `${accent}12` }]}>
          <View style={[styles.bannerPanel, { backgroundColor: `${accent}28` }]} />
          <View style={[styles.bannerOrb, { backgroundColor: `${accent}1C` }]} />
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
  const location = profile.polish.location?.label ?? profile.city;
  const metaItems = [profile.primaryRole, location].filter(Boolean);
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
    <View style={[styles.identityCard, centered && styles.centeredCard]}>
      <View style={[styles.avatarHeader, centered && styles.avatarHeaderCentered]}>
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
        <View style={[styles.profileSignal, { borderColor: `${accent}3D` }]}>
          <View style={[styles.signalDot, { backgroundColor: accent }]} />
          <Text numberOfLines={1} style={styles.profileSignalText}>
            {getOptionLabel(availabilityOptions, profile.availability)}
          </Text>
        </View>
      </View>

      <View style={[styles.identityCopy, centered && styles.centered]}>
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
        {metaItems.length > 0 ? (
          <Text numberOfLines={2} style={[styles.metaLine, centered && styles.centerText]}>
            {metaItems.join('  |  ')}
          </Text>
        ) : null}
        <View style={[styles.factRow, centered && styles.centerWrap]}>
          <ProfileFact
            icon="navigate-outline"
            label={getOptionLabel(remotePreferenceOptions, profile.remotePreference)}
          />
          <ProfileFact
            icon="ribbon-outline"
            label={getOptionLabel(experienceOptions, profile.experienceLevel)}
          />
        </View>
        {profile.polish.currentIntents.length > 0 ? (
          <View style={[styles.intentRail, centered && styles.centerWrap]}>
            {profile.polish.currentIntents.slice(0, 3).map((intent) => (
              <View
                key={intent}
                style={[styles.intent, { backgroundColor: `${accent}10` }]}>
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
        {action ? <View style={styles.identityActions}>{action}</View> : null}
      </View>
    </View>
  );
}

function ProfileFact({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons color={theme.colors.muted} name={icon} size={14} />
      <Text numberOfLines={1} style={styles.factText}>
        {label}
      </Text>
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
      title="Featured work">
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
          <Ionicons color={accent} name="images-outline" size={22} />
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
}: {
  accent: string;
  onEdit?: () => void;
  profile: PublicProfile;
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
      title="Current focus">
      <View style={styles.promptList}>
        {prompts.map((prompt) => (
          <View key={prompt.id} style={styles.prompt}>
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
}: {
  accent: string;
  onEdit?: () => void;
  onError: (message: string) => void;
  profile: PublicProfile;
}) {
  const customLinks = profile.polish.customLinks.filter(
    (link) => !recognizedSocialPlatform(link.url),
  );

  return (
    <>
      {profile.bio ? (
        <ProfileSection
          action={
            onEdit ? <SectionEditButton label="Edit about" onPress={onEdit} /> : undefined
          }
          title="About">
          <Text style={styles.bodyText}>{profile.bio}</Text>
        </ProfileSection>
      ) : null}

      {profile.skills.length > 0 ? (
        <ProfileSection
          action={
            onEdit ? <SectionEditButton label="Edit skills" onPress={onEdit} /> : undefined
          }
          title="Skills">
          <View style={styles.chips}>
            {profile.skills.slice(0, 14).map((skill) => (
              <Chip key={skill.toLowerCase()} label={skill} />
            ))}
          </View>
        </ProfileSection>
      ) : null}

      {profile.opportunityInterests.length > 0 ? (
        <ProfileSection title="Open to">
          <View style={styles.chips}>
            {profile.opportunityInterests.slice(0, 10).map((interest) => (
              <Chip
                accent
                key={interest}
                label={getOptionLabel(opportunityInterestOptions, interest)}
              />
            ))}
          </View>
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
                style={({ pressed }) => [styles.customLink, pressed && styles.pressed]}>
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
        <View style={styles.detailList}>
          <ProfileDetail
            accent={accent}
            icon="ribbon-outline"
            label="Experience"
            value={getOptionLabel(experienceOptions, profile.experienceLevel)}
          />
          <ProfileDetail
            accent={accent}
            icon="time-outline"
            label="Availability"
            value={getOptionLabel(availabilityOptions, profile.availability)}
          />
          <ProfileDetail
            accent={accent}
            icon="navigate-outline"
            label="Work style"
            value={getOptionLabel(remotePreferenceOptions, profile.remotePreference)}
          />
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

function ProfileDetail({
  accent,
  icon,
  label,
  value,
}: {
  accent: string;
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: `${accent}12` }]}>
        <Ionicons color={accent} name={icon} size={17} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
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
    height: 168,
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
    height: 220,
    position: 'absolute',
    right: -28,
    top: -92,
    transform: [{ rotate: '22deg' }],
    width: 116,
  },
  bannerOrb: {
    borderRadius: 120,
    height: 240,
    left: -96,
    position: 'absolute',
    top: -112,
    width: 240,
  },
  bannerLine: {
    height: 4,
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
    bottom: 12,
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    width: 42,
  },
  identityCard: {
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(8,10,18,0.08)',
    borderRadius: 22,
    borderWidth: 1,
    gap: theme.spacing.md,
    marginTop: -46,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 0,
    ...theme.shadows.card,
  },
  centeredCard: {
    alignItems: 'center',
  },
  centered: {
    alignItems: 'center',
  },
  avatarHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
  },
  avatarHeaderCentered: {
    alignItems: 'center',
    flexDirection: 'column',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 48,
    borderWidth: 5,
    height: 96,
    justifyContent: 'center',
    marginTop: -50,
    overflow: 'hidden',
    width: 96,
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
    fontSize: 27,
    fontWeight: '900',
  },
  profileSignal: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: theme.spacing.md,
  },
  profileSignalText: {
    color: theme.colors.text,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  signalDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  identityCopy: {
    gap: 7,
  },
  name: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
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
    fontSize: theme.typography.caption,
    fontWeight: '700',
  },
  headline: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    fontWeight: '600',
    lineHeight: 20,
    maxWidth: 430,
  },
  metaLine: {
    color: theme.colors.muted,
    flexShrink: 1,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    lineHeight: 17,
  },
  centerWrap: {
    justifyContent: 'center',
  },
  factRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: 2,
  },
  fact: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    gap: 5,
    minHeight: 31,
    paddingHorizontal: theme.spacing.md,
  },
  factText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  intentRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  intent: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  intentText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  identityActions: {
    marginTop: theme.spacing.xs,
    width: '100%',
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(8,10,18,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  sectionEdit: {
    alignItems: 'center',
    borderRadius: theme.radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  ownerEmpty: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  emptyCopy: {
    flex: 1,
    gap: 3,
  },
  ownerEmptyTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  ownerEmptyBody: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  promptList: {
    gap: theme.spacing.sm,
  },
  prompt: {
    borderLeftColor: theme.colors.border,
    borderLeftWidth: 2,
    gap: 5,
    paddingLeft: theme.spacing.md,
    paddingVertical: 3,
  },
  promptLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '900',
  },
  promptAnswer: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  bodyText: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    lineHeight: 21,
  },
  linkList: {
    gap: 0,
  },
  customLink: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 58,
    paddingVertical: theme.spacing.sm,
  },
  linkIcon: {
    alignItems: 'center',
    borderRadius: theme.radii.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  linkCopy: {
    flex: 1,
    minWidth: 0,
  },
  linkLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  linkHost: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    marginTop: 2,
  },
  detailList: {
    gap: theme.spacing.sm,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 40,
  },
  detailIcon: {
    alignItems: 'center',
    borderRadius: theme.radii.md,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  detailCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  detailLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
