import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BasicProfileFields,
  FormSection,
  ProfileLinksFields,
  ProfilePolishEditor,
  ProfessionalProfileFields,
} from '@/components/profile';
import { Button, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import {
  formatProfileError,
  loadPersonalProfile,
  normalizeProfileLinks,
  profileToDraft,
  savePersonalProfile,
  uploadAvatar,
} from '@/lib/profile';
import {
  loadProfilePolish,
  saveProfilePolish,
  uploadBanner,
} from '@/lib/profilePolish';
import {
  getLocationCatalogId,
  getLocationCountryCode,
} from '@/lib/location';
import { ProfileDraft } from '@/types/profile';
import type { ProfilePolish } from '@/types/profilePolish';

export default function EditProfileScreen() {
  const { refreshProfileStatus, user } = useAuth();
  const { showSuccess } = useFeedback();
  const submissionRef = useRef(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [polish, setPolish] = useState<ProfilePolish | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user) {
        return;
      }

      try {
        const [profile, profilePolish] = await Promise.all([
          loadPersonalProfile(user.id, user.email ?? null),
          loadProfilePolish(user.id),
        ]);

        if (active && profile) {
          setDraft(profileToDraft(profile));
          setPolish(profilePolish);
        }
      } catch (error) {
        if (active) {
          setFeedback(formatProfileError(error));
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
  }, [user]);

  async function saveProfile() {
    if (!draft || !polish || !user || submissionRef.current) {
      return;
    }

    submissionRef.current = true;
    setIsSaving(true);
    setFeedback(null);

    try {
      const normalizedLinks = normalizeProfileLinks(draft.links);
      let avatarUrl = draft.avatarUrl;
      let bannerPath = polish.bannerPath;
      const uploadedAvatar = Boolean(draft.localAvatarBase64);

      if (draft.localAvatarBase64) {
        avatarUrl = await uploadAvatar(user.id, draft.localAvatarBase64);
      }
      if (polish.pendingBannerBase64) {
        bannerPath = await uploadBanner(
          user.id,
          polish.pendingBannerBase64,
          polish.pendingBannerMimeType ?? 'image/jpeg',
        );
      }

      const savedDraft = {
        ...draft,
        avatarUrl,
        city: polish.location?.label ?? draft.city,
        locationId: getLocationCatalogId(polish.location),
        locationRegion: polish.location?.region ?? '',
        locationCountry: getLocationCountryCode(polish.location),
        links: normalizedLinks,
        localAvatarBase64: null,
        localAvatarUri: null,
      };

      await savePersonalProfile(savedDraft, false);
      await saveProfilePolish(user.id, {
        ...polish,
        bannerPath,
        legacyLocation: savedDraft.city,
        pendingBannerBase64: null,
        pendingBannerMimeType: null,
        obsoleteBannerPath: polish.obsoleteBannerPath,
      });
      await refreshProfileStatus();
      showSuccess(uploadedAvatar ? 'Profile updated. Profile photo uploaded.' : 'Profile updated.');
      router.replace('/profile');
    } catch (error) {
      setFeedback(formatProfileError(error));
    } finally {
      submissionRef.current = false;
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading profile editor" />;
  }

  if (!draft || !polish) {
    return (
      <Screen centered>
        <Text style={styles.error}>{feedback ?? 'Your profile could not be loaded.'}</Text>
        <Button label="Go back" onPress={() => router.back()} variant="secondary" />
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Close profile editor"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons color={theme.colors.text} name="close" size={24} />
        </Pressable>
        <Text style={styles.title}>Edit profile</Text>
        <View style={styles.iconPlaceholder} />
      </View>

      <FormSection
        description="The details people use to recognize and find you."
        title="Basic information">
        <BasicProfileFields
          draft={draft}
          onChange={setDraft}
          onError={setFeedback}
          showAdultConfirmation={false}
          showLocation={false}
        />
      </FormSection>

      <FormSection
        description="Keep this concise and useful rather than resume-heavy."
        title="Professional identity">
        <ProfessionalProfileFields
          draft={draft}
          onChange={setDraft}
          onError={setFeedback}
        />
      </FormSection>

      <FormSection description="All links are optional." title="External links">
        <ProfileLinksFields draft={draft} onChange={setDraft} onError={setFeedback} />
      </FormSection>

      <ProfilePolishEditor
        displayName={draft.displayName}
        onChange={setPolish}
        onError={setFeedback}
        polish={polish}
      />

      {feedback ? <Text style={styles.error}>{feedback}</Text> : null}
      {isSaving && draft.localAvatarBase64 ? (
        <Text style={styles.uploading}>Uploading profile photo...</Text>
      ) : null}
      <Button label="Save changes" loading={isSaving} onPress={saveProfile} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xxl,
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
  iconPlaceholder: {
    height: 44,
    width: 44,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.heading,
  },
  error: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderColor: 'rgba(255,107,107,0.24)',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    padding: theme.spacing.md,
    textAlign: 'center',
  },
  uploading: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
});
