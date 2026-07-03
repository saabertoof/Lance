import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  OpportunityInterestAction,
  RelationshipAction,
} from '@/components/communication';
import {
  FilterButton,
  FilterModal,
  SearchBar,
  SegmentedControl,
} from '@/components/discovery';
import {
  AskLanceSheet,
  MatchReasons,
  SaveSearchSheet,
  SearchPlanReview,
} from '@/components/search';
import { Button, Screen } from '@/components/ui';
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
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
import { formatCompensation, formatOpportunityLocation } from '@/lib/opportunity';
import {
  getPlanMatchReasons,
  planToSearchState,
  removeSearchPlanChip,
  searchStateToPlan,
  suggestedSearchName,
  type SearchExecutionState,
  type SearchPlanChip,
} from '@/lib/searchPlan';
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
import type { BusinessRecord } from '@/types/business';
import { businessSizeOptions, businessTypeOptions } from '@/types/business';
import {
  OpportunityRecord,
  timeCommitmentOptions,
  workTypeOptions,
} from '@/types/opportunity';
import {
  getOptionLabel,
  remotePreferenceOptions,
  type PublicProfile,
} from '@/types/profile';
import type { SearchPlanV1 } from '../../supabase/functions/_shared/search-plan';

const searchModes = [
  { icon: 'people-outline', label: 'People', value: 'people' },
  { icon: 'briefcase-outline', label: 'Opportunities', value: 'opportunities' },
  { icon: 'business-outline', label: 'Businesses', value: 'businesses' },
] as const;

const placeholders: Record<SearchMode, string> = {
  people: 'Search people, skills, roles...',
  opportunities: 'Search opportunities, creators...',
  businesses: 'Search business profiles...',
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
    <Screen compact scroll contentStyle={styles.screen} style={styles.canvas}>
      <View style={styles.console}>
        <View style={styles.controls}>
        <SearchBar
          onChangeText={handleQueryChange}
          placeholder={placeholders[mode]}
          variant="operator"
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
            color={v.purpleStrong}
            name="sparkles"
            size={18}
          />
        </Pressable>
        <FilterButton
          compact
          count={activeCount}
          onPress={() => setFiltersOpen(true)}
          variant="operator"
        />
        </View>
      </View>
      <SegmentedControl
        onChange={handleModeChange}
        options={searchModes}
        value={mode}
        variant="operator"
      />

      <View style={styles.utilityRow}>
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
            color={v.textSoft}
            name="bookmark-outline"
            size={15}
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
              color={v.textSoft}
              name="notifications-outline"
              size={15}
            />
            {alertUnreadCount > 0 ? (
              <View style={styles.alertDot}>
                <Text style={styles.alertDotText}>
                  {Math.min(alertUnreadCount, 99)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.compactActionText}>Alerts</Text>
        </Pressable>
        </View>
        {!isLoading && !error ? (
          <Text style={styles.resultCount}>
            {total === 1 ? '1 result' : `${total} results`}
          </Text>
        ) : null}
      </View>

      {activePlan ? (
        <SearchPlanReview onRemove={removePlanChip} plan={activePlan} />
      ) : null}

      {isLoading ? <TerminalState loading title={`Searching ${mode}`} /> : null}
      {!isLoading && error ? (
        <View style={styles.state}>
          <TerminalState body={error} icon="warning-outline" title="Search is unavailable" />
          <Button
            label="Retry"
            labelStyle={styles.darkButtonLabel}
            onPress={() => void load(true, 0)}
            style={styles.darkButton}
          />
        </View>
      ) : null}

      {!isLoading && !error && mode === 'people' ? (
        <View style={styles.results}>
          {people.map((profile) => (
            <View key={profile.id} style={styles.resultGroup}>
              <SearchPersonResultCard
                action={
                  <RelationshipAction
                    buttonLabelStyle={styles.resultActionLabel}
                    buttonStyle={styles.resultActionButton}
                    compact
                    deferLoad
                    onError={setError}
                    profile={profile}
                  />
                }
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
            </View>
          ))}
        </View>
      ) : null}

      {!isLoading && !error && mode === 'opportunities' ? (
        <View style={styles.results}>
          {opportunities.map((opportunity) => (
            <View key={opportunity.id} style={styles.resultGroup}>
              <SearchOpportunityResultCard
                action={
                  opportunity.ownerProfileId !== user?.id ? (
                    <OpportunityInterestAction
                      buttonLabelStyle={styles.resultActionLabel}
                      buttonStyle={styles.resultActionButton}
                      deferLoad
                      onError={setError}
                      opportunity={opportunity}
                    />
                  ) : null
                }
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
            </View>
          ))}
        </View>
      ) : null}

      {!isLoading && !error && mode === 'businesses' ? (
        <View style={styles.results}>
          {businesses.map((business) => (
            <View key={business.id} style={styles.resultGroup}>
              <SearchBusinessResultCard
                business={business}
                onPress={() => router.push(routes.business(business.id))}
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
          <TerminalState
            body="Try a broader phrase or clear filters that may be hiding results."
            icon="radio-outline"
            title="No signal yet"
          />
          {activeCount > 0 ? (
            <Button
              label="Clear filters"
              labelStyle={styles.darkButtonLabel}
              onPress={clearActiveFilters}
              style={styles.darkSecondaryButton}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : null}

      {!isLoading && !error && currentCount < total ? (
        <Button
          label="Load more"
          labelStyle={styles.darkButtonLabel}
          loading={isLoadingMore}
          onPress={() => void load(false, currentCount)}
          style={styles.darkSecondaryButton}
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

function SearchPersonResultCard({
  action,
  isSaved,
  onPress,
  onSave,
  profile,
}: {
  action: ReactNode;
  isSaved: boolean;
  onPress: () => void;
  onSave: () => void;
  profile: PublicProfile;
}) {
  const location = profile.polish.location?.label ?? profile.city;
  const remote = getOptionLabel(remotePreferenceOptions, profile.remotePreference);
  const visibleSkills = profile.skills.slice(0, 3);
  const extraSkills = Math.max(profile.skills.length - visibleSkills.length, 0);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.searchCard, pressed && styles.pressed]}>
      <View style={styles.personTop}>
        <AvatarMark
          imageUrl={profile.avatarUrl}
          label={profile.displayName}
          size={50}
        />
        <View style={styles.cardCopy}>
          <View style={styles.nameLine}>
            <Text numberOfLines={1} style={styles.personName}>
              {profile.displayName}
            </Text>
            <Ionicons color={v.purpleStrong} name="checkmark-circle" size={14} />
          </View>
          {profile.username ? (
            <Text numberOfLines={1} style={styles.handle}>
              @{profile.username}
            </Text>
          ) : null}
          <Text numberOfLines={1} style={styles.purpleMeta}>
            {profile.primaryRole || 'Builder'}
          </Text>
        </View>
        <BookmarkControl
          accessibilityLabel={
            isSaved ? `Remove ${profile.displayName} from saved` : `Save ${profile.displayName}`
          }
          isSaved={isSaved}
          onPress={onSave}
        />
      </View>

      {profile.headline ? (
        <Text numberOfLines={2} style={styles.resultBody}>
          {profile.headline}
        </Text>
      ) : null}

      <View style={styles.metaLine}>
        {location ? <MiniMeta icon="location-outline" label={location} /> : null}
        {remote ? <MiniMeta icon="navigate-outline" label={remote} /> : null}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.chipRow}>
          {visibleSkills.map((skill) => (
            <SearchChip key={skill.toLowerCase()} label={skill} />
          ))}
          {extraSkills > 0 ? <SearchChip label={`+${extraSkills}`} /> : null}
        </View>
        <View style={styles.actionSlot}>{action}</View>
      </View>
    </Pressable>
  );
}

function SearchOpportunityResultCard({
  action,
  isSaved,
  onPress,
  onSavePress,
  opportunity,
}: {
  action: ReactNode;
  isSaved: boolean;
  onPress: () => void;
  onSavePress?: () => void;
  opportunity: OpportunityRecord;
}) {
  const mark = opportunity.poster.name.charAt(0).toUpperCase() || 'L';
  const skill = opportunity.skills[0];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.searchCard, styles.opportunityCard, pressed && styles.pressed]}>
      <View style={styles.posterRow}>
        <AvatarMark
          fallback={mark}
          imageUrl={opportunity.poster.imageUrl}
          label={opportunity.poster.name}
          size={42}
        />
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.posterName}>
            {opportunity.poster.name}
          </Text>
          <Text numberOfLines={1} style={styles.handle}>
            {opportunity.poster.identityType === 'business'
              ? 'Business profile'
              : 'Personal profile'}
          </Text>
        </View>
        <View style={styles.hiringPill}>
          <View style={styles.purpleDot} />
          <Text style={styles.hiringText}>Hiring</Text>
        </View>
        {onSavePress ? (
          <BookmarkControl
            accessibilityLabel={
              isSaved ? `Remove ${opportunity.title} from saved` : `Save ${opportunity.title}`
            }
            isSaved={isSaved}
            onPress={onSavePress}
          />
        ) : null}
      </View>

      <Text numberOfLines={2} style={styles.opportunityTitle}>
        {opportunity.title}
      </Text>
      <Text numberOfLines={2} style={styles.resultBody}>
        {opportunity.shortSummary}
      </Text>

      <View style={styles.chipRow}>
        <SearchChip icon="cash-outline" label={formatCompensation(opportunity)} />
        <SearchChip icon="location-outline" label={formatOpportunityLocation(opportunity)} />
        <SearchChip
          icon="time-outline"
          label={getOptionLabel(timeCommitmentOptions, opportunity.timeCommitment)}
        />
        {skill ? <SearchChip accent label={skill} /> : null}
      </View>

      <View style={styles.cardFooter}>
        <Text numberOfLines={1} style={styles.footerMeta}>
          {getOptionLabel(workTypeOptions, opportunity.workType)}
        </Text>
        {action ? <View style={styles.actionSlot}>{action}</View> : null}
      </View>
    </Pressable>
  );
}

function SearchBusinessResultCard({
  business,
  onPress,
}: {
  business: BusinessRecord;
  onPress: () => void;
}) {
  const active = business.status === 'active';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.searchCard, pressed && styles.pressed]}>
      <View style={styles.posterRow}>
        <AvatarMark
          fallback={business.name.charAt(0).toUpperCase()}
          imageUrl={business.logoUrl}
          label={business.name}
          size={46}
          square
        />
        <View style={styles.cardCopy}>
          <View style={styles.nameLine}>
            <Text numberOfLines={1} style={styles.personName}>
              {business.name}
            </Text>
            {active ? <Ionicons color={v.purpleStrong} name="checkmark-circle" size={14} /> : null}
          </View>
          <Text numberOfLines={1} style={styles.handle}>
            @{business.slug}
          </Text>
          <Text numberOfLines={1} style={styles.purpleMeta}>
            {getOptionLabel(businessTypeOptions, business.businessType)}
          </Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{active ? 'Active' : 'Archived'}</Text>
        </View>
        <Ionicons color={v.muted} name="chevron-forward" size={18} />
      </View>

      <Text numberOfLines={2} style={styles.resultBody}>
        {business.shortDescription}
      </Text>
      <View style={styles.chipRow}>
        <SearchChip label={business.industry} />
        <SearchChip label={getOptionLabel(businessSizeOptions, business.businessSize)} />
        {business.location ? <SearchChip icon="location-outline" label={business.location} /> : null}
        {business.activeOpportunityCount > 0 ? (
          <SearchChip accent label={`${business.activeOpportunityCount} active`} />
        ) : null}
      </View>
    </Pressable>
  );
}

function AvatarMark({
  fallback,
  imageUrl,
  label,
  size,
  square,
}: {
  fallback?: string;
  imageUrl: string | null;
  label: string;
  size: number;
  square?: boolean;
}) {
  return (
    <View
      style={[
        styles.avatar,
        {
          borderRadius: square ? 13 : size / 2,
          height: size,
          width: size,
        },
      ]}>
      {imageUrl ? (
        <Image contentFit="cover" source={imageUrl} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarText}>
          {fallback ?? getInitials(label)}
        </Text>
      )}
    </View>
  );
}

function BookmarkControl({
  accessibilityLabel,
  isSaved,
  onPress,
}: {
  accessibilityLabel: string;
  isSaved: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => [styles.bookmark, pressed && styles.pressed]}>
      <Ionicons
        color={isSaved ? v.purpleStrong : v.textSoft}
        name={isSaved ? 'bookmark' : 'bookmark-outline'}
        size={18}
      />
    </Pressable>
  );
}

function SearchChip({
  accent,
  icon,
  label,
}: {
  accent?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={[styles.searchChip, accent && styles.searchChipAccent]}>
      {icon ? <Ionicons color={accent ? v.purpleStrong : v.textSoft} name={icon} size={12} /> : null}
      <Text numberOfLines={1} style={[styles.searchChipText, accent && styles.searchChipTextAccent]}>
        {label}
      </Text>
    </View>
  );
}

function MiniMeta({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.miniMeta}>
      <Ionicons color={v.muted} name={icon} size={13} />
      <Text numberOfLines={1} style={styles.miniMetaText}>
        {label}
      </Text>
    </View>
  );
}

function TerminalState({
  body,
  icon = 'search-outline',
  loading,
  title,
}: {
  body?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  title: string;
}) {
  return (
    <View style={styles.terminalState}>
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator color={v.purpleStrong} />
        ) : (
          <Ionicons color={v.purpleStrong} name={icon} size={19} />
        )}
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {body ? <Text style={styles.stateBody}>{body}</Text> : null}
    </View>
  );
}

function getInitials(value: string) {
  return (
    value
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'L'
  );
}

function mergeById<T extends { id: string }>(current: T[], next: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: v.background,
  },
  screen: {
    gap: 11,
    paddingBottom: 52,
  },
  console: {
    gap: 0,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#0E0E16',
    borderColor: v.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  askButton: {
    backgroundColor: v.purpleWash,
    borderColor: v.borderPurple,
  },
  utilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  searchActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 8,
  },
  compactAction: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 34,
    paddingHorizontal: 11,
  },
  compactActionText: {
    color: v.textSoft,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  alertDot: {
    alignItems: 'center',
    backgroundColor: v.purple,
    borderColor: v.surface,
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 16,
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -8,
    top: -7,
  },
  alertDotText: {
    color: v.white,
    fontSize: 8,
    fontWeight: '600',
  },
  resultCount: {
    color: v.muted,
    fontFamily: operatorFonts.monoMedium,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  results: {
    gap: 10,
  },
  resultGroup: {
    gap: 8,
  },
  searchCard: {
    backgroundColor: v.surface,
    borderColor: v.borderStrong,
    borderRadius: 19,
    borderWidth: 1,
    gap: 10,
    overflow: 'hidden',
    padding: 13,
  },
  opportunityCard: {
    borderColor: v.borderPurple,
  },
  personTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  posterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  cardCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  nameLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minWidth: 0,
  },
  personName: {
    color: v.text,
    flexShrink: 1,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
  },
  posterName: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  handle: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
  },
  purpleMeta: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  resultBody: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  opportunityTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 23,
  },
  metaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    maxWidth: '58%',
  },
  miniMetaText: {
    color: v.textSoft,
    flexShrink: 1,
    fontFamily: operatorFonts.sans,
    fontSize: 11,
  },
  chipRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  searchChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: v.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 26,
    paddingHorizontal: 9,
  },
  searchChipAccent: {
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
  },
  searchChipText: {
    color: v.textSoft,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
  searchChipTextAccent: {
    color: v.purpleStrong,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  footerMeta: {
    color: v.muted,
    flex: 1,
    fontFamily: operatorFonts.monoMedium,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  actionSlot: {
    minWidth: 106,
  },
  resultActionButton: {
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderWidth: 1,
    height: 36,
    minHeight: 36,
    paddingHorizontal: 13,
    paddingVertical: 0,
  },
  resultActionLabel: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
  },
  bookmark: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: v.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  hiringPill: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 26,
    paddingHorizontal: 9,
  },
  purpleDot: {
    backgroundColor: v.purpleStrong,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  hiringText: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  statusText: {
    color: v.textSoft,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
  terminalState: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    padding: 18,
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stateTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
  },
  stateBody: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  darkButton: {
    backgroundColor: v.purple,
    minHeight: 42,
  },
  darkSecondaryButton: {
    backgroundColor: v.surfaceStrong,
    borderColor: v.borderStrong,
    minHeight: 42,
  },
  darkButtonLabel: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  state: {
    gap: 10,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.72,
  },
});
