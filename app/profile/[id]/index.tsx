import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileSocialLinks } from '@/components/profile';
import { SaveButton } from '@/components/saved';
import { Chip, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSaved } from '@/context/SavedContext';
import { formatDiscoveryError, loadPublicProfile } from '@/lib/discovery';
import {
  availabilityOptions,
  experienceOptions,
  getOptionLabel,
  opportunityInterestOptions,
  remotePreferenceOptions,
  type PublicProfile,
} from '@/types/profile';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isProfileSaved, setProfileSaved } = useSaved();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    loadPublicProfile(id)
      .then((result) => {
        if (active) setProfile(result);
      })
      .catch((loadError) => {
        if (active) setError(formatDiscoveryError(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (isLoading) return <LoadingState message="Loading profile" />;
  if (!profile) {
    return (
      <Screen centered>
        <Text style={styles.error}>{error ?? 'This profile is unavailable.'}</Text>
      </Screen>
    );
  }

  const initials =
    profile.displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'L';
  const isOwnProfile = profile.id === user?.id;
  const saved = isProfileSaved(profile.id);

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        {!isOwnProfile ? (
          <SaveButton
            isSaved={saved}
            onPress={() => void setProfileSaved(profile.id, !saved)}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <View style={styles.identity}>
        <View style={styles.avatar}>
          {profile.avatarUrl ? (
            <Image contentFit="cover" source={profile.avatarUrl} style={styles.image} />
          ) : (
            <Text style={styles.initials}>{initials}</Text>
          )}
        </View>
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.headline}>{profile.headline}</Text>
        <Text style={styles.location}>
          {[profile.primaryRole, profile.city].filter(Boolean).join(' | ')}
        </Text>
      </View>

      <Section title="About">
        <Text style={styles.body}>{profile.bio}</Text>
      </Section>

      <Section title="Skills">
        <View style={styles.chips}>
          {profile.skills.map((skill) => (
            <Chip key={skill.toLowerCase()} label={skill} />
          ))}
        </View>
      </Section>

      <Section title="Work preferences">
        <Detail
          label="Experience"
          value={getOptionLabel(experienceOptions, profile.experienceLevel)}
        />
        <Detail
          label="Availability"
          value={getOptionLabel(availabilityOptions, profile.availability)}
        />
        <Detail
          label="Work style"
          value={getOptionLabel(remotePreferenceOptions, profile.remotePreference)}
        />
      </Section>

      <Section title="Looking for">
        <View style={styles.chips}>
          {profile.opportunityInterests.map((interest) => (
            <Chip
              accent
              key={interest}
              label={getOptionLabel(opportunityInterestOptions, interest)}
            />
          ))}
        </View>
      </Section>

      {profile.industryExperience.length > 0 ? (
        <Section title="Industry experience">
          <View style={styles.chips}>
            {profile.industryExperience.map((industry) => (
              <Chip key={industry.toLowerCase()} label={industry} />
            ))}
          </View>
        </Section>
      ) : null}

      {profile.links.length > 0 ? (
        <Section title="Links">
          <ProfileSocialLinks links={profile.links} onError={setError} />
        </Section>
      ) : null}

      {!isOwnProfile ? (
        <Text style={styles.privateNote}>
          Saving is private and does not notify this person or express interest.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  placeholder: {
    height: 44,
    width: 44,
  },
  identity: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 54,
    height: 108,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 108,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  initials: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.title,
    fontWeight: '900',
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
    textAlign: 'center',
  },
  username: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  headline: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    fontWeight: '600',
    lineHeight: 24,
    maxWidth: 350,
    textAlign: 'center',
  },
  location: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  section: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  body: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    lineHeight: 25,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  detail: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  detailValue: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '800',
    textAlign: 'right',
  },
  privateNote: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
});
