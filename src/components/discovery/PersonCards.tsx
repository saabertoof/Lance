import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SaveButton } from '@/components/saved';
import { Chip } from '@/components/ui';
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
import { theme } from '@/constants/theme';
import {
  availabilityOptions,
  getOptionLabel,
  remotePreferenceOptions,
  type PublicProfile,
} from '@/types/profile';

type PersonCardProps = {
  discover?: boolean;
  isSaved: boolean;
  onPress: () => void;
  onSave: () => void;
  profile: PublicProfile;
  reasons?: string[];
};

export function PersonCard({
  discover,
  isSaved,
  onPress,
  onSave,
  profile,
  reasons = [],
}: PersonCardProps) {
  const initials =
    profile.displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'L';

  if (discover) {
    const featuredPortfolio = profile.polish.portfolio.find(
      (item) =>
        item.itemType === 'image' && (item.thumbnailUrl || item.mediaUrl),
    );
    const heroImage =
      featuredPortfolio?.thumbnailUrl ??
      featuredPortfolio?.mediaUrl ??
      profile.polish.bannerUrl ??
      profile.avatarUrl ??
      null;
    const prompt = profile.polish.prompts[0];
    const statement = prompt?.answer || profile.headline || profile.bio;
    const showSmallAvatar =
      Boolean(profile.avatarUrl) && heroImage !== profile.avatarUrl;
    const availabilityLabel = getOptionLabel(
      availabilityOptions,
      profile.availability,
    );

    return (
      <View style={[styles.card, styles.discoverCard]}>
        {heroImage ? (
          <Image
            contentFit="cover"
            source={heroImage}
            style={styles.discoverImage}
            transition={160}
          />
        ) : (
          <View style={styles.heroFallback}>
            <View style={styles.fallbackAccent} />
            <Text style={styles.fallbackInitials}>{initials}</Text>
          </View>
        )}
        <View style={styles.mediaShade} />
        <View style={styles.fadeTop} />
        <View style={styles.fadeMiddle} />
        <View style={styles.fadeBottom} />

        <View style={styles.topStatus}>
          <View style={styles.statusDot} />
          <Text numberOfLines={1} style={styles.topStatusText}>
            {availabilityLabel}
          </Text>
        </View>
        <View style={styles.topSave}>
          <Ionicons
            color={isSaved ? v.purpleStrong : v.text}
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={24}
          />
        </View>

        <View style={styles.discoverContent}>
          <View style={styles.discoverIdentity}>
            {showSmallAvatar ? (
              <View style={styles.smallAvatar}>
                <Image
                  contentFit="cover"
                  source={profile.avatarUrl}
                  style={styles.image}
                />
              </View>
            ) : null}
            <View style={styles.identity}>
              <Text numberOfLines={1} style={styles.discoverName}>
                {profile.displayName}
              </Text>
              <Text numberOfLines={1} style={styles.discoverRole}>
                {profile.primaryRole}
                {profile.username ? ` · @${profile.username}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              color={v.textSoft}
              name="location-outline"
              size={15}
            />
            <Text numberOfLines={1} style={styles.metaText}>
              {profile.polish.location?.label ?? profile.city}
            </Text>
            <View style={styles.metaDot} />
            <Text numberOfLines={1} style={styles.metaText}>
              {getOptionLabel(
                remotePreferenceOptions,
                profile.remotePreference,
              )}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              color={v.green}
              name="time-outline"
              size={15}
            />
            <Text numberOfLines={1} style={styles.metaText}>
              {availabilityLabel}
            </Text>
          </View>

          {profile.polish.currentIntents.length > 0 ? (
            <View style={styles.overlayPills}>
              {profile.polish.currentIntents.slice(0, 2).map((intent) => (
                <OverlayPill
                  accent
                  key={intent}
                  label={intentLabels[intent] ?? intent.replace(/_/g, ' ')}
                />
              ))}
            </View>
          ) : null}

          {profile.skills.length > 0 ? (
            <View style={styles.overlayPills}>
              {profile.skills.slice(0, 3).map((skill) => (
                <OverlayPill key={skill.toLowerCase()} label={skill} />
              ))}
            </View>
          ) : null}

          {statement ? (
            <Text numberOfLines={2} style={styles.discoverStatement}>
              {statement}
            </Text>
          ) : null}

          {reasons.length > 0 ? (
            <View style={styles.reason}>
              <Ionicons color="#C8BEFF" name="sparkles-outline" size={14} />
              <Text numberOfLines={1} style={styles.reasonText}>
                {reasons.join(' | ')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {profile.avatarUrl ? (
            <Image
              contentFit="cover"
              source={profile.avatarUrl}
              style={styles.image}
            />
          ) : (
            <Text style={styles.initials}>{initials}</Text>
          )}
        </View>
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>
            {profile.displayName}
          </Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
        <SaveButton
          compact
          isSaved={isSaved}
          onPress={(event) => {
            event?.stopPropagation();
            onSave();
          }}
        />
      </View>

      <View style={styles.copy}>
        <Text style={styles.role}>{profile.primaryRole}</Text>
        <Text numberOfLines={2} style={styles.headline}>
          {profile.headline}
        </Text>
        <Text style={styles.location}>
          {[
            profile.city,
            getOptionLabel(
              remotePreferenceOptions,
              profile.remotePreference,
            ),
          ]
            .filter(Boolean)
            .join(' | ')}
        </Text>
      </View>

      <View style={styles.chips}>
        {profile.skills.slice(0, 3).map((skill) => (
          <Chip key={skill.toLowerCase()} label={skill} />
        ))}
      </View>
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

function OverlayPill({ accent, label }: { accent?: boolean; label: string }) {
  return (
    <View style={[styles.overlayPill, accent && styles.overlayPillAccent]}>
      <Text numberOfLines={1} style={styles.overlayPillText}>
        {label}
      </Text>
    </View>
  );
}

const intentLabels: Record<string, string> = {
  building_startup: 'Building a startup',
  looking_for_cofounder: 'Looking for a cofounder',
  looking_for_collaborators: 'Looking for collaborators',
  open_to_freelance: 'Open to freelance',
  looking_for_internships: 'Looking for internships',
  looking_for_job: 'Looking for opportunities',
  hiring: 'Hiring',
  looking_for_projects: 'Looking for projects',
  offering_skills: 'Offering my skills',
  just_networking: 'Just networking',
  offering_mentorship: 'Offering mentorship',
  seeking_mentorship: 'Seeking mentorship',
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  discoverCard: {
    backgroundColor: '#20222D',
    borderColor: v.borderPurple,
    borderRadius: 24,
    flex: 1,
    gap: 0,
    minHeight: 390,
    overflow: 'hidden',
    padding: 0,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  initials: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.subheading,
    fontWeight: '600',
  },
  identity: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '600',
  },
  username: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  copy: {
    gap: theme.spacing.sm,
  },
  role: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '600',
  },
  headline: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    fontWeight: '600',
    lineHeight: 24,
  },
  location: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  discoverImage: {
    ...StyleSheet.absoluteFillObject,
    height: undefined,
    width: undefined,
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#20222D',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackAccent: {
    backgroundColor: theme.colors.accent,
    height: '120%',
    opacity: 0.22,
    position: 'absolute',
    right: '14%',
    transform: [{ rotate: '18deg' }],
    width: 72,
  },
  fallbackInitials: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 116,
    fontWeight: '600',
  },
  mediaShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,5,10,0.18)',
  },
  fadeTop: {
    backgroundColor: 'rgba(4,5,10,0.18)',
    bottom: 0,
    height: '72%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  fadeMiddle: {
    backgroundColor: 'rgba(4,5,10,0.26)',
    bottom: 0,
    height: '58%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  fadeBottom: {
    backgroundColor: 'rgba(4,5,10,0.52)',
    bottom: 0,
    height: '44%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  discoverContent: {
    bottom: 0,
    gap: 10,
    left: 0,
    padding: 20,
    position: 'absolute',
    right: 0,
  },
  discoverIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  topStatus: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,10,0.66)',
    borderColor: v.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    left: 18,
    minHeight: 32,
    paddingHorizontal: 11,
    position: 'absolute',
    top: 18,
  },
  statusDot: {
    backgroundColor: v.green,
    borderRadius: 5,
    height: 9,
    width: 9,
  },
  topStatusText: {
    color: v.text,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 140,
  },
  topSave: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,10,0.44)',
    borderColor: v.borderStrong,
    borderRadius: 22,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    top: 18,
    width: 50,
  },
  smallAvatar: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    borderWidth: 2,
    height: 48,
    overflow: 'hidden',
    width: 48,
  },
  discoverName: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 35,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 4,
  },
  discoverRole: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 14,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minWidth: 0,
  },
  metaText: {
    color: v.textSoft,
    flexShrink: 1,
    fontFamily: operatorFonts.sans,
    fontSize: 13,
  },
  metaDot: {
    backgroundColor: v.muted,
    borderRadius: 2,
    height: 3,
    width: 3,
  },
  overlayPills: {
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
  },
  overlayPill: {
    backgroundColor: 'rgba(8,10,18,0.56)',
    borderColor: v.borderStrong,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    maxWidth: '42%',
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 10,
  },
  overlayPillAccent: {
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
  },
  overlayPillText: {
    color: v.text,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  discoverStatement: {
    color: v.text,
    fontFamily: operatorFonts.sans,
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.32)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 3,
  },
  reason: {
    alignItems: 'center',
    borderTopColor: v.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
    paddingTop: 10,
  },
  reasonText: {
    color: v.textSoft,
    flex: 1,
    fontFamily: operatorFonts.sans,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.8,
  },
});
