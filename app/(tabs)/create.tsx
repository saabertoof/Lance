import { Ionicons } from '@expo/vector-icons';
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
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAdaptiveTabBar } from '@/context/AdaptiveTabBarContext';
import { useFeedback } from '@/context/FeedbackContext';
import {
  loadCreateStudioSummary,
  type CreateStudioSummary,
} from '@/lib/createStudio';
import {
  clearLocalOpportunityDraft,
  loadLocalOpportunityDraft,
} from '@/lib/localOpportunityDraft';
import { applyMagicOpportunityDraft } from '@/lib/opportunityMagicDraft';
import { loadPersonalProfile } from '@/lib/profile';
import { routes } from '@/lib/routes';
import {
  createEmptyOpportunityDraft,
  type OpportunityDraft,
} from '@/types/opportunity';

const emptySummary: CreateStudioSummary = {
  businesses: [],
  drafts: [],
  failedSections: [],
  opportunities: [],
};

export default function CreateScreen() {
  const { user } = useAuth();
  const { reduceMotion } = useAdaptiveTabBar();
  const { showSuccess, showWarning } = useFeedback();
  const [summary, setSummary] = useState<CreateStudioSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [posterName, setPosterName] = useState('Your Lance profile');
  const [posterImageUrl, setPosterImageUrl] = useState<string | null>(null);
  const [localDraft, setLocalDraft] = useState<OpportunityDraft | null>(null);

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
    const [result, profile, recovered] = await Promise.all([
      loadCreateStudioSummary(user.id),
      loadPersonalProfile(user.id, user.email ?? null).catch(() => null),
      loadLocalOpportunityDraft(user.id),
    ]);
    setSummary(result);
    setPosterName(profile?.displayName ?? 'Your Lance profile');
    setPosterImageUrl(profile?.avatarUrl ?? null);
    setLocalDraft(recovered);
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
        loadLocalOpportunityDraft(user.id),
      ])
        .then(([result, profile, recovered]) => {
          if (active) {
            setSummary(result);
            setPosterName(profile?.displayName ?? 'Your Lance profile');
            setPosterImageUrl(profile?.avatarUrl ?? null);
            setLocalDraft(recovered);
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

  function useMagicDraftShortcut() {
    const prompt = ideaPrompt.trim();
    if (prompt.length >= 12) {
      router.push(routes.newOpportunity(undefined, prompt));
      return;
    }

    setIdeaPrompt(
      'Need a short-form editor for YouTube and TikTok clips, paid per video, remote, CapCut preferred.',
    );
  }

  function openDrafts() {
    const firstDraft = summary.drafts[0];
    if (firstDraft) {
      router.push(routes.editOpportunity(firstDraft.id));
      return;
    }
    router.push(routes.opportunities);
  }

  async function discardLocalDraft() {
    if (!user) return;
    try {
      await clearLocalOpportunityDraft(user.id);
      setLocalDraft(null);
      showSuccess('Local recovery draft removed.');
    } catch {
      showWarning('The local draft could not be removed.');
    }
  }

  return (
    <Screen compact scroll contentStyle={styles.screen} style={styles.canvas}>
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
        draftCount={summary.drafts.length}
        onBusiness={() => router.push(routes.newBusinessFor('startup'))}
        onDrafts={openDrafts}
        onMagicDraft={useMagicDraftShortcut}
        onOpportunity={() => router.push(routes.newOpportunity())}
        reduceMotion={reduceMotion}
      />

      {isLoading ? <CreateStudioSkeleton /> : null}

      {!isLoading ? (
        <>
          {localDraft ? (
            <Pressable
              accessibilityHint="Continues the opportunity saved privately on this device."
              accessibilityLabel="Continue local opportunity draft"
              accessibilityRole="button"
              onPress={() => router.push(routes.newOpportunity())}
              style={({ pressed }) => [
                styles.localDraft,
                pressed && styles.pressed,
              ]}>
              <View style={styles.localDraftIcon}>
                <Ionicons
                  color={v.purpleStrong}
                  name="phone-portrait-outline"
                  size={18}
                />
              </View>
              <View style={styles.localDraftCopy}>
                <Text style={styles.localDraftEyebrow}>Recovered on this device</Text>
                <Text numberOfLines={1} style={styles.localDraftTitle}>
                  {localDraft.title.trim() || 'Unfinished opportunity'}
                </Text>
              </View>
              <Ionicons color={v.purpleStrong} name="chevron-forward" size={17} />
              <Pressable
                accessibilityLabel="Discard local opportunity draft"
                accessibilityRole="button"
                onPress={(event) => {
                  event.stopPropagation();
                  void discardLocalDraft();
                }}
                style={({ pressed }) => [
                  styles.localDraftDiscard,
                  pressed && styles.pressed,
                ]}>
                <Ionicons color={v.muted} name="close" size={17} />
              </Pressable>
            </Pressable>
          ) : null}
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
  canvas: {
    backgroundColor: v.background,
  },
  screen: {
    gap: 18,
    paddingBottom: 104,
    paddingHorizontal: 16,
  },
  loadError: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  localDraft: {
    alignItems: 'center',
    backgroundColor: v.purpleWash,
    borderColor: v.borderPurple,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
  },
  localDraftIcon: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderRadius: 11,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  localDraftCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  localDraftEyebrow: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoMedium,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  localDraftTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  localDraftDiscard: {
    alignItems: 'center',
    borderColor: v.border,
    borderRadius: 11,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  loadErrorText: {
    color: v.textSoft,
    flex: 1,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  retry: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.sm,
  },
  retryLabel: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.65,
  },
});
