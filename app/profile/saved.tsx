import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PersonCard, SegmentedControl } from '@/components/discovery';
import { OpportunityCard } from '@/components/opportunity';
import {
  Button,
  CompactPageHeader,
  EmptyState,
  LoadingState,
  Screen,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSaved } from '@/context/SavedContext';
import { routes } from '@/lib/routes';
import {
  loadSavedOpportunities,
  loadSavedProfiles,
  logSavedError,
  SAVED_PAGE_SIZE,
} from '@/lib/saved';
import type { OpportunityRecord } from '@/types/opportunity';
import type { PublicProfile } from '@/types/profile';

type SavedMode = 'people' | 'opportunities';

const modes = [
  { label: 'People', value: 'people' },
  { label: 'Opportunities', value: 'opportunities' },
] as const;

export default function SavedScreen() {
  const { user } = useAuth();
  const {
    isOpportunitySaved,
    isProfileSaved,
    refreshSaved,
    setOpportunitySaved,
    setProfileSaved,
  } = useSaved();
  const [mode, setMode] = useState<SavedMode>('people');
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offsets = useRef({ people: 0, opportunities: 0 });

  const loadAt = useCallback(
    async (offset: number, replace: boolean) => {
      if (!user) return;
      if (replace) setIsLoading(true);
      else setIsLoadingMore(true);
      setError(null);

      try {
        if (mode === 'people') {
          const result = await loadSavedProfiles(user.id, offset);
          setPeople((current) =>
            replace ? result.items : mergeById(current, result.items),
          );
          offsets.current.people = offset + result.requestedCount;
          setHasMore(result.requestedCount === SAVED_PAGE_SIZE);
        } else {
          const result = await loadSavedOpportunities(user.id, offset);
          setOpportunities((current) =>
            replace ? result.items : mergeById(current, result.items),
          );
          offsets.current.opportunities = offset + result.requestedCount;
          setHasMore(result.requestedCount === SAVED_PAGE_SIZE);
        }
      } catch (loadError) {
        logSavedError('load-screen', loadError);
        setError('Saved items could not be loaded. Check your connection and try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [mode, user],
  );

  useFocusEffect(
    useCallback(() => {
      void loadAt(0, true);
    }, [loadAt]),
  );

  async function refresh() {
    setIsRefreshing(true);
    await Promise.all([refreshSaved(), loadAt(0, true)]);
  }

  async function removeProfile(profileId: string) {
    const updated = await setProfileSaved(profileId, false);
    if (updated) setPeople((current) => current.filter((item) => item.id !== profileId));
  }

  async function removeOpportunity(opportunityId: string) {
    const updated = await setOpportunitySaved(opportunityId, false);
    if (updated) {
      setOpportunities((current) =>
        current.filter((item) => item.id !== opportunityId),
      );
    }
  }

  const currentItems = mode === 'people' ? people : opportunities;

  return (
    <Screen
      scroll
      contentStyle={styles.screen}
      onRefresh={() => void refresh()}
      refreshing={isRefreshing}>
      <CompactPageHeader
        eyebrow="Private"
        subtitle="Quietly keep people and opportunities worth returning to."
        title="Saved"
      />
      <SegmentedControl onChange={setMode} options={modes} value={mode} />

      {isLoading ? <LoadingState message={`Loading saved ${mode}`} /> : null}
      {!isLoading && error ? (
        <View style={styles.state}>
          <EmptyState body={error} title="Saved is unavailable" />
          <Button label="Retry" onPress={() => void loadAt(0, true)} />
        </View>
      ) : null}

      {!isLoading && !error && mode === 'people' ? (
        <View style={styles.results}>
          {people.map((profile) => (
            <PersonCard
              isSaved={isProfileSaved(profile.id)}
              key={profile.id}
              onPress={() => router.push(routes.profile(profile.id))}
              onSave={() => void removeProfile(profile.id)}
              profile={profile}
            />
          ))}
        </View>
      ) : null}

      {!isLoading && !error && mode === 'opportunities' ? (
        <View style={styles.results}>
          {opportunities.map((opportunity) => (
            <OpportunityCard
              isSaved={isOpportunitySaved(opportunity.id)}
              key={opportunity.id}
              onPress={() => router.push(routes.opportunity(opportunity.id))}
              onSavePress={() => void removeOpportunity(opportunity.id)}
              opportunity={opportunity}
            />
          ))}
        </View>
      ) : null}

      {!isLoading && !error && currentItems.length === 0 ? (
        <EmptyState
          body="Use Discover or Search to keep useful items close."
          title={mode === 'people' ? 'No saved people yet.' : 'No saved opportunities yet.'}
        />
      ) : null}

      {!isLoading && !error && hasMore ? (
        <Button
          label="Load more"
          loading={isLoadingMore}
          onPress={() => void loadAt(offsets.current[mode], false)}
          variant="secondary"
        />
      ) : null}
    </Screen>
  );
}

function mergeById<T extends { id: string }>(current: T[], next: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
  },
  results: {
    gap: theme.spacing.sm,
  },
  state: {
    gap: theme.spacing.sm,
  },
});
