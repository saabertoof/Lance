import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SaveButton } from '@/components/saved';
import { Chip } from '@/components/ui';
import { theme } from '@/constants/theme';
import {
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
    const heroImage =
      profile.polish.bannerUrl ??
      profile.polish.portfolio.find((item) => item.mediaUrl || item.thumbnailUrl)
        ?.thumbnailUrl ??
      profile.polish.portfolio.find((item) => item.mediaUrl)?.mediaUrl ??
      null;
    const prompt = profile.polish.prompts[0];

    return (
      <View style={[styles.card, styles.discoverCard]}>
        <View style={styles.heroMedia}>
          {heroImage ? (
            <Image contentFit="cover" source={heroImage} style={styles.image} />
          ) : (
            <View style={styles.heroFallback}>
              <Ionicons color={theme.colors.accentStrong} name="sparkles-outline" size={34} />
            </View>
          )}
          <View style={styles.savedMark}>
            <Ionicons
              color={isSaved ? theme.colors.accentStrong : theme.colors.muted}
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={23}
            />
          </View>
        </View>
        <View style={styles.discoverContent}>
          <View style={styles.discoverIdentity}>
            <View style={styles.overlapAvatar}>
              {profile.avatarUrl ? (
                <Image contentFit="cover" source={profile.avatarUrl} style={styles.image} />
              ) : (
                <Text style={styles.discoverInitials}>{initials}</Text>
              )}
            </View>
            <View style={styles.identity}>
              <Text numberOfLines={1} style={styles.discoverName}>{profile.displayName}</Text>
              <Text numberOfLines={1} style={styles.username}>@{profile.username} · {profile.primaryRole}</Text>
            </View>
          </View>
          <Text numberOfLines={2} style={styles.headline}>{profile.headline}</Text>
          <Text numberOfLines={1} style={styles.location}>
            {[profile.polish.location?.label ?? profile.city, getOptionLabel(remotePreferenceOptions, profile.remotePreference)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {profile.polish.currentIntents.length > 0 ? (
            <View style={styles.chips}>
              {profile.polish.currentIntents.slice(0, 2).map((intent) => (
                <Chip
                  accent
                  key={intent}
                  label={intentLabels[intent] ?? intent.replace(/_/g, ' ')}
                />
              ))}
            </View>
          ) : null}
          <View style={styles.chips}>
            {profile.skills.slice(0, 4).map((skill) => <Chip key={skill.toLowerCase()} label={skill} />)}
          </View>
          {prompt || profile.bio ? (
            <Text numberOfLines={2} style={styles.excerpt}>
              {prompt?.answer ?? profile.bio}
            </Text>
          ) : null}
          {reasons.length > 0 ? (
            <View style={styles.reason}>
              <Ionicons color={theme.colors.accentStrong} name="sparkles-outline" size={16} />
              <Text numberOfLines={2} style={styles.reasonText}>
                Why you&apos;re seeing this: {reasons.join(' · ')}
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
            <Image contentFit="cover" source={profile.avatarUrl} style={styles.image} />
          ) : (
            <Text style={styles.initials}>
              {initials}
            </Text>
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
          {[profile.city, getOptionLabel(remotePreferenceOptions, profile.remotePreference)]
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

const intentLabels: Record<string, string> = {
  building_startup: 'Building a startup',
  looking_for_cofounder: 'Looking for a cofounder',
  looking_for_collaborators: 'Looking for collaborators',
  open_to_freelance: 'Open to freelance',
  looking_for_internships: 'Looking for internships',
  looking_for_job: 'Looking for a job',
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
    flex: 1,
    gap: 0,
    minHeight: 430,
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
  discoverInitials: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  discoverName: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
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
  heroMedia: { backgroundColor: theme.colors.surfaceMuted, height: '34%', minHeight: 136, position: 'relative' },
  heroFallback: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, flex: 1, justifyContent: 'center' },
  savedMark: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 20, height: 40, justifyContent: 'center', position: 'absolute', right: 14, top: 14, width: 40 },
  discoverContent: { flex: 1, gap: theme.spacing.sm, padding: theme.spacing.lg, paddingTop: theme.spacing.sm },
  discoverIdentity: { alignItems: 'flex-end', flexDirection: 'row', gap: theme.spacing.md, minHeight: 50 },
  overlapAvatar: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.surface, borderRadius: 34, borderWidth: 4, height: 68, justifyContent: 'center', marginTop: -28, overflow: 'hidden', width: 68 },
  excerpt: { color: theme.colors.textSoft, fontSize: theme.typography.small, lineHeight: 20 },
  reason: { alignItems: 'flex-start', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.sm, flexDirection: 'row', gap: theme.spacing.sm, marginTop: 'auto', padding: theme.spacing.sm },
  reasonText: { color: theme.colors.accentStrong, flex: 1, fontSize: theme.typography.tiny, fontWeight: '700', lineHeight: 17 },
  pressed: {
    opacity: 0.8,
  },
});
