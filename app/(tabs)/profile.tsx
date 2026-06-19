import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import {
  ProfileCompletionCard,
  ProfileFeaturedSection,
  ProfileHero,
  ProfileIdentityBlock,
  ProfileOwnerActions,
  ProfileOwnerDashboard,
  ProfileOverlayButton,
  ProfileProfessionalSections,
  ProfilePromptSection,
  ProfileStatsRow,
  profileAccentColors,
  profileBackground,
  profileShapeRadius,
  type ProfileDashboardGroup,
} from '@/components/profile';
import { LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useMessaging } from '@/context/MessagingContext';
import { formatDiscoveryError, loadPublicProfile } from '@/lib/discovery';
import {
  loadOwnerProfileSummary,
  type OwnerProfileSummary,
} from '@/lib/profileHub';
import { routes } from '@/lib/routes';
import type { PublicProfile } from '@/types/profile';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { showWarning } = useFeedback();
  const { unreadCount } = useMessaging();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [summary, setSummary] = useState<OwnerProfileSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        if (!user) return;
        setIsLoading(true);
        setError(null);

        const [profileResult, summaryResult] = await Promise.allSettled([
          loadPublicProfile(user.id),
          loadOwnerProfileSummary(user.id),
        ]);

        if (!active) return;

        if (profileResult.status === 'fulfilled' && profileResult.value) {
          setProfile(profileResult.value);
        } else {
          setProfile(null);
          setError(
            profileResult.status === 'rejected'
              ? formatDiscoveryError(profileResult.reason)
              : 'Your profile could not be loaded.',
          );
        }

        if (summaryResult.status === 'fulfilled') {
          setSummary(summaryResult.value);
        } else {
          setSummary(null);
          setError((current) =>
            current ?? 'Some private activity counts could not be loaded.',
          );
        }

        setIsLoading(false);
      }

      void load();
      return () => {
        active = false;
      };
    }, [user]),
  );

  if (isLoading) {
    return <LoadingState message="Loading your Lance profile" />;
  }

  if (!profile) {
    return (
      <Screen centered>
        <Text style={styles.error}>
          {error ?? 'Your profile could not be loaded.'}
        </Text>
      </Screen>
    );
  }

  const currentProfile = profile;
  const accent = profileAccentColors[profile.polish.theme.accent];
  const radius = profileShapeRadius(profile.polish.theme.cardShape);
  const completion = profileCompletion(profile);
  const dashboardGroups: ProfileDashboardGroup[] = [
    {
      title: 'Network',
      items: [
        {
          count: summary?.connections ?? null,
          icon: 'people-outline',
          label: 'Connections',
          onPress: () => router.push(routes.connections),
        },
        {
          badge: summary?.pendingRequests,
          icon: 'person-add-outline',
          label: 'Requests',
          onPress: () => router.push(routes.messageRequests),
        },
        {
          badge: unreadCount,
          icon: 'paper-plane-outline',
          label: 'Messages',
          onPress: () => router.push(routes.messages),
        },
      ],
    },
    {
      title: 'Work',
      items: [
        {
          count: summary?.applied ?? null,
          icon: 'paper-plane-outline',
          label: 'Applications',
          onPress: () => router.push(routes.applications),
        },
        {
          count: summary?.jobs ?? null,
          icon: 'briefcase-outline',
          label: 'My jobs',
          onPress: () => router.push(routes.opportunities),
        },
        {
          badge: summary?.newApplicants,
          icon: 'sparkles-outline',
          label: 'Interested Talent',
          onPress: () => router.push(routes.interestedTalentHub),
        },
      ],
    },
    {
      title: 'Projects',
      items: [
        {
          count: summary?.businesses ?? null,
          icon: 'business-outline',
          label: 'Businesses & projects',
          onPress: () => router.push(routes.businesses),
        },
        {
          icon: 'color-palette-outline',
          label: 'Manage profile',
          onPress: () => router.push(routes.editProfile),
        },
      ],
    },
    {
      title: 'Saved',
      items: [
        {
          count: summary?.saved ?? null,
          icon: 'bookmark-outline',
          label: 'Saved people & jobs',
          onPress: () => router.push(routes.saved),
        },
      ],
    },
  ];

  async function shareProfile() {
    try {
      await Share.share({
        message: [
          `Meet ${currentProfile.displayName} on Lance.`,
          currentProfile.username ? `@${currentProfile.username}` : '',
          currentProfile.headline,
        ]
          .filter(Boolean)
          .join(' '),
      });
    } catch {
      showWarning('Your profile could not be shared. Try again.');
    }
  }

  const editProfile = () => router.push(routes.editProfile);

  return (
    <Screen
      compact
      scroll
      style={{ backgroundColor: profileBackground(profile.polish.theme.background) }}
      contentStyle={styles.screen}
      topInset={false}>
      <ProfileHero
        accent={accent}
        onEditBanner={editProfile}
        profile={profile}
        topBar={
          <>
            <View style={styles.topPlaceholder} />
            <View style={styles.topActions}>
              <ProfileOverlayButton
                label="Share profile"
                onPress={() => void shareProfile()}>
                <Ionicons color={theme.colors.text} name="share-outline" size={21} />
              </ProfileOverlayButton>
              <ProfileOverlayButton
                label="Open profile settings"
                onPress={() => router.push(routes.profileSettings)}>
                <Ionicons color={theme.colors.text} name="settings-outline" size={21} />
              </ProfileOverlayButton>
            </View>
          </>
        }
      />

      <View style={styles.body}>
        <ProfileIdentityBlock
          accent={accent}
          onEditAvatar={editProfile}
          onError={setError}
          profile={profile}
          action={
            <ProfileOwnerActions
              onEdit={editProfile}
              onPreview={() => router.push(routes.profile(profile.id))}
              onShare={() => void shareProfile()}
            />
          }
        />

        <ProfileStatsRow
          onApplied={() => router.push(routes.applications)}
          onConnections={() => router.push(routes.connections)}
          onJobs={() => router.push(routes.opportunities)}
          summary={summary}
        />

        <ProfileFeaturedSection
          accent={accent}
          onEdit={editProfile}
          onError={setError}
          profile={profile}
          radius={radius}
        />

        <ProfilePromptSection
          accent={accent}
          onEdit={editProfile}
          profile={profile}
          radius={radius}
        />

        <ProfileProfessionalSections
          accent={accent}
          onEdit={editProfile}
          onError={setError}
          profile={profile}
          radius={radius}
        />

        <ProfileOwnerDashboard groups={dashboardGroups} />

        <ProfileCompletionCard
          actions={completion.actions}
          completion={completion.percentage}
          onPress={editProfile}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </Screen>
  );
}

function profileCompletion(profile: PublicProfile) {
  const checks = [
    { complete: Boolean(profile.avatarUrl), label: 'Add a profile photo' },
    {
      complete: Boolean(profile.polish.bannerUrl),
      label: 'Add a profile banner',
    },
    { complete: Boolean(profile.headline), label: 'Add a headline' },
    { complete: Boolean(profile.bio), label: 'Add an About section' },
    {
      complete: profile.polish.currentIntents.length > 0,
      label: 'Add a current intent',
    },
    { complete: profile.skills.length > 0, label: 'Add skills' },
    {
      complete: profile.polish.portfolio.length > 0,
      label: 'Add featured work',
    },
    {
      complete:
        profile.links.length + profile.polish.customLinks.length > 0,
      label: 'Add a link',
    },
    {
      complete: Boolean(profile.polish.location?.label ?? profile.city),
      label: 'Add your location',
    },
    {
      complete: profile.polish.prompts.length > 0,
      label: 'Answer a profile prompt',
    },
  ];
  const completed = checks.filter((check) => check.complete).length;
  return {
    actions: checks.filter((check) => !check.complete).map((check) => check.label),
    percentage: Math.round((completed / checks.length) * 100),
  };
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  topPlaceholder: {
    height: 44,
    width: 44,
  },
  topActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  body: {
    gap: theme.density.sectionGap,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.layout.screenPadding,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
});
