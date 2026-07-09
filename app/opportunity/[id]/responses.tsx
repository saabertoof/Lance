import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileAvatar, formatInboxTime } from '@/components/communication';
import { OpportunityFunnelCard } from '@/components/opportunity';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { captureClientError } from '@/lib/clientMonitoring';
import {
  COMMUNICATION_PAGE_SIZE,
  formatCommunicationError,
  loadOpportunityResponses,
  markOpportunityResponsesViewed,
  startOpportunityConversation,
  updateOpportunityResponse,
} from '@/lib/communication';
import { loadPublicProfilesByIds } from '@/lib/discovery';
import {
  formatOpportunityError,
  loadOpportunity,
} from '@/lib/opportunity';
import { routes } from '@/lib/routes';
import type { OpportunityResponseRecord } from '@/types/communication';
import type { OpportunityRecord } from '@/types/opportunity';
import {
  availabilityOptions,
  experienceOptions,
  getOptionLabel,
  type PublicProfile,
} from '@/types/profile';

export default function OpportunityResponsesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess } = useFeedback();
  const actionRef = useRef(false);
  const [opportunity, setOpportunity] = useState<OpportunityRecord | null>(null);
  const [responses, setResponses] = useState<OpportunityResponseRecord[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, PublicProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpportunity(null);
    setResponses([]);
    setProfilesById({});
    setActiveActionId(null);
    setHasMore(false);
    setError(null);
    setIsLoading(true);
  }, [id]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const opportunityResult = await loadOpportunity(id);
      setOpportunity(opportunityResult);
      if (opportunityResult.ownerProfileId !== user?.id) return;
      const responseResult = await loadOpportunityResponses({
        direction: 'received',
        opportunityId: id,
      });
      setResponses(responseResult);
      setHasMore(responseResult.length === COMMUNICATION_PAGE_SIZE);
      await loadApplicantProfiles(responseResult, false);
      await markOpportunityResponsesViewed({ opportunityId: id });
    } catch (loadError) {
      captureClientError(loadError, 'opportunity_applicants_load');
      setError(
        formatCommunicationError(loadError) || formatOpportunityError(loadError),
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await loadOpportunityResponses({
        direction: 'received',
        opportunityId: id,
        offset: responses.length,
      });
      setResponses((current) => [...current, ...result]);
      setHasMore(result.length === COMMUNICATION_PAGE_SIZE);
      await loadApplicantProfiles(result, true);
    } catch (loadError) {
      captureClientError(loadError, 'opportunity_applicants_more');
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function loadApplicantProfiles(
    responseResult: OpportunityResponseRecord[],
    merge: boolean,
  ) {
    const profileIds = [
      ...new Set(responseResult.map((response) => response.responderProfileId)),
    ];

    if (profileIds.length === 0) {
      if (!merge) setProfilesById({});
      return;
    }

    try {
      const profiles = await loadPublicProfilesByIds(profileIds);
      const nextProfiles = Object.fromEntries(
        profiles.map((profile) => [profile.id, profile]),
      );
      setProfilesById((current) => (merge ? { ...current, ...nextProfiles } : nextProfiles));
    } catch {
      if (!merge) setProfilesById({});
    }
  }

  async function beginDiscussion(response: OpportunityResponseRecord) {
    if (actionRef.current) return;
    actionRef.current = true;
    setActiveActionId(`${response.id}:discussion`);
    setError(null);

    try {
      const conversationId = await startOpportunityConversation(response.id);
      showSuccess('Conversation started.');
      router.push(routes.conversation(conversationId));
    } catch (startError) {
      captureClientError(startError, 'opportunity_applicant_discussion');
      setError(formatCommunicationError(startError));
    } finally {
      actionRef.current = false;
      setActiveActionId(null);
    }
  }

  function confirmPass(response: OpportunityResponseRecord) {
    Alert.alert(
      'Pass on this applicant?',
      'This moves the application out of your active review list. The applicant can see that it was not selected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pass',
          style: 'destructive',
          onPress: () => void passApplicant(response),
        },
      ],
    );
  }

  async function passApplicant(response: OpportunityResponseRecord) {
    if (actionRef.current) return;
    actionRef.current = true;
    setActiveActionId(`${response.id}:pass`);
    setError(null);

    try {
      await updateOpportunityResponse(response.id, 'decline');
      setResponses((current) =>
        current.map((item) =>
          item.id === response.id ? { ...item, status: 'declined' } : item,
        ),
      );
      showSuccess('Applicant marked as passed.');
    } catch (updateError) {
      captureClientError(updateError, 'opportunity_applicant_pass');
      setError(formatCommunicationError(updateError));
    } finally {
      actionRef.current = false;
      setActiveActionId(null);
    }
  }

  if (isLoading) return <LoadingState message="Loading applicants" />;
  const isOwner = opportunity?.ownerProfileId === user?.id;
  const summary = getResponseSummary(responses);

  return (
    <Screen
      onRefresh={() => void load()}
      refreshing={isLoading}
      scroll
      contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Applicants</Text>
        <View style={styles.iconButton} />
      </View>
      {opportunity ? (
        <View style={styles.context}>
          <View style={styles.contextCopy}>
            <Text style={styles.contextLabel}>Opportunity</Text>
            <Text numberOfLines={2} style={styles.contextTitle}>
              {opportunity.title}
            </Text>
            <Text style={styles.contextBody}>
              Review reusable Lance profiles from people who came through your link.
            </Text>
          </View>
          <View style={styles.totalPill}>
            <Text style={styles.totalValue}>{responses.length}</Text>
            <Text style={styles.totalLabel}>applied</Text>
          </View>
        </View>
      ) : null}
      {isOwner && responses.length > 0 ? (
        <View style={styles.summaryRow}>
          <SummaryPill label="Fresh" value={summary.newCount} />
          <SummaryPill label="Ready" value={summary.activeCount} />
          <SummaryPill label="Talking" value={summary.discussionCount} />
        </View>
      ) : null}
      {isOwner && opportunity?.status === 'published' ? (
        <OpportunityFunnelCard opportunityId={opportunity.id} />
      ) : null}
      {error ? (
        <View style={styles.errorPanel}>
          <Text style={styles.error}>{error}</Text>
          <Button label="Try again" onPress={() => void load()} variant="secondary" />
        </View>
      ) : null}
      {!isOwner ? (
        <EmptyState
          title="Owner access only"
          body="Only the opportunity owner can review these responses."
        />
      ) : responses.length > 0 ? (
        <View style={styles.applicantList}>
          {responses.map((response) => (
            <ApplicantCard
              activeActionId={activeActionId}
              key={response.id}
              onOpenApplication={() => router.push(routes.opportunityResponse(response.id))}
              onOpenConversation={() =>
                response.conversationId
                  ? router.push(routes.conversation(response.conversationId))
                  : undefined
              }
              onOpenProfile={() => router.push(routes.profile(response.responderProfileId))}
              onPass={() => confirmPass(response)}
              onStartDiscussion={() => void beginDiscussion(response)}
              profile={profilesById[response.responderProfileId]}
              response={response}
            />
          ))}
          {hasMore ? (
            <Button
              label="Load more responses"
              loading={isLoadingMore}
              onPress={() => void loadMore()}
              variant="ghost"
            />
          ) : null}
        </View>
      ) : (
        <EmptyState
          title="No applications yet"
          body="Applications will appear here after people apply with their Lance profile. Private saves never appear."
        />
      )}
    </Screen>
  );
}

function ApplicantCard({
  activeActionId,
  onOpenApplication,
  onOpenConversation,
  onOpenProfile,
  onPass,
  onStartDiscussion,
  profile,
  response,
}: {
  activeActionId: string | null;
  onOpenApplication: () => void;
  onOpenConversation: () => void;
  onOpenProfile: () => void;
  onPass: () => void;
  onStartDiscussion: () => void;
  profile?: PublicProfile;
  response: OpportunityResponseRecord;
}) {
  const isNew = !response.ownerViewedAt;
  const profileScore = profile ? profileCompleteness(profile) : null;
  const location = profile?.polish.location?.label ?? profile?.city ?? response.responder.city;
  const availability = profile
    ? getOptionLabel(availabilityOptions, profile.availability)
    : null;
  const experience = profile
    ? getOptionLabel(experienceOptions, profile.experienceLevel)
    : null;
  const portfolioCount = profile?.polish.portfolio.length ?? 0;
  const linkCount = profile
    ? profile.links.length + profile.polish.customLinks.length
    : 0;
  const primarySkills =
    response.selectedSkills.length > 0
      ? response.selectedSkills.map((skill) => skill.name)
      : profile?.skills.slice(0, 4) ?? [];

  return (
    <View style={styles.applicantCard}>
      <View style={styles.cardTop}>
        <Pressable
          accessibilityLabel={`Open ${response.responder.displayName}'s profile`}
          accessibilityRole="button"
          onPress={onOpenProfile}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}>
          <ProfileAvatar profile={response.responder} size={62} />
        </Pressable>
        <View style={styles.personCopy}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.name}>
              {response.responder.displayName}
            </Text>
            {isNew ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.roleLine}>
            {[response.responder.primaryRole, location].filter(Boolean).join(' · ') ||
              'Lance applicant'}
          </Text>
          <Text style={styles.sentAt}>Applied {formatInboxTime(response.createdAt)}</Text>
        </View>
        <StatusBadge status={response.status} />
      </View>

      {response.note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Why they fit</Text>
          <Text numberOfLines={4} style={styles.noteText}>
            {response.note}
          </Text>
        </View>
      ) : null}

      <View style={styles.factGrid}>
        {availability ? <Fact icon="time-outline" label={availability} /> : null}
        {experience ? <Fact icon="sparkles-outline" label={experience} /> : null}
        {profileScore != null ? (
          <Fact icon="person-circle-outline" label={`Profile ${profileScore}%`} />
        ) : null}
        {portfolioCount > 0 ? (
          <Fact icon="images-outline" label={`${portfolioCount} portfolio`} />
        ) : null}
        {linkCount > 0 ? <Fact icon="link-outline" label={`${linkCount} links`} /> : null}
      </View>

      {primarySkills.length > 0 ? (
        <View style={styles.skillRow}>
          {primarySkills.slice(0, 5).map((skill) => (
            <View key={skill.toLowerCase()} style={styles.skillChip}>
              <Text numberOfLines={1} style={styles.skillText}>
                {skill}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {response.portfolioTitle ? (
        <View style={styles.portfolioPreview}>
          {response.portfolioMediaUrl ? (
            <Image source={response.portfolioMediaUrl} style={styles.portfolioImage} />
          ) : (
            <View style={styles.portfolioIcon}>
              <Ionicons
                color={theme.colors.accentStrong}
                name="folder-open-outline"
                size={20}
              />
            </View>
          )}
          <View style={styles.portfolioCopy}>
            <Text style={styles.portfolioLabel}>Shared work</Text>
            <Text numberOfLines={1} style={styles.portfolioTitle}>
              {response.portfolioTitle}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <CardAction icon="person-outline" label="Profile" onPress={onOpenProfile} />
        <CardAction icon="document-text-outline" label="Application" onPress={onOpenApplication} />
        {response.status === 'submitted' ? (
          <>
            <CardAction
              icon="paper-plane-outline"
              label="Message"
              loading={activeActionId === `${response.id}:discussion`}
              onPress={onStartDiscussion}
              primary
            />
            <CardAction
              icon="close-outline"
              label="Pass"
              loading={activeActionId === `${response.id}:pass`}
              onPress={onPass}
              subtle
            />
          </>
        ) : null}
        {response.status === 'in_discussion' && response.conversationId ? (
          <CardAction
            icon="chatbubble-ellipses-outline"
            label="Conversation"
            onPress={onOpenConversation}
            primary
          />
        ) : null}
      </View>
    </View>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: OpportunityResponseRecord['status'] }) {
  const tone = statusTone(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
      <Text style={[styles.statusText, { color: tone.text }]}>{statusLabel(status)}</Text>
    </View>
  );
}

function Fact({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons color={theme.colors.textSoft} name={icon} size={14} />
      <Text numberOfLines={1} style={styles.factText}>
        {label}
      </Text>
    </View>
  );
}

function CardAction({
  icon,
  label,
  loading,
  onPress,
  primary,
  subtle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
  primary?: boolean;
  subtle?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardAction,
        primary && styles.cardActionPrimary,
        subtle && styles.cardActionSubtle,
        pressed && !loading && styles.pressed,
        loading && styles.disabled,
      ]}>
      <Ionicons
        color={primary ? theme.colors.white : subtle ? theme.colors.muted : theme.colors.text}
        name={loading ? 'hourglass-outline' : icon}
        size={15}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.cardActionText,
          primary && styles.cardActionTextPrimary,
          subtle && styles.cardActionTextSubtle,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function getResponseSummary(responses: OpportunityResponseRecord[]) {
  return {
    activeCount: responses.filter((response) => response.status === 'submitted').length,
    discussionCount: responses.filter((response) => response.status === 'in_discussion')
      .length,
    newCount: responses.filter((response) => !response.ownerViewedAt).length,
  };
}

function profileCompleteness(profile: PublicProfile) {
  const checks = [
    Boolean(profile.avatarUrl),
    Boolean(profile.headline),
    Boolean(profile.bio),
    Boolean(profile.primaryRole),
    Boolean(profile.polish.location?.label ?? profile.city),
    profile.skills.length > 0,
    profile.polish.portfolio.length > 0,
    profile.links.length + profile.polish.customLinks.length > 0,
    profile.polish.currentIntents.length > 0,
  ];
  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

function statusLabel(status: OpportunityResponseRecord['status']) {
  if (status === 'submitted') return 'Applied';
  if (status === 'in_discussion') return 'In discussion';
  if (status === 'declined') return 'Passed';
  if (status === 'withdrawn') return 'Withdrawn';
  return 'Closed';
}

function statusTone(status: OpportunityResponseRecord['status']) {
  if (status === 'submitted') {
    return { background: theme.colors.accentSoft, text: theme.colors.accentStrong };
  }
  if (status === 'in_discussion') {
    return { background: 'rgba(52,216,112,0.12)', text: theme.colors.success };
  }
  if (status === 'declined') {
    return { background: theme.colors.chip, text: theme.colors.muted };
  }
  return { background: 'rgba(245,158,11,0.12)', text: '#F4BE65' };
}

const styles = StyleSheet.create({
  screen: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  title: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  context: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.lg, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.lg, ...theme.shadows.card },
  contextCopy: { flex: 1, gap: 3, minWidth: 0 },
  contextLabel: { color: theme.colors.accentStrong, fontSize: theme.typography.tiny, fontWeight: '800', textTransform: 'uppercase' },
  contextTitle: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '900' },
  contextBody: { color: theme.colors.muted, fontSize: theme.typography.tiny, lineHeight: 18 },
  totalPill: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.md, minWidth: 58, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  totalValue: { color: theme.colors.accentStrong, fontSize: theme.typography.heading, fontWeight: '900' },
  totalLabel: { color: theme.colors.accentStrong, fontSize: theme.typography.caption, fontWeight: '800', textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', gap: theme.spacing.sm },
  summaryPill: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, borderRadius: theme.radii.md, borderWidth: 1, flex: 1, gap: 2, paddingVertical: theme.spacing.sm },
  summaryValue: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  summaryLabel: { color: theme.colors.muted, fontSize: theme.typography.caption, fontWeight: '800' },
  applicantList: { gap: theme.spacing.md },
  applicantCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.lg, borderWidth: 1, gap: theme.spacing.md, padding: theme.spacing.md, ...theme.shadows.card },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  avatarButton: { borderRadius: theme.radii.pill },
  personCopy: { flex: 1, gap: 3, minWidth: 0 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  name: { color: theme.colors.text, flex: 1, fontSize: theme.typography.body, fontWeight: '900' },
  roleLine: { color: theme.colors.textSoft, fontSize: theme.typography.small, fontWeight: '700' },
  sentAt: { color: theme.colors.muted, fontSize: theme.typography.caption, fontWeight: '700' },
  newBadge: { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill, paddingHorizontal: 8, paddingVertical: 4 },
  newBadgeText: { color: theme.colors.white, fontSize: 10, fontWeight: '900' },
  statusBadge: { borderRadius: theme.radii.pill, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: theme.typography.caption, fontWeight: '900' },
  noteBox: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md, gap: theme.spacing.xs, padding: theme.spacing.md },
  noteLabel: { color: theme.colors.muted, fontSize: theme.typography.caption, fontWeight: '900', textTransform: 'uppercase' },
  noteText: { color: theme.colors.textSoft, fontSize: theme.typography.small, lineHeight: 20 },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  fact: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.pill, flexDirection: 'row', gap: 5, maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 7 },
  factText: { color: theme.colors.textSoft, flexShrink: 1, fontSize: theme.typography.caption, fontWeight: '800' },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  skillChip: { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.pill, maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 7 },
  skillText: { color: theme.colors.accentStrong, fontSize: theme.typography.caption, fontWeight: '900' },
  portfolioPreview: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md, flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.sm },
  portfolioImage: { borderRadius: theme.radii.sm, height: 46, width: 46 },
  portfolioIcon: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.sm, height: 46, justifyContent: 'center', width: 46 },
  portfolioCopy: { flex: 1, gap: 2, minWidth: 0 },
  portfolioLabel: { color: theme.colors.muted, fontSize: theme.typography.caption, fontWeight: '800' },
  portfolioTitle: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '900' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  cardAction: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, borderRadius: theme.radii.pill, borderWidth: 1, flexDirection: 'row', gap: 5, minHeight: theme.layout.minTouchTarget, paddingHorizontal: 12 },
  cardActionPrimary: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  cardActionSubtle: { backgroundColor: 'transparent' },
  cardActionText: { color: theme.colors.text, fontSize: theme.typography.caption, fontWeight: '900' },
  cardActionTextPrimary: { color: theme.colors.white },
  cardActionTextSubtle: { color: theme.colors.muted },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.68 },
  errorPanel: { gap: theme.spacing.sm },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20 },
});
