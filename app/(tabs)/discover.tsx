import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import {
  ConnectSheet,
  ExpressInterestSheet,
} from '@/components/communication';
import {
  DiscoverDeck,
  FilterButton,
  FilterModal,
  OpportunityDiscoverCard,
  PersonCard,
  SegmentedControl,
  type DiscoverDeckAction,
} from '@/components/discovery';
import { Button, EmptyState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useSaved } from '@/context/SavedContext';
import {
  DISCOVER_BATCH_SIZE,
  formatDiscoveryError,
  loadSkillOptions,
  searchOpportunities,
  searchPeople,
} from '@/lib/discovery';
import { loadPersonalProfile } from '@/lib/profile';
import { loadProfilePolish } from '@/lib/profilePolish';
import {
  getOpportunityRecommendationReasons,
  getPersonRecommendationReasons,
} from '@/lib/recommendations';
import { routes } from '@/lib/routes';
import {
  countOpportunityFilters,
  countPeopleFilters,
  emptyBusinessFilters,
  emptyOpportunityFilters,
  emptyPeopleFilters,
  type DiscoverMode,
  type OpportunityFilters,
  type PeopleFilters,
} from '@/types/discovery';
import type { OpportunityRecord } from '@/types/opportunity';
import type { PersonalProfile, PublicProfile } from '@/types/profile';
import type { ProfilePolish } from '@/types/profilePolish';

const discoverModes = [
  { label: 'People', value: 'people' },
  { label: 'Jobs', value: 'opportunities' },
] as const;

type LastPass =
  | { mode: 'people'; item: PublicProfile }
  | { mode: 'opportunities'; item: OpportunityRecord };

export default function DiscoverScreen() {
  const { user } = useAuth();
  const { showWarning } = useFeedback();
  const { isOpportunitySaved, isProfileSaved, setOpportunitySaved, setProfileSaved } =
    useSaved();
  const [mode, setMode] = useState<DiscoverMode>('people');
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [viewer, setViewer] = useState<PersonalProfile | null>(null);
  const [viewerPolish, setViewerPolish] = useState<ProfilePolish | null>(null);
  const [lastPass, setLastPass] = useState<LastPass | null>(null);
  const [peopleFilters, setPeopleFilters] = useState<PeopleFilters>({ ...emptyPeopleFilters });
  const [opportunityFilters, setOpportunityFilters] =
    useState<OpportunityFilters>({ ...emptyOpportunityFilters });
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectTarget, setConnectTarget] = useState<PublicProfile | null>(null);
  const [interestTarget, setInterestTarget] = useState<OpportunityRecord | null>(null);
  const offsets = useRef({ people: 0, opportunities: 0 });
  const totals = useRef({ people: 0, opportunities: 0 });
  const seen = useRef({ people: new Set<string>(), opportunities: new Set<string>() });
  const requestId = useRef(0);
  const jiggledModes = useRef(new Set<DiscoverMode>());

  useEffect(() => {
    loadSkillOptions().then(setSkillOptions).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      loadPersonalProfile(user.id, user.email ?? null),
      loadProfilePolish(user.id),
    ])
      .then(([profile, polish]) => {
        setViewer(profile);
        setViewerPolish(polish);
      })
      .catch(() => undefined);
  }, [user]);

  const loadDeck = useCallback(
    async (targetMode: DiscoverMode, reset: boolean) => {
      const activeRequest = ++requestId.current;
      if (reset) {
        setIsLoading(true);
        setError(null);
        setLastPass(null);
        offsets.current[targetMode] = 0;
        totals.current[targetMode] = 0;
        seen.current[targetMode].clear();
        if (targetMode === 'people') setPeople([]);
        else setOpportunities([]);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const offset = offsets.current[targetMode];
        if (targetMode === 'people') {
          const result = await searchPeople('', peopleFilters, offset, DISCOVER_BATCH_SIZE);
          if (activeRequest !== requestId.current) return;
          const fresh = result.items.filter((item) => !seen.current.people.has(item.id));
          offsets.current.people += DISCOVER_BATCH_SIZE;
          totals.current.people = result.total;
          setPeople((current) => (reset ? fresh : [...current, ...fresh]));
        } else {
          const result = await searchOpportunities(
            '',
            opportunityFilters,
            offset,
            DISCOVER_BATCH_SIZE,
            true,
          );
          if (activeRequest !== requestId.current) return;
          const fresh = result.items.filter(
            (item) => !seen.current.opportunities.has(item.id),
          );
          offsets.current.opportunities += DISCOVER_BATCH_SIZE;
          totals.current.opportunities = result.total;
          setOpportunities((current) => (reset ? fresh : [...current, ...fresh]));
        }
      } catch (loadError) {
        if (activeRequest === requestId.current) setError(formatDiscoveryError(loadError));
      } finally {
        if (activeRequest === requestId.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [opportunityFilters, peopleFilters],
  );

  useEffect(() => {
    void loadDeck(mode, true);
  }, [loadDeck, mode]);

  useEffect(() => {
    const next =
      mode === 'people'
        ? people[1]?.polish.portfolio.find(
            (item) =>
              item.itemType === 'image' &&
              (item.thumbnailUrl || item.mediaUrl),
          )?.thumbnailUrl ??
          people[1]?.polish.portfolio.find(
            (item) => item.itemType === 'image' && item.mediaUrl,
          )?.mediaUrl ??
          people[1]?.polish.bannerUrl ??
          people[1]?.avatarUrl
        : opportunities[1]?.poster.imageUrl;
    if (next) void Image.prefetch(next);
  }, [mode, opportunities, people]);

  useEffect(() => {
    if (!lastPass) return;
    const timeout = setTimeout(() => setLastPass(null), 4600);
    return () => clearTimeout(timeout);
  }, [lastPass]);

  function advance() {
    if (mode === 'people') {
      const current = people[0];
      if (current) seen.current.people.add(current.id);
      const next = people.slice(1);
      setPeople(next);
      if (next.length < 4 && offsets.current.people < totals.current.people && !isLoadingMore) {
        void loadDeck('people', false);
      }
    } else {
      const current = opportunities[0];
      if (current) seen.current.opportunities.add(current.id);
      const next = opportunities.slice(1);
      setOpportunities(next);
      if (
        next.length < 4 &&
        offsets.current.opportunities < totals.current.opportunities &&
        !isLoadingMore
      ) {
        void loadDeck('opportunities', false);
      }
    }
  }

  async function handleAction(action: DiscoverDeckAction) {
    if (mode === 'people') {
      const current = people[0];
      if (!current) return false;
      if (action === 'openDetail') {
        router.push(routes.profile(current.id));
        return true;
      }
      if (action === 'primaryAction') {
        setConnectTarget(current);
        return true;
      }
      if (action === 'share') {
        try {
          await Share.share({
            message: [
              `Meet ${current.displayName} on Lance.`,
              current.username ? `@${current.username}` : '',
              current.headline,
            ]
              .filter(Boolean)
              .join(' '),
          });
          return true;
        } catch {
          showWarning('This profile could not be shared. Try again.');
          return false;
        }
      }
      if (action === 'pass') {
        setLastPass({ mode: 'people', item: current });
        return true;
      }
      return setProfileSaved(current.id, true);
    }

    const current = opportunities[0];
    if (!current) return false;
    if (action === 'openDetail') {
      router.push(routes.opportunity(current.id));
      return true;
    }
    if (action === 'primaryAction') {
      setInterestTarget(current);
      return true;
    }
    if (action === 'share') {
      try {
        const link = current.slug
          ? `https://lance.app/o/${current.slug}`
          : null;
        await Share.share({
          message: [
            `${current.title} at ${current.poster.name}.`,
            current.shortSummary,
            link,
          ]
            .filter(Boolean)
            .join(' '),
        });
        return true;
      } catch {
        showWarning('This job could not be shared. Try again.');
        return false;
      }
    }
    if (action === 'pass') {
      setLastPass({ mode: 'opportunities', item: current });
      return true;
    }
    return setOpportunitySaved(current.id, true);
  }

  function undoLastPass() {
    if (!lastPass || lastPass.mode !== mode) return;
    if (lastPass.mode === 'people') {
      seen.current.people.delete(lastPass.item.id);
      setPeople((current) => [
        lastPass.item,
        ...current.filter((item) => item.id !== lastPass.item.id),
      ]);
    } else {
      seen.current.opportunities.delete(lastPass.item.id);
      setOpportunities((current) => [
        lastPass.item,
        ...current.filter((item) => item.id !== lastPass.item.id),
      ]);
    }
    setLastPass(null);
  }

  const currentPerson = people[0];
  const nextPerson = people[1];
  const currentOpportunity = opportunities[0];
  const nextOpportunity = opportunities[1];
  const filterCount =
    mode === 'people'
      ? countPeopleFilters(peopleFilters)
      : countOpportunityFilters(opportunityFilters);

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.markSlot}>
          <Image
            accessibilityLabel="Lance"
            contentFit="contain"
            source={require('../../assets/images/lance_icon_transparent.png')}
            style={styles.mark}
          />
        </View>
        <View style={styles.mode}>
          <SegmentedControl onChange={setMode} options={discoverModes} value={mode} />
        </View>
        <FilterButton
          compact
          count={filterCount}
          onPress={() => setFiltersOpen(true)}
        />
      </View>

      <View style={styles.deckArea}>
        {isLoading ? <DiscoverSkeleton /> : null}
        {!isLoading && error ? (
          <View style={styles.state}>
            <EmptyState body={error} title="Discover is unavailable" />
            <Button label="Retry" onPress={() => void loadDeck(mode, true)} />
          </View>
        ) : null}
        {!isLoading && !error && mode === 'people' && currentPerson ? (
          <DiscoverDeck
            key="people-discover"
            canUndo={lastPass?.mode === 'people'}
            cardKey={currentPerson.id}
            detailLabel="profile details"
            isSaved={isProfileSaved(currentPerson.id)}
            onJiggleComplete={() => jiggledModes.current.add('people')}
            primaryActionLabel="Connect"
            shouldJiggle={!jiggledModes.current.has('people')}
            nextCard={
              nextPerson ? (
                <PersonCard
                  discover
                  isSaved={isProfileSaved(nextPerson.id)}
                  onPress={() => undefined}
                  onSave={() => undefined}
                  profile={nextPerson}
                />
              ) : undefined
            }
            onAction={handleAction}
            onDismiss={advance}
            onUndo={undoLastPass}>
            <PersonCard
              discover
              isSaved={isProfileSaved(currentPerson.id)}
              onPress={() => undefined}
              onSave={() => undefined}
              profile={currentPerson}
              reasons={getPersonRecommendationReasons(viewer, viewerPolish, currentPerson)}
            />
          </DiscoverDeck>
        ) : null}
        {!isLoading && !error && mode === 'opportunities' && currentOpportunity ? (
          <DiscoverDeck
            key="jobs-discover"
            canUndo={lastPass?.mode === 'opportunities'}
            cardKey={currentOpportunity.id}
            detailLabel="job details"
            isSaved={isOpportunitySaved(currentOpportunity.id)}
            onJiggleComplete={() => jiggledModes.current.add('opportunities')}
            primaryActionLabel="Apply"
            shouldJiggle={!jiggledModes.current.has('opportunities')}
            nextCard={
              nextOpportunity ? (
                <OpportunityDiscoverCard
                  isSaved={isOpportunitySaved(nextOpportunity.id)}
                  opportunity={nextOpportunity}
                />
              ) : undefined
            }
            onAction={handleAction}
            onDismiss={advance}
            onUndo={undoLastPass}>
            <OpportunityDiscoverCard
              isSaved={isOpportunitySaved(currentOpportunity.id)}
              opportunity={currentOpportunity}
              reasons={getOpportunityRecommendationReasons(
                viewer,
                viewerPolish,
                currentOpportunity,
              )}
            />
          </DiscoverDeck>
        ) : null}
        {!isLoading &&
        !error &&
        ((mode === 'people' && !currentPerson) ||
          (mode === 'opportunities' && !currentOpportunity)) ? (
          <View style={styles.state}>
            <EmptyState
              body={`There are no more ${
                mode === 'people' ? 'people' : 'jobs'
              } in this session with the current filters.`}
              title="You are caught up"
            />
            <Button label="Adjust filters" onPress={() => setFiltersOpen(true)} variant="secondary" />
            <Button
              label={`Switch to ${mode === 'people' ? 'jobs' : 'people'}`}
              onPress={() => setMode(mode === 'people' ? 'opportunities' : 'people')}
              variant="ghost"
            />
            <Button label="Refresh session" onPress={() => void loadDeck(mode, true)} />
          </View>
        ) : null}
      </View>

      <FilterModal
        businessFilters={emptyBusinessFilters}
        mode={mode}
        onApplyBusiness={() => undefined}
        onApplyOpportunity={setOpportunityFilters}
        onApplyPeople={setPeopleFilters}
        onClose={() => setFiltersOpen(false)}
        opportunityFilters={opportunityFilters}
        peopleFilters={peopleFilters}
        skillOptions={skillOptions}
        visible={filtersOpen}
      />
      <ConnectSheet
        onClose={() => setConnectTarget(null)}
        onSuccess={() => {
          setConnectTarget(null);
          advance();
        }}
        profile={connectTarget}
        visible={Boolean(connectTarget)}
      />
      <ExpressInterestSheet
        onClose={() => setInterestTarget(null)}
        onSuccess={() => {
          setInterestTarget(null);
          advance();
        }}
        opportunity={interestTarget}
        visible={Boolean(interestTarget)}
      />
    </Screen>
  );
}

function DiscoverSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonMedia} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: '58%' }]} />
        <View style={[styles.skeletonLine, { width: '84%' }]} />
        <View style={[styles.skeletonLine, { width: '70%' }]} />
        <View style={styles.skeletonFill} />
      </View>
      <Text style={styles.loadingText}>Finding a strong next fit...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 46,
  },
  mark: {
    height: 32,
    width: 32,
  },
  markSlot: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  mode: {
    flex: 1,
  },
  deckArea: {
    flex: 1,
    minHeight: 480,
  },
  state: { flex: 1, gap: theme.spacing.sm, justifyContent: 'center' },
  skeleton: { backgroundColor: '#252630', borderColor: theme.colors.border, borderRadius: theme.radii.lg, borderWidth: 1, flex: 1, overflow: 'hidden' },
  skeletonMedia: { backgroundColor: '#30313B', flex: 1 },
  skeletonBody: { bottom: 56, gap: theme.spacing.md, left: 0, padding: theme.spacing.lg, position: 'absolute', right: 0 },
  skeletonLine: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 6, height: 16 },
  skeletonFill: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: theme.radii.sm, height: 56, marginTop: theme.spacing.sm },
  loadingText: { bottom: theme.spacing.lg, color: theme.colors.muted, fontSize: theme.typography.tiny, position: 'absolute', textAlign: 'center', width: '100%' },
});
