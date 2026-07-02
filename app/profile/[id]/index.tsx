import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  RelationshipAction,
  SafetySheet,
} from '@/components/communication';
import {
  ProfileFeaturedSection,
  ProfileHero,
  ProfileIdentityBlock,
  ProfileProfessionalSections,
  ProfilePromptSection,
  profileAccentColors,
  profileBackground,
  profileShapeRadius,
} from '@/components/profile';
import { profileVisual } from '@/components/profile/profileVisual';
import { LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSaved } from '@/context/SavedContext';
import {
  formatCommunicationError,
  loadRelationshipStatus,
} from '@/lib/communication';
import { formatDiscoveryError, loadPublicProfile } from '@/lib/discovery';
import type { RelationshipStatus } from '@/types/communication';
import type { PublicProfile } from '@/types/profile';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isProfileSaved, setProfileSaved } = useSaved();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [relationship, setRelationship] = useState<RelationshipStatus | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    loadPublicProfile(id)
      .then((result) => active && setProfile(result))
      .catch((loadError) =>
        active && setError(formatDiscoveryError(loadError)),
      )
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || id === user?.id) return;
    loadRelationshipStatus(id)
      .then(setRelationship)
      .catch((loadError) =>
        setError(formatCommunicationError(loadError)),
      );
  }, [id, user?.id]);

  if (isLoading) return <LoadingState message="Loading profile" />;
  if (!profile) {
    return (
      <Screen centered>
        <Text style={styles.error}>
          {error ?? 'This profile is unavailable.'}
        </Text>
      </Screen>
    );
  }

  const accent = profileAccentColors[profile.polish.theme.accent];
  const radius = profileShapeRadius(profile.polish.theme.cardShape);
  const isOwnProfile = profile.id === user?.id;
  const saved = isProfileSaved(profile.id);

  return (
    <Screen
      scroll
      style={{
        backgroundColor: profileBackground(profile.polish.theme.background),
      }}
      contentStyle={styles.screen}
      topInset={false}>
      <ProfileHero
        accent={accent}
        profile={profile}
        topBar={
          <>
            <OverlayButton label="Go back" onPress={() => router.back()}>
              <Ionicons color={profileVisual.text} name="arrow-back" size={22} />
            </OverlayButton>
            {isOwnProfile ? (
              <OverlayButton
                label="Edit profile"
                onPress={() => router.push('/profile/edit')}>
                <Ionicons
                  color={profileVisual.text}
                  name="create-outline"
                  size={21}
                />
              </OverlayButton>
            ) : (
              <View style={styles.topActions}>
                <OverlayButton
                  label={saved ? 'Remove from Saved' : 'Save privately'}
                  onPress={() => void setProfileSaved(profile.id, !saved)}>
                  <Ionicons
                    color={saved ? profileVisual.purple : profileVisual.text}
                    name={saved ? 'bookmark' : 'bookmark-outline'}
                    size={21}
                  />
                </OverlayButton>
                <OverlayButton
                  label="Profile safety options"
                  onPress={() => setSafetyOpen(true)}>
                  <Ionicons
                    color={profileVisual.text}
                    name="ellipsis-horizontal"
                    size={21}
                  />
                </OverlayButton>
              </View>
            )}
          </>
        }
      />

      <View style={styles.body}>
        <ProfileIdentityBlock
          accent={accent}
          onError={setError}
          profile={profile}
          action={
            !isOwnProfile ? (
              <RelationshipAction onError={setError} profile={profile} />
            ) : undefined
          }
        />

        <ProfileFeaturedSection
          accent={accent}
          onError={setError}
          profile={profile}
          radius={radius}
        />

        <ProfilePromptSection
          accent={accent}
          profile={profile}
        />

        <ProfileProfessionalSections
          accent={accent}
          onError={setError}
          profile={profile}
        />

        {!isOwnProfile ? (
          <Text style={styles.privateNote}>
            Saving is private and does not notify this person or express
            interest.
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {!isOwnProfile ? (
        <SafetySheet
          blockedByMe={Boolean(relationship?.blockedByMe)}
          onClose={() => setSafetyOpen(false)}
          onStateChange={() =>
            void loadRelationshipStatus(profile.id).then(setRelationship)
          }
          profileId={profile.id}
          targetId={profile.id}
          targetKind="profile"
          visible={safetyOpen}
        />
      ) : null}
    </Screen>
  );
}

function OverlayButton({
  children,
  label,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.overlayButton,
        pressed && styles.pressed,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  body: {
    gap: 13,
    paddingBottom: 120,
    paddingHorizontal: 12,
  },
  topActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  overlayButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,6,11,0.68)',
    borderColor: profileVisual.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  privateNote: {
    color: profileVisual.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
    textAlign: 'center',
  },
  error: {
    color: profileVisual.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
