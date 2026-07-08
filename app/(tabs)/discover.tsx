import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

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
import { Screen } from '@/components/ui';
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
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
import { getOpportunityShareCopy } from '@/lib/opportunity';
import { getProfilePublicUrl } from '@/lib/publicLinks';
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
  { icon: 'people-outline', label: 'People', value: 'people' },
  { icon: 'briefcase-outline', label: 'Opportunities', value: 'opportunities' },
] as const;

type LastPass =
  | { mode: 'people'; item: PublicProfile }
  | { mode: 'opportunities'; item: OpportunityRecord };

export default function DiscoverScreen() {
  const { user } = useAuth();
  const isFocused = useIsFocused();
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
  const [jiggleTriggers, setJiggleTriggers] = useState<
    Record<DiscoverMode, number>
  >({ opportunities: 0, people: 0 });

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
              getProfilePublicUrl(current),
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
        const share = getOpportunityShareCopy(current);
        await Share.share({
          message: share.nativeMessage,
        });
        return true;
      } catch {
        showWarning('This opportunity could not be shared. Try again.');
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

  useFocusEffect(
    useCallback(() => {
      setJiggleTriggers((current) => ({
        ...current,
        [mode]: current[mode] + 1,
      }));
      return undefined;
    }, [mode]),
  );

  return (
    <Screen compact contentStyle={styles.screen} style={styles.canvas}>
      <View style={styles.header}>
        <View style={styles.markSlot}>
          <Image
            accessibilityLabel="Lance"
            contentFit="contain"
            source={require('../../assets/images/lance_icon_dark.png')}
            style={styles.mark}
          />
        </View>
        <View style={styles.headerSegment}>
          <SegmentedControl
            compact
            onChange={setMode}
            options={discoverModes}
            value={mode}
            variant="operator"
          />
        </View>
        <FilterButton
          compact
          count={filterCount}
          onPress={() => setFiltersOpen(true)}
          variant="operator"
        />
      </View>

      <View style={styles.deckArea}>
        {isLoading ? <DiscoverSkeleton /> : null}
        {!isLoading && error ? (
          <View style={styles.state}>
            <StatePanel
              body={error}
              icon="warning-outline"
              primaryAction={{
                label: 'Retry',
                onPress: () => void loadDeck(mode, true),
              }}
              title="Discover is unavailable"
            />
          </View>
        ) : null}
        {!isLoading && !error && mode === 'people' && currentPerson ? (
          <DiscoverDeck
            active={isFocused}
            key="people-discover"
            canUndo={lastPass?.mode === 'people'}
            cardKey={currentPerson.id}
            detailLabel="profile details"
            isSaved={isProfileSaved(currentPerson.id)}
            jiggleTrigger={jiggleTriggers.people}
            primaryActionLabel="Connect"
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
            active={isFocused}
            key="opportunities-discover"
            canUndo={lastPass?.mode === 'opportunities'}
            cardKey={currentOpportunity.id}
            detailLabel="opportunity details"
            isSaved={isOpportunitySaved(currentOpportunity.id)}
            jiggleTrigger={jiggleTriggers.opportunities}
            primaryActionLabel="Apply"
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
            <StatePanel
              body={
                mode === 'people'
                  ? 'No more builders in this lane. Tune filters or check back soon.'
                  : 'No more opportunities in this lane. Tune filters or check back soon.'
              }
              icon={mode === 'people' ? 'people-outline' : 'briefcase-outline'}
              primaryAction={{
                label: 'Adjust filters',
                onPress: () => setFiltersOpen(true),
              }}
              secondaryAction={{
                label: `Switch to ${mode === 'people' ? 'opportunities' : 'people'}`,
                onPress: () => setMode(mode === 'people' ? 'opportunities' : 'people'),
              }}
              tertiaryAction={{
                label: 'Refresh',
                onPress: () => void loadDeck(mode, true),
              }}
              title={mode === 'people' ? 'No more builders for now.' : 'No opportunities yet.'}
            />
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

function StatePanel({
  body,
  icon,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  title,
}: {
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  primaryAction: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  tertiaryAction?: { label: string; onPress: () => void };
  title: string;
}) {
  return (
    <View style={styles.statePanel}>
      <View style={styles.stateIcon}>
        <Ionicons color={v.purpleStrong} name={icon} size={22} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      <View style={styles.stateActions}>
        <StateButton label={primaryAction.label} onPress={primaryAction.onPress} primary />
        {secondaryAction ? (
          <StateButton label={secondaryAction.label} onPress={secondaryAction.onPress} />
        ) : null}
        {tertiaryAction ? (
          <StateButton label={tertiaryAction.label} onPress={tertiaryAction.onPress} quiet />
        ) : null}
      </View>
    </View>
  );
}

function StateButton({
  label,
  onPress,
  primary,
  quiet,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  quiet?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.stateButton,
        primary && styles.stateButtonPrimary,
        quiet && styles.stateButtonQuiet,
        pressed && styles.pressed,
      ]}>
      <Text
        style={[
          styles.stateButtonText,
          primary && styles.stateButtonPrimaryText,
          quiet && styles.stateButtonQuietText,
        ]}>
        {label}
      </Text>
    </Pressable>
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
  canvas: {
    backgroundColor: v.background,
  },
  screen: {
    gap: 8,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 42,
  },
  mark: {
    height: 32,
    width: 32,
  },
  markSlot: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  headerSegment: {
    flex: 1,
    minWidth: 0,
  },
  deckArea: {
    flex: 1,
    marginTop: 0,
    minHeight: 430,
  },
  state: {
    flex: 1,
    justifyContent: 'center',
  },
  statePanel: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    maxWidth: 340,
    padding: 18,
    width: '100%',
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: 18,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  stateTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  stateBody: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  stateActions: {
    gap: 8,
    marginTop: 2,
    width: '100%',
  },
  stateButton: {
    alignItems: 'center',
    borderColor: v.border,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  stateButtonPrimary: {
    backgroundColor: v.purple,
    borderColor: v.purple,
  },
  stateButtonQuiet: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  stateButtonText: {
    color: v.text,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  stateButtonPrimaryText: {
    color: v.white,
  },
  stateButtonQuietText: {
    color: v.purpleStrong,
  },
  skeleton: {
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  skeletonMedia: { backgroundColor: v.surfaceStrong, flex: 1 },
  skeletonBody: {
    bottom: 56,
    gap: 12,
    left: 0,
    padding: 18,
    position: 'absolute',
    right: 0,
  },
  skeletonLine: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 6, height: 16 },
  skeletonFill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    height: 54,
    marginTop: 4,
  },
  loadingText: {
    bottom: 16,
    color: v.muted,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
    position: 'absolute',
    textAlign: 'center',
    width: '100%',
  },
  pressed: {
    opacity: 0.72,
  },
});
