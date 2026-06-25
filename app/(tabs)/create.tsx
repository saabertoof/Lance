import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  CreatePathGrid,
  CreateStudioSkeleton,
  DraftContinuation,
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
import { routes } from '@/lib/routes';

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

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await loadCreateStudioSummary(user.id);
    setSummary(result);
    setIsLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) return undefined;

      setIsLoading(true);
      loadCreateStudioSummary(user.id)
        .then((result) => {
          if (active) setSummary(result);
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });

      return () => {
        active = false;
      };
    }, [user]),
  );

  return (
    <Screen compact scroll contentStyle={styles.screen}>
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(280)}
        style={styles.intro}>
        <Text style={styles.eyebrow}>CREATE STUDIO</Text>
        <Text style={styles.title}>What are you building?</Text>
        <Text style={styles.subtitle}>
          Post an opportunity, launch a project, or create a home for your business.
        </Text>
      </Animated.View>

      <CreatePathGrid
        onBusiness={() => router.push(routes.newBusinessFor('startup'))}
        onJob={() => router.push(routes.newOpportunity())}
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
            onJob={(id) => router.push(routes.opportunity(id))}
            onManageBusinesses={() => router.push(routes.businesses)}
            onManageJobs={() => router.push(routes.opportunities)}
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
    gap: theme.spacing.xl,
  },
  intro: {
    gap: theme.spacing.xs,
  },
  eyebrow: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.screenHeading,
    fontWeight: '800',
    lineHeight: 29,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.bodySmall,
    lineHeight: 20,
    maxWidth: 440,
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
