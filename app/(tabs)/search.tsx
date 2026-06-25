import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import {
  AskLanceSheet,
  MatchReasons,
  SaveSearchSheet,
  SearchPlanReview,
} from '@/components/search';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useSaved } from '@/context/SavedContext';
import { useSearchAlerts } from '@/context/SearchAlertsContext';
import {
  formatDiscoveryError,
  loadSkillOptions,
  SEARCH_PAGE_SIZE,
  searchBusinesses,
  searchOpportunities,
  searchPeople,
} from '@/lib/discovery';
import { routes } from '@/lib/routes';
import {
  loadAlertSchedulerStatus,
  loadSavedSearch,
  markSavedSearchOpened,
  saveSearch,
} from '@/lib/searchPhase6';
import {
  getPlanMatchReasons,
  planToSearchState,
  removeSearchPlanChip,
  searchStateToPlan,
  suggestedSearchName,
  type SearchExecutionState,
  type SearchPlanChip,
} from '@/lib/searchPlan';
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
import type { SearchPlanV1 } from '../../supabase/functions/_shared/search-plan';

const searchModes = [
  { label: 'People', value: 'people' },
  { label: 'Opportunities', value: 'opportunities' },
  { label: 'Businesses', value: 'businesses' },
] as const;

const placeholders: Record<SearchMode, string> = {
  people: 'Search people, roles, skills, or location',
  opportunities: 'Search opportunities, skills, or creators',
  businesses: 'Search businesses, projects, or industries',
};

export default function SearchScreen() {
  const { savedSearchId, savedSearchRun } = useLocalSearchParams<{
    savedSearchId?: string;
    savedSearchRun?: string;
  }>();
  const { user } = useAuth();
  const { showSuccess, showWarning } = useFeedback();
  const { unreadCount: alertUnreadCount } = useSearchAlerts();
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
  const [askOpen, setAskOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<SearchPlanV1 | null>(null);
  const [originalNaturalQuery, setOriginalNaturalQuery] = useState<
    string | null
  >(null);
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const openedSavedSearch = useRef<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    loadSkillOptions().then(setSkillOptions).catch(() => undefined);
    loadAlertSchedulerStatus()
      .then(setSchedulerEnabled)
      .catch(() => setSchedulerEnabled(false));
  }, []);

  useEffect(() => {
    const id = Array.isArray(savedSearchId) ? savedSearchId[0] : savedSearchId;
    const run = Array.isArray(savedSearchRun)
      ? savedSearchRun[0]
      : savedSearchRun;
    const loadKey = `${id ?? ''}:${run ?? ''}`;
    if (!id || openedSavedSearch.current === loadKey) return;
    openedSavedSearch.current = loadKey;
    loadSavedSearch(id)
      .then((saved) => {
        if (!saved) throw new Error('Saved search not found.');
        applySearchPlan(saved.filterPlan, saved.originalQuery);
        return markSavedSearchOpened(saved.id);
      })
      .then(() => showSuccess('Saved search loaded.'))
      .catch(() => showWarning('That saved search could not be loaded.'));
  }, [savedSearchId, savedSearchRun, showSuccess, showWarning]);

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

  function currentSearchState(
    overrides: Partial<SearchExecutionState> = {},
  ): SearchExecutionState {
    return {
      mode,
      query,
      peopleFilters,
      opportunityFilters,
      businessFilters,
      ...overrides,
    };
  }

  function applySearchPlan(plan: SearchPlanV1, originalQuery: string | null) {
    const state = planToSearchState(plan);
    setMode(state.mode);
    setQuery(state.query);
    setPeopleFilters(state.peopleFilters);
    setOpportunityFilters(state.opportunityFilters);
    setBusinessFilters(state.businessFilters);
    setActivePlan(plan);
    setOriginalNaturalQuery(originalQuery);
  }

  function updateActivePlan(state: SearchExecutionState) {
    if (!activePlan) return;
    setActivePlan(searchStateToPlan(state, originalNaturalQuery));
  }

  function handleModeChange(nextMode: SearchMode) {
    setMode(nextMode);
    setActivePlan(null);
    setOriginalNaturalQuery(null);
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    updateActivePlan(currentSearchState({ query: nextQuery }));
  }

  function removePlanChip(chip: SearchPlanChip) {
    if (!activePlan) return;
    const nextPlan = removeSearchPlanChip(activePlan, chip.id);
    applySearchPlan(nextPlan, originalNaturalQuery);
  }

  function clearActiveFilters() {
    if (mode === 'people') {
      const next = { ...emptyPeopleFilters };
      setPeopleFilters(next);
      updateActivePlan(currentSearchState({ peopleFilters: next }));
    }
    else if (mode === 'opportunities') {
      const next = { ...emptyOpportunityFilters };
      setOpportunityFilters(next);
      updateActivePlan(currentSearchState({ opportunityFilters: next }));
    } else {
      const next = { ...emptyBusinessFilters };
      setBusinessFilters(next);
      updateActivePlan(currentSearchState({ businessFilters: next }));
    }
  }

  async function handleSaveSearch(
    name: string,
    alertFrequency: 'paused' | 'daily' | 'weekly',
  ) {
    const state = currentSearchState();
    const plan =
      activePlan ?? searchStateToPlan(state, originalNaturalQuery);
    await saveSearch({
      alertFrequency,
      name,
      originalQuery: originalNaturalQuery,
      plan,
      state,
    });
    showSuccess(
      alertFrequency === 'paused'
        ? 'Search saved.'
        : `${alertFrequency === 'daily' ? 'Daily' : 'Weekly'} opportunity alert enabled.`,
    );
  }

  return (
    <Screen compact scroll contentStyle={styles.screen}>
      <View style={styles.controls}>
        <SearchBar
          onChangeText={handleQueryChange}
          placeholder={placeholders[mode]}
          value={query}
        />
        <Pressable
          accessibilityLabel="Ask Lance"
          accessibilityRole="button"
          onPress={() => setAskOpen(true)}
          style={({ pressed }) => [
            styles.iconButton,
            styles.askButton,
            pressed && styles.pressed,
          ]}>
          <Ionicons
            color={theme.colors.accentStrong}
            name="sparkles"
            size={20}
          />
        </Pressable>
        <FilterButton
          compact
          count={activeCount}
          onPress={() => setFiltersOpen(true)}
        />
      </View>
      <SegmentedControl
        onChange={handleModeChange}
        options={searchModes}
        value={mode}
      />

      <View style={styles.searchActions}>
        <Pressable
          accessibilityLabel="Save this search"
          accessibilityRole="button"
          onPress={() => setSaveOpen(true)}
          style={({ pressed }) => [
            styles.compactAction,
            pressed && styles.pressed,
          ]}>
          <Ionicons
            color={theme.colors.text}
            name="bookmark-outline"
            size={17}
          />
          <Text style={styles.compactActionText}>Save search</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={
            alertUnreadCount > 0
              ? `Saved searches and alerts, ${alertUnreadCount} unread opportunity alerts`
              : 'Saved searches and alerts'
          }
          accessibilityRole="button"
          onPress={() => router.push(routes.savedSearches)}
          style={({ pressed }) => [
            styles.compactAction,
            pressed && styles.pressed,
          ]}>
          <View>
            <Ionicons
              color={theme.colors.text}
              name="notifications-outline"
              size={17}
            />
            {alertUnreadCount > 0 ? (
              <View style={styles.alertDot}>
                <Text style={styles.alertDotText}>
                  {Math.min(alertUnreadCount, 99)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.compactActionText}>Saved & alerts</Text>
        </Pressable>
      </View>

      {activePlan ? (
        <SearchPlanReview onRemove={removePlanChip} plan={activePlan} />
      ) : null}

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
              <MatchReasons
                reasons={getPlanMatchReasons(activePlan, profile)}
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
              <MatchReasons
                reasons={getPlanMatchReasons(activePlan, opportunity)}
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
            <View key={business.id} style={styles.resultGroup}>
              <BusinessCard
                business={business}
                onPress={() => router.push(routes.business(business.id))}
                showDrafts={false}
              />
              <MatchReasons
                reasons={getPlanMatchReasons(activePlan, business)}
              />
            </View>
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
        onApplyBusiness={(next) => {
          setBusinessFilters(next);
          updateActivePlan(currentSearchState({ businessFilters: next }));
        }}
        onApplyOpportunity={(next) => {
          setOpportunityFilters(next);
          updateActivePlan(currentSearchState({ opportunityFilters: next }));
        }}
        onApplyPeople={(next) => {
          setPeopleFilters(next);
          updateActivePlan(currentSearchState({ peopleFilters: next }));
        }}
        onClose={() => setFiltersOpen(false)}
        opportunityFilters={opportunityFilters}
        peopleFilters={peopleFilters}
        skillOptions={skillOptions}
        visible={filtersOpen}
      />
      <AskLanceSheet
        mode={mode}
        onApply={(plan, originalQuery) =>
          applySearchPlan(plan, originalQuery)
        }
        onClose={() => setAskOpen(false)}
        visible={askOpen}
      />
      <SaveSearchSheet
        canAlert={mode === 'opportunities'}
        initialName={suggestedSearchName(currentSearchState())}
        onClose={() => setSaveOpen(false)}
        onSave={handleSaveSearch}
        schedulerEnabled={schedulerEnabled}
        visible={saveOpen}
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
    gap: theme.density.contentGap,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  askButton: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: '#D8CEFF',
  },
  searchActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  compactAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
  },
  compactActionText: {
    color: theme.colors.text,
    fontSize: theme.typography.label,
    fontWeight: '700',
  },
  alertDot: {
    alignItems: 'center',
    backgroundColor: '#E34949',
    borderColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 16,
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -8,
    top: -7,
  },
  alertDotText: {
    color: theme.colors.white,
    fontSize: 8,
    fontWeight: '900',
  },
  resultCount: {
    color: theme.colors.muted,
    fontSize: theme.typography.label,
  },
  results: {
    gap: theme.density.contentGap,
  },
  resultGroup: {
    gap: theme.spacing.sm,
  },
  state: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  pressed: {
    opacity: 0.72,
  },
});
