import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileSocialLinks } from '@/components/profile';
import { Button, Card, Chip, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  calculateProfileCompletion,
  formatProfileError,
  loadPersonalProfile,
} from '@/lib/profile';
import { loadMyBusinesses } from '@/lib/business';
import { loadMyOpportunities } from '@/lib/opportunity';
import { routes } from '@/lib/routes';
import {
  availabilityOptions,
  experienceOptions,
  getOptionLabel,
  opportunityInterestOptions,
  PersonalProfile,
  remotePreferenceOptions,
} from '@/types/profile';

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managementCounts, setManagementCounts] = useState({
    activeBusinesses: 0,
    publishedOpportunities: 0,
    draftOpportunities: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadProfile() {
        if (!user) {
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const [result, businesses, opportunities] = await Promise.all([
            loadPersonalProfile(user.id, user.email ?? null),
            loadMyBusinesses(user.id),
            loadMyOpportunities(user.id),
          ]);

          if (active) {
            setProfile(result);
            setManagementCounts({
              activeBusinesses: businesses.length,
              publishedOpportunities: opportunities.filter(
                (opportunity) => opportunity.status === 'published',
              ).length,
              draftOpportunities: opportunities.filter(
                (opportunity) => opportunity.status === 'draft',
              ).length,
            });
          }
        } catch (loadError) {
          if (active) {
            setError(formatProfileError(loadError));
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      }

      void loadProfile();

      return () => {
        active = false;
      };
    }, [user]),
  );

  if (isLoading) {
    return <LoadingState message="Loading your profile" />;
  }

  if (!profile) {
    return (
      <Screen centered>
        <Text style={styles.error}>{error ?? 'Your profile could not be loaded.'}</Text>
      </Screen>
    );
  }

  const completion = calculateProfileCompletion(profile);
  const initials =
    profile.displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'L';

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Profile</Text>
        <Pressable
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
          onPress={() => router.push('/profile/edit')}
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
          <Ionicons color={theme.colors.text} name="create-outline" size={21} />
        </Pressable>
      </View>

      <View style={styles.identity}>
        <View style={styles.avatar}>
          {profile.avatarUrl ? (
            <Image contentFit="cover" source={profile.avatarUrl} style={styles.avatarImage} />
          ) : (
            <Text style={styles.initials}>{initials}</Text>
          )}
        </View>
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.headline}>{profile.headline}</Text>
        <Text style={styles.location}>
          {profile.primaryRole} | {profile.city}
        </Text>
      </View>

      <Card style={styles.completionCard}>
        <View style={styles.completionHeader}>
          <Text style={styles.sectionTitle}>Profile completion</Text>
          <Text style={styles.completionValue}>{completion}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${completion}%` }]} />
        </View>
      </Card>

      <Card style={styles.managementCard}>
        <Text style={styles.sectionTitle}>Build and post</Text>
        <View style={styles.counts}>
          <Count label="Businesses" value={managementCounts.activeBusinesses} />
          <Count
            label="Published"
            value={managementCounts.publishedOpportunities}
          />
          <Count label="Drafts" value={managementCounts.draftOpportunities} />
        </View>
        <View style={styles.managementLinks}>
          <ManagementLink
            label="Saved people and opportunities"
            onPress={() => router.push(routes.saved)}
          />
          <ManagementLink
            label="My businesses and projects"
            onPress={() => router.push(routes.businesses)}
          />
          <ManagementLink
            label="My opportunities"
            onPress={() => router.push(routes.opportunities)}
          />
          <ManagementLink
            label="Create business or project"
            onPress={() => router.push(routes.newBusiness)}
          />
          <ManagementLink
            label="Post an opportunity"
            onPress={() => router.push(routes.newOpportunity())}
          />
        </View>
      </Card>

      <ProfileSection title="About">
        <Text style={styles.body}>{profile.bio}</Text>
      </ProfileSection>

      <ProfileSection title="Skills">
        <View style={styles.chips}>
          {profile.skills.map((skill) => (
            <Chip key={skill.toLowerCase()} label={skill} />
          ))}
        </View>
      </ProfileSection>

      <ProfileSection title="Work preferences">
        <DetailRow
          label="Experience"
          value={getOptionLabel(experienceOptions, profile.experienceLevel)}
        />
        <DetailRow
          label="Availability"
          value={getOptionLabel(availabilityOptions, profile.availability)}
        />
        <DetailRow
          label="Location"
          value={getOptionLabel(remotePreferenceOptions, profile.remotePreference)}
        />
      </ProfileSection>

      <ProfileSection title="Looking for">
        <View style={styles.chips}>
          {profile.opportunityInterests.map((interest) => (
            <Chip
              accent
              key={interest}
              label={getOptionLabel(opportunityInterestOptions, interest)}
            />
          ))}
        </View>
      </ProfileSection>

      {profile.industryExperience.length > 0 ? (
        <ProfileSection title="Industry experience">
          <View style={styles.chips}>
            {profile.industryExperience.map((industry) => (
              <Chip key={industry.toLowerCase()} label={industry} />
            ))}
          </View>
        </ProfileSection>
      ) : null}

      {profile.links.length > 0 ? (
        <ProfileSection title="Links">
          <ProfileSocialLinks links={profile.links} onError={setError} />
        </ProfileSection>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Edit profile" onPress={() => router.push('/profile/edit')} />
      <Button label="Log out" onPress={signOut} variant="secondary" />
    </Screen>
  );
}

function ProfileSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function ManagementLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.managementLink, pressed && styles.pressed]}>
      <Text style={styles.managementLabel}>{label}</Text>
      <Ionicons color={theme.colors.muted} name="chevron-forward" size={19} />
    </Pressable>
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
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  identity: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 52,
    height: 104,
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
    width: 104,
  },
  avatarImage: {
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
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  username: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  headline: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    fontWeight: '600',
    lineHeight: 23,
    maxWidth: 330,
    textAlign: 'center',
  },
  location: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  completionCard: {
    gap: theme.spacing.md,
  },
  managementCard: {
    gap: theme.spacing.lg,
  },
  counts: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  count: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    flex: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  countValue: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  countLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    textAlign: 'center',
  },
  managementLinks: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
  },
  managementLink: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  managementLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  completionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  completionValue: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  track: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    height: 7,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    height: '100%',
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
    lineHeight: 24,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.lg,
    justifyContent: 'space-between',
    minHeight: 30,
  },
  detailLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  detailValue: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '700',
    textAlign: 'right',
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
});
