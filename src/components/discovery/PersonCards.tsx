import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SaveButton } from '@/components/saved';
import { Chip } from '@/components/ui';
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
                {profile.username ? `  @${profile.username}` : ''}
              </Text>
            </View>
            {isSaved ? (
              <View style={styles.savedIndicator}>
                <Ionicons color={theme.colors.white} name="bookmark" size={15} />
              </View>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              color="rgba(255,255,255,0.82)"
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
              color="rgba(255,255,255,0.82)"
              name="time-outline"
              size={15}
            />
            <Text numberOfLines={1} style={styles.metaText}>
              {getOptionLabel(availabilityOptions, profile.availability)}
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
    fontWeight: '900',
  },
  identity: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
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
    fontWeight: '800',
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
    fontWeight: '900',
  },
  mediaShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,5,10,0.12)',
  },
  fadeTop: {
    backgroundColor: 'rgba(4,5,10,0.16)',
    bottom: 0,
    height: '72%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  fadeMiddle: {
    backgroundColor: 'rgba(4,5,10,0.22)',
    bottom: 0,
    height: '58%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  fadeBottom: {
    backgroundColor: 'rgba(4,5,10,0.36)',
    bottom: 0,
    height: '44%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  discoverContent: {
    bottom: 0,
    gap: 7,
    left: 0,
    padding: theme.spacing.lg,
    position: 'absolute',
    right: 0,
  },
  discoverIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
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
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 4,
  },
  discoverRole: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  savedIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(124,92,255,0.86)',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minWidth: 0,
  },
  metaText: {
    color: 'rgba(255,255,255,0.88)',
    flexShrink: 1,
    fontSize: theme.typography.tiny,
    fontWeight: '700',
  },
  metaDot: {
    backgroundColor: 'rgba(255,255,255,0.55)',
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
    backgroundColor: 'rgba(8,10,18,0.54)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    maxWidth: '42%',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  overlayPillAccent: {
    backgroundColor: 'rgba(104,67,244,0.72)',
    borderColor: 'rgba(210,201,255,0.55)',
  },
  overlayPillText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  discoverStatement: {
    color: theme.colors.white,
    fontSize: theme.typography.small,
    fontWeight: '600',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.32)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 3,
  },
  reason: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 1,
  },
  reasonText: {
    color: 'rgba(255,255,255,0.82)',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
