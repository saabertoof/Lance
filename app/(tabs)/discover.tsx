import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  DiscoverDeck,
  FilterButton,
  FilterModal,
  OpportunityDiscoverCard,
  PersonCard,
  SegmentedControl,
} from '@/components/discovery';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useSaved } from '@/context/SavedContext';
import {
  DISCOVER_BATCH_SIZE,
  formatDiscoveryError,
  loadSkillOptions,
  searchOpportunities,
  searchPeople,
} from '@/lib/discovery';
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
import type { PublicProfile } from '@/types/profile';

const discoverModes = [
  { label: 'People', value: 'people' },
  { label: 'Opportunities', value: 'opportunities' },
] as const;

export default function DiscoverScreen() {
  const {
    isOpportunitySaved,
    isProfileSaved,
    setOpportunitySaved,
    setProfileSaved,
  } = useSaved();
  const [mode, setMode] = useState<DiscoverMode>('people');
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [peopleFilters, setPeopleFilters] = useState<PeopleFilters>({
    ...emptyPeopleFilters,
  });
  const [opportunityFilters, setOpportunityFilters] =
    useState<OpportunityFilters>({ ...emptyOpportunityFilters });
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offsets = useRef({ people: 0, opportunities: 0 });
  const totals = useRef({ people: 0, opportunities: 0 });
  const seen = useRef({
    people: new Set<string>(),
    opportunities: new Set<string>(),
  });
  const requestId = useRef(0);

  useEffect(() => {
    loadSkillOptions().then(setSkillOptions).catch(() => undefined);
  }, []);

  const loadDeck = useCallback(
    async (targetMode: DiscoverMode, reset: boolean) => {
      const activeRequest = ++requestId.current;
      if (reset) {
        setIsLoading(true);
        setError(null);
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
          const result = await searchPeople(
            '',
            peopleFilters,
            offset,
            DISCOVER_BATCH_SIZE,
          );
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
        if (activeRequest === requestId.current) {
          setError(formatDiscoveryError(loadError));
        }
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

  function advance() {
    if (mode === 'people') {
      const current = people[0];
      if (current) seen.current.people.add(current.id);
      const next = people.slice(1);
      setPeople(next);
      if (
        next.length < 4 &&
        offsets.current.people < totals.current.people &&
        !isLoadingMore
      ) {
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

  const currentPerson = people[0];
  const currentOpportunity = opportunities[0];
  const filterCount =
    mode === 'people'
      ? countPeopleFilters(peopleFilters)
      : countOpportunityFilters(opportunityFilters);

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.header}>
        <Image
          accessibilityLabel="Lance"
          contentFit="contain"
          source={require('../../assets/images/lance_wordmark_transparent.png')}
          style={styles.wordmark}
        />
        <FilterButton count={filterCount} onPress={() => setFiltersOpen(true)} />
      </View>
      <SegmentedControl onChange={setMode} options={discoverModes} value={mode} />

      <View style={styles.deckArea}>
        {isLoading ? <LoadingState message={`Finding ${mode}`} /> : null}
        {!isLoading && error ? (
          <View style={styles.state}>
            <EmptyState body={error} title="Discover is unavailable" />
            <Button label="Retry" onPress={() => void loadDeck(mode, true)} />
          </View>
        ) : null}
        {!isLoading && !error && mode === 'people' && currentPerson ? (
          <DiscoverDeck
            cardKey={currentPerson.id}
            onAdvance={advance}
            onOpen={() => router.push(routes.profile(currentPerson.id))}
            onSave={() => setProfileSaved(currentPerson.id, true)}>
            <PersonCard
              discover
              isSaved={isProfileSaved(currentPerson.id)}
              onPress={() => undefined}
              onSave={() => undefined}
              profile={currentPerson}
            />
          </DiscoverDeck>
        ) : null}
        {!isLoading && !error && mode === 'opportunities' && currentOpportunity ? (
          <DiscoverDeck
            cardKey={currentOpportunity.id}
            onAdvance={advance}
            onOpen={() => router.push(routes.opportunity(currentOpportunity.id))}
            onSave={() => setOpportunitySaved(currentOpportunity.id, true)}>
            <OpportunityDiscoverCard
              isSaved={isOpportunitySaved(currentOpportunity.id)}
              opportunity={currentOpportunity}
            />
          </DiscoverDeck>
        ) : null}
        {!isLoading &&
        !error &&
        ((mode === 'people' && !currentPerson) ||
          (mode === 'opportunities' && !currentOpportunity)) ? (
          <View style={styles.state}>
            <EmptyState
              body={`There are no more ${mode} in this session with the current filters.`}
              title="You are caught up"
            />
            <Button
              label="Adjust filters"
              onPress={() => setFiltersOpen(true)}
              variant="secondary"
            />
            <Button
              label={`Switch to ${mode === 'people' ? 'opportunities' : 'people'}`}
              onPress={() =>
                setMode(mode === 'people' ? 'opportunities' : 'people')
              }
              variant="ghost"
            />
            <Button label="Refresh session" onPress={() => void loadDeck(mode, true)} />
          </View>
        ) : null}
      </View>

      <Text style={styles.note}>
        Pass lasts for this Discover session. Save is private and is not an expression of
        interest.
      </Text>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wordmark: {
    height: 34,
    width: 132,
  },
  deckArea: {
    flex: 1,
    minHeight: 520,
  },
  state: {
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: 'center',
  },
  note: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
    textAlign: 'center',
  },
});
