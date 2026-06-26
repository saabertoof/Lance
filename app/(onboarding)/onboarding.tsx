import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import { createEmptyProfileDraft, intentOptions, ProfileDraft } from '@/types/profile';

const TOTAL_STEPS = 6;

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

  useEffect(() => {
    let active = true;

    async function prepareProfile() {
      if (!user) {
        return;
      }

      try {
        const existing = await loadPersonalProfile(user.id, user.email ?? null);

        if (active && existing) {
          setDraft(profileToDraft(existing));
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
        return showError('Enter a city or general location.');
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

      if (draft.localAvatarBase64) {
        avatarUrl = await uploadAvatar(user.id, draft.localAvatarBase64);
      }

      await savePersonalProfile(
        {
          ...draft,
          avatarUrl,
          links: normalizedLinks,
        },
        true,
      );
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
            source={require('../../assets/images/lance_wordmark_transparent.png')}
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
        {isSaving ? <Text style={styles.uploading}>Saving your profile and photo...</Text> : null}
      </>
    );
  }
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
    fontSize: theme.typography.display,
    fontWeight: '900',
    lineHeight: 42,
  },
  header: {
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
  optionList: {
    gap: theme.spacing.md,
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
    backgroundColor: '#FFF3F3',
    borderColor: '#FFD7D7',
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
});
