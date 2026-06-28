import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CreatePathGrid,
  CreateStudioSkeleton,
  DraftContinuation,
  PromptLinkBuilder,
  YourCreations,
} from '@/components/create';
import { Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAdaptiveTabBar } from '@/context/AdaptiveTabBarContext';
import {
  loadCreateStudioSummary,
  type CreateStudioSummary,
} from '@/lib/createStudio';
import { applyMagicOpportunityDraft } from '@/lib/opportunityMagicDraft';
import { loadPersonalProfile } from '@/lib/profile';
import { routes } from '@/lib/routes';
import { createEmptyOpportunityDraft } from '@/types/opportunity';

const emptySummary: CreateStudioSummary = {
  businesses: [],
  drafts: [],
  failedSections: [],
  opportunities: [],
};

export default function CreateScreen() {
  const { user } = useAuth();
  const { reduceMotion } = useAdaptiveTabBar();
  const [summary, setSummary] = useState<CreateStudioSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [posterName, setPosterName] = useState('Your Lance profile');
  const [posterImageUrl, setPosterImageUrl] = useState<string | null>(null);

  const previewDraft = useMemo(() => {
    const base = createEmptyOpportunityDraft();
    const prompt = ideaPrompt.trim();

    if (prompt.length >= 12) {
      return applyMagicOpportunityDraft(prompt, base);
    }

    base.title = 'Short-form editor for a creator launch';
    base.shortSummary =
      'A clean opportunity link for a hungry editor, builder, or collaborator.';
    base.category = 'video_editing';
    base.skills = ['Short-form editing', 'CapCut', 'YouTube Shorts'];
    base.industry = 'Creator Economy';
    base.workplace = 'remote';
    return base;
  }, [ideaPrompt]);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const [result, profile] = await Promise.all([
      loadCreateStudioSummary(user.id),
      loadPersonalProfile(user.id, user.email ?? null).catch(() => null),
    ]);
    setSummary(result);
    setPosterName(profile?.displayName ?? 'Your Lance profile');
    setPosterImageUrl(profile?.avatarUrl ?? null);
    setIsLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) return undefined;

      setIsLoading(true);
      Promise.all([
        loadCreateStudioSummary(user.id),
        loadPersonalProfile(user.id, user.email ?? null).catch(() => null),
      ])
        .then(([result, profile]) => {
          if (active) {
            setSummary(result);
            setPosterName(profile?.displayName ?? 'Your Lance profile');
            setPosterImageUrl(profile?.avatarUrl ?? null);
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });

      return () => {
        active = false;
      };
    }, [user]),
  );

  function draftFromPrompt() {
    const prompt = ideaPrompt.trim();
    if (prompt.length < 12) return;
    router.push(routes.newOpportunity(undefined, prompt));
  }

  return (
    <Screen compact scroll contentStyle={styles.screen}>
      <PromptLinkBuilder
        onDraft={draftFromPrompt}
        onPromptChange={setIdeaPrompt}
        onUseExample={setIdeaPrompt}
        posterImageUrl={posterImageUrl}
        posterName={posterName}
        previewDraft={previewDraft}
        prompt={ideaPrompt}
        reduceMotion={reduceMotion}
      />
      <CreatePathGrid
        onBusiness={() => router.push(routes.newBusinessFor('startup'))}
        onOpportunity={() => router.push(routes.newOpportunity())}
        onProject={() => router.push(routes.newBusinessFor('project'))}
        reduceMotion={reduceMotion}
      />

      {isLoading ? <CreateStudioSkeleton /> : null}

      {!isLoading ? (
        <>
          <DraftContinuation
            drafts={summary.drafts}
            onOpen={(id) => router.push(routes.editOpportunity(id))}
          />
          <YourCreations
            businesses={summary.businesses}
            onBusiness={(id) => router.push(routes.business(id))}
            onOpportunity={(id) => router.push(routes.opportunity(id))}
            onManageBusinesses={() => router.push(routes.businesses)}
            onManageOpportunities={() => router.push(routes.opportunities)}
            opportunities={summary.opportunities}
          />
        </>
      ) : null}

      {summary.failedSections.length > 0 && !isLoading ? (
        <View style={styles.loadError}>
          <Text style={styles.loadErrorText}>
            Some recent creations could not be loaded. Your creation tools are
            still available.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={({ pressed }) => [
              styles.retry,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.density.sectionGap,
  },
  loadError: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  loadErrorText: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: theme.typography.label,
    lineHeight: 17,
  },
  retry: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.sm,
  },
  retryLabel: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.65,
  },
});
