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
import { profileFonts, profileVisual } from './profileVisual';

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
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
      <View style={styles.bannerFrame}>
        {profile.polish.bannerUrl ? (
          <Image
            accessibilityLabel={`${profile.displayName} profile banner`}
            contentFit="cover"
            source={profile.polish.bannerUrl}
            style={styles.fill}
            transition={180}
          />
        ) : (
          <View style={styles.defaultBanner}>
            <View style={[styles.bannerPanel, { backgroundColor: `${accent}20` }]} />
            <View style={[styles.bannerPanelAlt, { backgroundColor: `${accent}10` }]} />
            <View style={styles.bannerNoise} />
          </View>
        )}
        <View style={styles.bannerShade} />
        <View style={styles.topBar}>{topBar}</View>
        {onEditBanner ? (
          <Pressable
            accessibilityLabel="Edit profile banner"
            accessibilityRole="button"
            onPress={onEditBanner}
            style={({ pressed }) => [
              styles.mediaEdit,
              pressed && styles.pressed,
            ]}>
            <Ionicons color={profileVisual.text} name="camera-outline" size={16} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ProfileIdentityBlock({
  action,
  accent,
  onEditAvatar,
  onError,
  profile,
  showInlineSignals = true,
}: {
  action?: ReactNode;
  accent: string;
  onEditAvatar?: () => void;
  onError: (message: string) => void;
  profile: PublicProfile;
  showInlineSignals?: boolean;
}) {
  const centered = profile.polish.theme.headerAlignment === 'center';
  const initials = initialsFor(profile.displayName);
  const location = profile.polish.location?.label ?? profile.city;
  const hasSocial =
    profile.links.length > 0 ||
    profile.polish.customLinks.some((link) =>
      recognizedSocialPlatform(link.url),
    );
  const avatar = (
    <View style={[styles.avatar, { borderColor: profileVisual.black }]}>
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
          <Ionicons color={profileVisual.white} name="camera" size={14} />
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
        {location || profile.primaryRole ? (
          <View style={[styles.metaRow, centered && styles.centerWrap]}>
            {location ? (
              <View style={styles.metaItem}>
                <Ionicons color={profileVisual.muted} name="location-outline" size={14} />
                <Text numberOfLines={1} style={styles.metaText}>
                  {location}
                </Text>
              </View>
            ) : null}
            {location && profile.primaryRole ? <View style={styles.metaDot} /> : null}
            {profile.primaryRole ? (
              <Text numberOfLines={1} style={styles.metaRole}>
                {profile.primaryRole}
              </Text>
            ) : null}
          </View>
        ) : null}
        {showInlineSignals ? (
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
        ) : null}
        {showInlineSignals && profile.polish.currentIntents.length > 0 ? (
          <View style={[styles.intentRail, centered && styles.centerWrap]}>
            {profile.polish.currentIntents.slice(0, 3).map((intent) => (
              <View
                key={intent}
                style={[styles.intent, { borderColor: `${accent}38` }]}>
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
      <Ionicons color={profileVisual.muted} name={icon} size={14} />
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
            <Ionicons color={accent} name="add-circle-outline" size={22} />
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
              <ProfilePill key={skill.toLowerCase()} label={skill} />
            ))}
          </View>
        </ProfileSection>
      ) : null}

      {profile.opportunityInterests.length > 0 ? (
        <ProfileSection title="Open to">
          <View style={styles.chips}>
            {profile.opportunityInterests.slice(0, 10).map((interest) => (
              <ProfilePill
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
                <View style={[styles.linkIcon, { borderColor: `${accent}30` }]}>
                  <Ionicons color={accent} name="link-outline" size={18} />
                </View>
                <View style={styles.linkCopy}>
                  <Text numberOfLines={1} style={styles.linkLabel}>
                    {link.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.linkHost}>
                    {safeHost(link.url)}
                  </Text>
                </View>
                <Ionicons color={profileVisual.muted} name="open-outline" size={17} />
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
              <ProfilePill key={industry.toLowerCase()} label={industry} />
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
        <Ionicons color={accent} name={icon} size={16} />
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
      <Ionicons color={profileVisual.purple} name="create-outline" size={17} />
    </Pressable>
  );
}

function ProfilePill({
  accent,
  label,
}: {
  accent?: boolean;
  label: string;
}) {
  return (
    <View style={[styles.pill, accent && styles.pillAccent]}>
      <Text style={[styles.pillText, accent && styles.pillAccentText]}>
        {label}
      </Text>
    </View>
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
  _background: PublicProfile['polish']['theme']['background'],
) {
  return profileVisual.background;
}

export const profileAccentColors = {
  purple: '#A78BFA',
  blue: '#65A8FF',
  green: '#35E979',
  rose: '#FF7AAD',
  charcoal: '#C9CBD8',
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: profileVisual.background,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  fill: {
    height: '100%',
    width: '100%',
  },
  bannerFrame: {
    borderColor: profileVisual.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 162,
    overflow: 'hidden',
    position: 'relative',
  },
  defaultBanner: {
    backgroundColor: '#070814',
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bannerPanel: {
    borderRadius: 32,
    height: 142,
    position: 'absolute',
    right: -24,
    top: 20,
    transform: [{ rotate: '-10deg' }],
    width: 220,
  },
  bannerPanelAlt: {
    borderRadius: 26,
    height: 104,
    left: -36,
    position: 'absolute',
    top: 48,
    transform: [{ rotate: '13deg' }],
    width: 180,
  },
  bannerNoise: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    bottom: 0,
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  bannerShade: {
    backgroundColor: 'rgba(5,5,10,0.48)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 12,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  mediaEdit: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 12,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    width: 36,
  },
  identityCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    gap: 6,
    marginTop: -42,
    paddingBottom: 3,
    paddingHorizontal: 0,
    paddingTop: 0,
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
    minHeight: 44,
  },
  avatarHeaderCentered: {
    alignItems: 'center',
    flexDirection: 'column',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: profileVisual.surfaceStrong,
    borderRadius: 44,
    borderWidth: 3,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 88,
  },
  avatarEdit: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,6,11,0.84)',
    borderColor: profileVisual.border,
    borderRadius: 13,
    borderWidth: 1,
    bottom: 4,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    width: 26,
  },
  initials: {
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 25,
    fontWeight: '600',
  },
  identityCopy: {
    gap: 5,
    paddingHorizontal: 1,
  },
  name: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 38,
    maxWidth: '100%',
  },
  boldName: {
    fontSize: 32,
  },
  centerText: {
    textAlign: 'center',
  },
  username: {
    color: profileVisual.muted,
    fontFamily: profileFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  headline: {
    color: profileVisual.textSoft,
    fontFamily: profileFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    maxWidth: 430,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    minHeight: 20,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minWidth: 0,
  },
  metaText: {
    color: profileVisual.muted,
    flexShrink: 1,
    fontFamily: profileFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  metaDot: {
    backgroundColor: profileVisual.mutedDim,
    borderRadius: 2,
    height: 3,
    width: 3,
  },
  metaRole: {
    color: profileVisual.purple,
    flexShrink: 1,
    fontFamily: profileFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  centerWrap: {
    justifyContent: 'center',
  },
  factRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  fact: {
    alignItems: 'center',
    backgroundColor: profileVisual.surfaceSoft,
    borderColor: profileVisual.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  factText: {
    color: profileVisual.textSoft,
    fontFamily: profileFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: profileVisual.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  pillAccent: {
    backgroundColor: profileVisual.purpleSoft,
    borderColor: profileVisual.borderStrong,
  },
  pillText: {
    color: profileVisual.textSoft,
    fontFamily: profileFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  pillAccentText: {
    color: profileVisual.text,
  },
  intentRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  intent: {
    backgroundColor: profileVisual.surfaceSoft,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  intentText: {
    fontFamily: profileFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  identityActions: {
    marginTop: theme.spacing.xs,
    width: '100%',
  },
  section: {
    backgroundColor: profileVisual.surface,
    borderColor: profileVisual.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
    padding: 15,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  sectionTitle: {
    color: '#C7B8FF',
    fontFamily: profileFonts.monoMedium,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  sectionEdit: {
    alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderColor: profileVisual.borderStrong,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  ownerEmpty: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: profileVisual.border,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  emptyCopy: {
    flex: 1,
    gap: 3,
  },
  ownerEmptyTitle: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  ownerEmptyBody: {
    color: profileVisual.purple,
    fontFamily: profileFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  promptList: {
    gap: 9,
  },
  prompt: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: profileVisual.border,
    borderRadius: 15,
    borderWidth: 1,
    gap: 5,
    padding: 12,
  },
  promptLabel: {
    fontFamily: profileFonts.monoMedium,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  promptAnswer: {
    color: profileVisual.textSoft,
    fontFamily: profileFonts.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  bodyText: {
    color: profileVisual.textSoft,
    fontFamily: profileFonts.sans,
    fontSize: 13,
    lineHeight: 20,
  },
  linkList: {
    gap: 8,
  },
  customLink: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: profileVisual.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  linkIcon: {
    alignItems: 'center',
    backgroundColor: profileVisual.purpleSoft,
    borderRadius: 13,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  linkCopy: {
    flex: 1,
    minWidth: 0,
  },
  linkLabel: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  linkHost: {
    color: profileVisual.muted,
    fontFamily: profileFonts.sans,
    fontSize: 11,
    marginTop: 2,
  },
  detailList: {
    gap: 9,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    minHeight: 39,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: profileVisual.purpleSoft,
    borderColor: profileVisual.borderStrong,
    borderRadius: 13,
    borderWidth: 1,
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
    color: profileVisual.mutedDim,
    fontFamily: profileFonts.monoMedium,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.72,
  },
});
