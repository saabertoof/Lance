import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BasicProfileFields,
  ProfileLinksFields,
  ProfessionalProfileFields,
  ProfilePreviewCard,
  SelectableOption,
  StepProgress,
} from '@/components/profile';
import { Button, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  formatProfileError,
  loadPersonalProfile,
  normalizeProfileLinks,
  profileToDraft,
  savePersonalProfile,
  uploadAvatar,
  validateProfileDraft,
} from '@/lib/profile';
import {
  loadProfilePolish,
  saveProfileBannerPath,
  uploadBanner,
  validateProfileImage,
} from '@/lib/profilePolish';
import { createEmptyProfileDraft, intentOptions, ProfileDraft } from '@/types/profile';

const TOTAL_STEPS = 6;

type BannerDraft = {
  base64: string | null;
  mimeType: string | null;
  obsoletePath: string | null;
  path: string | null;
  uri: string | null;
};

export default function OnboardingScreen() {
  const { refreshProfileStatus, user } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    createEmptyProfileDraft(
      user?.user_metadata.display_name ?? user?.email?.split('@')[0] ?? '',
    ),
  );
  const [isPreparing, setIsPreparing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bannerDraft, setBannerDraft] = useState<BannerDraft>({
    base64: null,
    mimeType: null,
    obsoletePath: null,
    path: null,
    uri: null,
  });

  useEffect(() => {
    let active = true;

    async function prepareProfile() {
      if (!user) {
        return;
      }

      try {
        const [existing, polish] = await Promise.all([
          loadPersonalProfile(user.id, user.email ?? null),
          loadProfilePolish(user.id),
        ]);

        if (active && existing) {
          setDraft(profileToDraft(existing));
        }
        if (active) {
          setBannerDraft({
            base64: null,
            mimeType: null,
            obsoletePath: null,
            path: polish.bannerPath,
            uri: polish.bannerUrl,
          });
        }
      } catch (error) {
        if (active) {
          setFeedback(formatProfileError(error));
        }
      } finally {
        if (active) {
          setIsPreparing(false);
        }
      }
    }

    void prepareProfile();

    return () => {
      active = false;
    };
  }, [user]);

  function showError(message: string) {
    setFeedback(message);
  }

  async function chooseBanner() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [3, 1],
        base64: true,
        mediaTypes: ['images'],
        quality: 0.82,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      validateProfileImage(asset);
      setBannerDraft({
        base64: asset.base64 ?? null,
        mimeType: asset.mimeType ?? null,
        obsoletePath: bannerDraft.path,
        path: bannerDraft.path,
        uri: asset.uri,
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'The banner could not be selected.');
    }
  }

  function continueToNextStep() {
    setFeedback(null);

    if (step === 2) {
      if (draft.displayName.trim().length < 2) {
        return showError('Enter your display name.');
      }
      if (!/^[a-z0-9_]{3,24}$/.test(draft.username)) {
        return showError('Use a unique username with 3-24 lowercase letters, numbers, or underscores.');
      }
      if (draft.city.trim().length < 2) {
        return showError('Choose a city and country.');
      }
      if (!bannerDraft.uri && !bannerDraft.path) {
        return showError('Choose a profile banner so your profile has a real first impression.');
      }
      if (!draft.confirmedAdult) {
        return showError('Confirm that you are at least 18 to continue.');
      }
    }

    if (step === 3) {
      const validationError = validateProfileDraft(draft, true);

      if (validationError) {
        return showError(validationError);
      }
    }

    if (step === 4) {
      try {
        setDraft({ ...draft, links: normalizeProfileLinks(draft.links) });
      } catch (error) {
        return showError(error instanceof Error ? error.message : 'Check your profile links.');
      }
    }

    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  }

  async function completeProfile() {
    if (!user) {
      setFeedback('Your session expired. Sign in again to complete your profile.');
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const normalizedLinks = normalizeProfileLinks(draft.links);
      let avatarUrl = draft.avatarUrl;
      let bannerPath = bannerDraft.path;

      if (draft.localAvatarBase64) {
        avatarUrl = await uploadAvatar(user.id, draft.localAvatarBase64);
      }

      if (bannerDraft.base64) {
        bannerPath = await uploadBanner(
          user.id,
          bannerDraft.base64,
          bannerDraft.mimeType ?? 'image/jpeg',
        );
      }

      await savePersonalProfile(
        {
          ...draft,
          avatarUrl,
          links: normalizedLinks,
        },
        true,
      );
      if (bannerPath) {
        await saveProfileBannerPath(user.id, bannerPath, bannerDraft.obsoletePath);
      }
      await refreshProfileStatus();
      router.replace('/discover');
    } catch (error) {
      setFeedback(formatProfileError(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (isPreparing) {
    return <LoadingState message="Loading your profile" />;
  }

  return (
    <Screen scroll contentStyle={styles.screen}>
      <StepProgress current={step + 1} total={TOTAL_STEPS} />
      <View style={styles.content}>{renderStep()}</View>
      {feedback ? <Text style={styles.error}>{feedback}</Text> : null}
      <View style={styles.actions}>
        {step > 0 ? (
          <Button
            disabled={isSaving}
            label={step === 5 ? 'Edit basics' : 'Back'}
            onPress={() => setStep((current) => (current === 5 ? 2 : current - 1))}
            variant="ghost"
          />
        ) : null}
        <Button
          label={step === 5 ? 'Start using Lance' : 'Continue'}
          loading={isSaving}
          onPress={step === 5 ? completeProfile : continueToNextStep}
          style={styles.primaryAction}
        />
      </View>
    </Screen>
  );

  function renderStep() {
    if (step === 0) {
      return (
        <View style={styles.welcome}>
          <Image
            accessibilityLabel="Lance"
            contentFit="contain"
            source={require('../../assets/images/lance_wordmark_dark.png')}
            style={styles.logo}
          />
          <Text style={styles.display}>Find people worth building with.</Text>
          <Text style={styles.subtitle}>
            Tell Lance what you do. We will use it to match you with people and
            opportunities worth your time.
          </Text>
        </View>
      );
    }

    if (step === 1) {
      return (
        <>
          <StepHeader
            title="What are you here for?"
            subtitle="Pick the main reason you are here today. You can still explore everything."
          />
          <View style={styles.optionList}>
            {intentOptions.map((option) => (
              <SelectableOption
                key={option.value}
                label={option.label}
                onPress={() => setDraft({ ...draft, primaryIntent: option.value })}
                selected={draft.primaryIntent === option.value}
              />
            ))}
          </View>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <StepHeader
            title="Who are you?"
            subtitle="A simple identity people can recognize when you apply, connect, or post."
          />
          <BasicProfileFields draft={draft} onChange={setDraft} onError={showError} />
          <OnboardingBannerPicker
            imageUri={bannerDraft.uri}
            onChoose={() => void chooseBanner()}
          />
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <StepHeader
            title="What can you do?"
            subtitle="Add the skills and open-to signals Lance should use for discovery."
          />
          <ProfessionalProfileFields draft={draft} onChange={setDraft} onError={showError} />
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <StepHeader
            title="Add links"
            subtitle="Optional. Add only the places that help someone understand your work."
          />
          <ProfileLinksFields draft={draft} onChange={setDraft} onError={showError} />
        </>
      );
    }

    return (
      <>
        <StepHeader
          title="Looks good for now"
          subtitle="You can keep improving this later from your Profile tab."
        />
        <ProfilePreviewCard profile={draft} />
        {isSaving ? <Text style={styles.uploading}>Saving your profile, photo, and banner...</Text> : null}
      </>
    );
  }
}

function OnboardingBannerPicker({
  imageUri,
  onChoose,
}: {
  imageUri: string | null;
  onChoose: () => void;
}) {
  return (
    <View style={styles.bannerBlock}>
      <View style={styles.bannerHeader}>
        <Text style={styles.bannerTitle}>Profile banner</Text>
        <Text style={styles.bannerRequired}>Required</Text>
      </View>
      <Pressable
        accessibilityLabel={imageUri ? 'Replace profile banner' : 'Choose profile banner'}
        accessibilityRole="button"
        onPress={onChoose}
        style={({ pressed }) => [styles.bannerPicker, pressed && styles.pressed]}>
        {imageUri ? (
          <Image contentFit="cover" source={imageUri} style={styles.bannerImage} />
        ) : (
          <View style={styles.bannerEmpty}>
            <Text style={styles.bannerEmptyMark}>L</Text>
            <Text style={styles.bannerEmptyText}>Choose a wide image</Text>
          </View>
        )}
      </Pressable>
      <Text style={styles.bannerHint}>
        This sits behind your profile photo when people discover or review your profile.
      </Text>
    </View>
  );
}

function StepHeader({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  content: {
    gap: theme.spacing.xl,
  },
  welcome: {
    gap: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  logo: {
    height: 42,
    width: 140,
  },
  display: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.display,
    lineHeight: 42,
  },
  header: {
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.title,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  optionList: {
    gap: theme.spacing.md,
  },
  bannerBlock: {
    gap: theme.spacing.sm,
  },
  bannerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bannerTitle: {
    color: theme.colors.textSoft,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  bannerRequired: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.tiny,
  },
  bannerPicker: {
    aspectRatio: 3,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bannerImage: {
    height: '100%',
    width: '100%',
  },
  bannerEmpty: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    flex: 1,
    gap: theme.spacing.xs,
    justifyContent: 'center',
  },
  bannerEmptyMark: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familySemiBold,
    fontSize: 38,
  },
  bannerEmptyText: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
  },
  bannerHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  primaryAction: {
    flex: 1,
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
  },
  uploading: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
