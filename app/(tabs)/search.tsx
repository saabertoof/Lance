import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BusinessCard } from '@/components/business';
import {
  OpportunityInterestAction,
  RelationshipAction,
} from '@/components/communication';
import {
  FilterButton,
  FilterModal,
  PersonCard,
  SearchBar,
  SegmentedControl,
} from '@/components/discovery';
import { OpportunityCard } from '@/components/opportunity';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSaved } from '@/context/SavedContext';
import {
  formatDiscoveryError,
  loadSkillOptions,
  SEARCH_PAGE_SIZE,
  searchBusinesses,
  searchOpportunities,
  searchPeople,
} from '@/lib/discovery';
import { routes } from '@/lib/routes';
import type { BusinessRecord } from '@/types/business';
import {
  countBusinessFilters,
  countOpportunityFilters,
  countPeopleFilters,
  emptyBusinessFilters,
  emptyOpportunityFilters,
  emptyPeopleFilters,
  type BusinessFilters,
  type OpportunityFilters,
  type PeopleFilters,
  type SearchMode,
} from '@/types/discovery';
import type { OpportunityRecord } from '@/types/opportunity';
import type { PublicProfile } from '@/types/profile';

const searchModes = [
  { label: 'People', value: 'people' },
  { label: 'Opportunities', value: 'opportunities' },
  { label: 'Businesses', value: 'businesses' },
] as const;

const placeholders: Record<SearchMode, string> = {
  people: 'Search people, roles, skills, or location',
  opportunities: 'Search opportunities, skills, or posters',
  businesses: 'Search businesses, projects, or industries',
};

export default function SearchScreen() {
  const { user } = useAuth();
  const {
    isOpportunitySaved,
    isProfileSaved,
    setOpportunitySaved,
    setProfileSaved,
  } = useSaved();
  const [mode, setMode] = useState<SearchMode>('people');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [peopleFilters, setPeopleFilters] = useState<PeopleFilters>({
    ...emptyPeopleFilters,
  });
  const [opportunityFilters, setOpportunityFilters] =
    useState<OpportunityFilters>({ ...emptyOpportunityFilters });
  const [businessFilters, setBusinessFilters] = useState<BusinessFilters>({
    ...emptyBusinessFilters,
  });
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    loadSkillOptions().then(setSkillOptions).catch(() => undefined);
  }, []);

  const load = useCallback(
    async (reset: boolean, offset: number) => {
      const activeRequest = ++requestId.current;
      if (reset) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        if (mode === 'people') {
          const result = await searchPeople(
            debouncedQuery,
            peopleFilters,
            offset,
            SEARCH_PAGE_SIZE,
          );
          if (activeRequest !== requestId.current) return;
          setPeople((current) => (reset ? result.items : mergeById(current, result.items)));
          setTotal(result.total);
        } else if (mode === 'opportunities') {
          const result = await searchOpportunities(
            debouncedQuery,
            opportunityFilters,
            offset,
            SEARCH_PAGE_SIZE,
          );
          if (activeRequest !== requestId.current) return;
          setOpportunities((current) =>
            reset ? result.items : mergeById(current, result.items),
          );
          setTotal(result.total);
        } else {
          const result = await searchBusinesses(
            debouncedQuery,
            businessFilters,
            offset,
            SEARCH_PAGE_SIZE,
          );
          if (activeRequest !== requestId.current) return;
          setBusinesses((current) =>
            reset ? result.items : mergeById(current, result.items),
          );
          setTotal(result.total);
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
    [
      businessFilters,
      debouncedQuery,
      mode,
      opportunityFilters,
      peopleFilters,
    ],
  );

  useEffect(() => {
    void load(true, 0);
  }, [load]);

  const activeCount =
    mode === 'people'
      ? countPeopleFilters(peopleFilters)
      : mode === 'opportunities'
        ? countOpportunityFilters(opportunityFilters)
        : countBusinessFilters(businessFilters);
  const currentCount =
    mode === 'people'
      ? people.length
      : mode === 'opportunities'
        ? opportunities.length
        : businesses.length;

  function clearActiveFilters() {
    if (mode === 'people') setPeopleFilters({ ...emptyPeopleFilters });
    else if (mode === 'opportunities') {
      setOpportunityFilters({ ...emptyOpportunityFilters });
    } else {
      setBusinessFilters({ ...emptyBusinessFilters });
    }
  }

  return (
    <Screen scroll contentStyle={styles.screen}>
      <Text style={styles.title}>Search</Text>
      <SegmentedControl onChange={setMode} options={searchModes} value={mode} />

      <View style={styles.controls}>
        <SearchBar
          onChangeText={setQuery}
          placeholder={placeholders[mode]}
          value={query}
        />
        <FilterButton count={activeCount} onPress={() => setFiltersOpen(true)} />
      </View>

      {!isLoading && !error ? (
        <Text style={styles.resultCount}>
          {total === 1 ? '1 result' : `${total} results`}
        </Text>
      ) : null}

      {isLoading ? <LoadingState message={`Searching ${mode}`} /> : null}
      {!isLoading && error ? (
        <View style={styles.state}>
          <EmptyState body={error} title="Search is unavailable" />
          <Button label="Retry" onPress={() => void load(true, 0)} />
        </View>
      ) : null}

      {!isLoading && !error && mode === 'people' ? (
        <View style={styles.results}>
          {people.map((profile) => (
            <View key={profile.id} style={styles.resultGroup}>
              <PersonCard
                isSaved={isProfileSaved(profile.id)}
                onPress={() => router.push(routes.profile(profile.id))}
                onSave={() =>
                  void setProfileSaved(profile.id, !isProfileSaved(profile.id))
                }
                profile={profile}
              />
              <RelationshipAction
                compact
                deferLoad
                onError={setError}
                profile={profile}
              />
            </View>
          ))}
        </View>
      ) : null}

      {!isLoading && !error && mode === 'opportunities' ? (
        <View style={styles.results}>
          {opportunities.map((opportunity) => (
            <View key={opportunity.id} style={styles.resultGroup}>
              <OpportunityCard
                isSaved={isOpportunitySaved(opportunity.id)}
                onPress={() => router.push(routes.opportunity(opportunity.id))}
                onSavePress={
                  opportunity.ownerProfileId === user?.id
                    ? undefined
                    : () =>
                        void setOpportunitySaved(
                          opportunity.id,
                          !isOpportunitySaved(opportunity.id),
                        )
                }
                opportunity={opportunity}
              />
              {opportunity.ownerProfileId !== user?.id ? (
                <OpportunityInterestAction
                  deferLoad
                  onError={setError}
                  opportunity={opportunity}
                />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {!isLoading && !error && mode === 'businesses' ? (
        <View style={styles.results}>
          {businesses.map((business) => (
            <BusinessCard
              business={business}
              key={business.id}
              onPress={() => router.push(routes.business(business.id))}
              showDrafts={false}
            />
          ))}
        </View>
      ) : null}

      {!isLoading && !error && currentCount === 0 ? (
        <View style={styles.state}>
          <EmptyState
            body="Try a broader phrase or clear filters that may be hiding results."
            title="No results"
          />
          {activeCount > 0 ? (
            <Button label="Clear filters" onPress={clearActiveFilters} variant="secondary" />
          ) : null}
        </View>
      ) : null}

      {!isLoading && !error && currentCount < total ? (
        <Button
          label="Load more"
          loading={isLoadingMore}
          onPress={() => void load(false, currentCount)}
          variant="secondary"
        />
      ) : null}

      <FilterModal
        businessFilters={businessFilters}
        mode={mode}
        onApplyBusiness={setBusinessFilters}
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

function mergeById<T extends { id: string }>(current: T[], next: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  resultCount: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  results: {
    gap: theme.spacing.md,
  },
  resultGroup: {
    gap: theme.spacing.sm,
  },
  state: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl,
  },
});
