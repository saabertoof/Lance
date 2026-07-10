import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileAvatar, SafetySheet } from '@/components/communication';
import {
  Button,
  Card,
  Chip,
  EliteCard,
  EliteSectionHeader,
  EliteSignalPill,
  LoadingState,
  Screen,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import {
  formatCommunicationError,
  loadOpportunityResponse,
  loadRelationshipStatus,
  startOpportunityConversation,
  updateOpportunityResponse,
} from '@/lib/communication';
import { loadPublicProfilesByIds } from '@/lib/discovery';
import { routes } from '@/lib/routes';
import type {
  OpportunityResponseRecord,
  RelationshipStatus,
} from '@/types/communication';
import {
  availabilityOptions,
  experienceOptions,
  getOptionLabel,
  type PublicProfile,
} from '@/types/profile';

export default function OpportunityResponseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess } = useFeedback();
  const submitting = useRef(false);
  const [response, setResponse] = useState<OpportunityResponseRecord | null>(null);
  const [applicantProfile, setApplicantProfile] = useState<PublicProfile | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResponse(null);
    setApplicantProfile(null);
    setRelationship(null);
    setSafetyOpen(false);
    setError(null);
    setIsLoading(true);
  }, [id]);

  useEffect(() => {
    let active = true;
    loadOpportunityResponse(id)
      .then(async (result) => {
        if (!active) return;
        const otherId =
          result.ownerProfileId === user?.id
            ? result.responderProfileId
            : result.ownerProfileId;
        const [relationshipResult, profiles] = await Promise.all([
          loadRelationshipStatus(otherId),
          loadPublicProfilesByIds([result.responderProfileId]).catch(() => []),
        ]);
        if (!active) return;
        setResponse(result);
        setApplicantProfile(profiles[0] ?? null);
        setRelationship(relationshipResult);
      })
      .catch((loadError) => {
        if (active) setError(formatCommunicationError(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, user?.id]);

  async function startDiscussion() {
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const conversationId = await startOpportunityConversation(id);
      showSuccess('Conversation started.');
      router.replace(routes.conversation(conversationId));
    } catch (startError) {
      setError(formatCommunicationError(startError));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  function confirmUpdate(action: 'withdraw' | 'decline' | 'close') {
    const labels = {
      withdraw: 'Withdraw application',
      decline: 'Pass on applicant',
      close: 'Close discussion',
    };
    Alert.alert(`${labels[action]}?`, 'This status change is recorded for both people.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: labels[action],
        style: 'destructive',
        onPress: async () => {
          if (submitting.current) return;
          submitting.current = true;
          setIsSubmitting(true);
          try {
            await updateOpportunityResponse(id, action);
            showSuccess(
              action === 'decline' ? 'Applicant marked as passed.' : `${labels[action]} complete.`,
            );
            router.back();
          } catch (updateError) {
            setError(formatCommunicationError(updateError));
          } finally {
            submitting.current = false;
            setIsSubmitting(false);
          }
        },
      },
    ]);
  }

  if (isLoading) return <LoadingState message="Loading opportunity response" />;
  if (!response || !user) {
    return (
      <Screen centered>
        <Text style={styles.error}>{error ?? 'This response is unavailable.'}</Text>
        <Button label="Go back" onPress={() => router.back()} variant="secondary" />
      </Screen>
    );
  }

  const ownerView = response.ownerProfileId === user.id;
  const otherProfileId = ownerView
    ? response.responderProfileId
    : response.ownerProfileId;
  const location =
    applicantProfile?.polish.location?.label ??
    applicantProfile?.city ??
    response.responder.city;
  const availability = applicantProfile
    ? getOptionLabel(availabilityOptions, applicantProfile.availability)
    : null;
  const experience = applicantProfile
    ? getOptionLabel(experienceOptions, applicantProfile.experienceLevel)
    : null;
  const linkCount = applicantProfile
    ? applicantProfile.links.length + applicantProfile.polish.customLinks.length
    : 0;
  const portfolioCount = applicantProfile?.polish.portfolio.length ?? 0;
  const profileScore = applicantProfile ? profileCompleteness(applicantProfile) : null;
  const skillNames =
    response.selectedSkills.length > 0
      ? response.selectedSkills.map((skill) => skill.name)
      : applicantProfile?.skills.slice(0, 6) ?? [];

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Application</Text>
        <Pressable
          accessibilityLabel="Application safety options"
          onPress={() => setSafetyOpen(true)}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="ellipsis-horizontal" size={22} />
        </Pressable>
      </View>

      <Pressable
        accessibilityLabel={`Open ${response.responder.displayName}'s profile`}
        accessibilityRole="button"
        onPress={() => router.push(routes.profile(response.responder.id))}
        style={({ pressed }) => [styles.profileHero, pressed && styles.pressed]}>
        <View style={styles.profileTop}>
          <ProfileAvatar profile={response.responder} size={74} />
          <View style={styles.profileCopy}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.name}>
                {response.responder.displayName}
              </Text>
              <ResponseStatusBadge status={response.status} />
            </View>
            <Text numberOfLines={1} style={styles.meta}>
              {[response.responder.primaryRole, location].filter(Boolean).join(' · ') ||
                'Lance applicant'}
            </Text>
            {applicantProfile?.headline ? (
              <Text numberOfLines={2} style={styles.headline}>
                {applicantProfile.headline}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.profileFacts}>
          {availability ? <ProfileFact icon="time-outline" label={availability} /> : null}
          {experience ? <ProfileFact icon="sparkles-outline" label={experience} /> : null}
          {profileScore != null ? (
            <ProfileFact icon="person-circle-outline" label={`Profile ${profileScore}%`} />
          ) : null}
          {portfolioCount > 0 ? (
            <ProfileFact icon="images-outline" label={`${portfolioCount} portfolio`} />
          ) : null}
          {linkCount > 0 ? <ProfileFact icon="link-outline" label={`${linkCount} links`} /> : null}
        </View>
      </Pressable>

      <Pressable
        onPress={() => router.push(routes.opportunity(response.opportunityId))}
        style={styles.opportunity}>
        <View style={styles.opportunityCopy}>
          <Text style={styles.opportunityLabel}>Opportunity</Text>
          <Text style={styles.opportunityTitle}>{response.opportunityTitle}</Text>
          <Text style={styles.poster}>{response.posterName}</Text>
        </View>
        <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
      </Pressable>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>
            {ownerView ? 'What they sent' : 'Your application'}
          </Text>
          <Text style={styles.date}>
            Sent {new Date(response.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Why they fit</Text>
          <Text style={styles.body}>
            {response.note || 'No note added. Use the profile, skills, and proof below to review fit.'}
          </Text>
        </View>
        {skillNames.length > 0 ? (
          <View style={styles.skills}>
            {skillNames.map((skill) => (
              <Chip key={skill.toLowerCase()} label={skill} />
            ))}
          </View>
        ) : null}
        {response.portfolioTitle ? (
          <View style={styles.portfolio}>
            {response.portfolioMediaUrl ? (
              <Image source={response.portfolioMediaUrl} style={styles.portfolioImage} />
            ) : (
              <Ionicons
                color={theme.colors.accentStrong}
                name="folder-open-outline"
                size={22}
              />
            )}
            <View style={styles.portfolioCopy}>
              <Text style={styles.portfolioLabel}>Attached proof</Text>
              <Text style={styles.portfolioTitle}>{response.portfolioTitle}</Text>
            </View>
          </View>
        ) : null}
      </Card>

      <EliteCard style={styles.reviewCard} tone="cyan">
        <EliteSectionHeader
          eyebrow="Creator review"
          icon="scan-outline"
          subtitle="Signals from their reusable profile"
          title="Fast review"
          tone="cyan"
        />
        <View style={styles.reviewSignals}>
          <EliteSignalPill
            icon="pricetags-outline"
            label={skillNames.length ? `${skillNames.length} skills` : 'Needs skills'}
            tone={skillNames.length ? 'accent' : 'warning'}
          />
          <EliteSignalPill
            icon="images-outline"
            label={response.portfolioTitle ? 'Proof attached' : 'No proof attached'}
            tone={response.portfolioTitle ? 'success' : 'neutral'}
          />
        </View>
        <View style={styles.reviewGrid}>
          <ReviewSignal label="Skills" value={skillNames.length ? `${skillNames.length} shown` : 'Needs more'} />
          <ReviewSignal label="Proof" value={response.portfolioTitle ? 'Attached' : portfolioCount ? 'On profile' : 'Missing'} />
          <ReviewSignal label="Links" value={linkCount ? `${linkCount} live` : 'None'} />
          <ReviewSignal label="Availability" value={availability ?? 'Not listed'} />
        </View>
      </EliteCard>

      {ownerView && response.status === 'submitted' ? (
        <View style={styles.actions}>
          <Button
            label="Message applicant"
            loading={isSubmitting}
            onPress={() => void startDiscussion()}
          />
          <Button
            disabled={isSubmitting}
            label="Pass"
            onPress={() => confirmUpdate('decline')}
            variant="secondary"
          />
        </View>
      ) : null}
      {!ownerView && response.status === 'submitted' ? (
        <Button
          disabled={isSubmitting}
          label="Withdraw application"
          onPress={() => confirmUpdate('withdraw')}
          variant="danger"
        />
      ) : null}
      {response.status === 'in_discussion' && response.conversationId ? (
        <View style={styles.actions}>
          <Button
            label="Open conversation"
            onPress={() =>
              router.push(routes.conversation(response.conversationId!))
            }
          />
          {ownerView ? (
            <Button
              label="Close discussion"
              onPress={() => confirmUpdate('close')}
              variant="ghost"
            />
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SafetySheet
        blockedByMe={Boolean(relationship?.blockedByMe)}
        onClose={() => setSafetyOpen(false)}
        onStateChange={() => router.back()}
        profileId={otherProfileId}
        targetId={response.id}
        targetKind="opportunity_response"
        visible={safetyOpen}
      />
    </Screen>
  );
}

function statusLabel(value: string) {
  if (value === 'in_discussion') return 'In discussion';
  if (value === 'submitted') return 'Applied';
  if (value === 'declined') return 'Passed';
  return value.replace(/^\w/, (letter) => letter.toUpperCase());
}

function ResponseStatusBadge({ status }: { status: OpportunityResponseRecord['status'] }) {
  const tone = statusTone(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
      <Text style={[styles.statusText, { color: tone.text }]}>{statusLabel(status)}</Text>
    </View>
  );
}

function ProfileFact({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.profileFact}>
      <Ionicons color={theme.colors.textSoft} name={icon} size={14} />
      <Text numberOfLines={1} style={styles.profileFactText}>{label}</Text>
    </View>
  );
}

function ReviewSignal({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewSignal}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.reviewValue}>{value}</Text>
    </View>
  );
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
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
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
  screen: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  title: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  profileHero: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.lg, borderWidth: 1, gap: theme.spacing.md, padding: theme.spacing.md, ...theme.shadows.card },
  profileTop: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  profileCopy: { flex: 1, gap: 4, minWidth: 0 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  name: { color: theme.colors.text, flex: 1, fontSize: theme.typography.heading, fontWeight: '900' },
  meta: { color: theme.colors.muted, fontSize: theme.typography.small, fontWeight: '700' },
  headline: { color: theme.colors.textSoft, fontSize: theme.typography.small, fontWeight: '700', lineHeight: 20 },
  profileFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  profileFact: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.pill, flexDirection: 'row', gap: 5, maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 7 },
  profileFactText: { color: theme.colors.textSoft, flexShrink: 1, fontSize: theme.typography.caption, fontWeight: '800' },
  statusBadge: { borderRadius: theme.radii.pill, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: theme.typography.caption, fontWeight: '900' },
  opportunity: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.md, flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md },
  opportunityCopy: { flex: 1, gap: 2 },
  opportunityLabel: { color: theme.colors.accentStrong, fontSize: theme.typography.tiny, fontWeight: '800', textTransform: 'uppercase' },
  opportunityTitle: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '900' },
  poster: { color: theme.colors.muted, fontSize: theme.typography.tiny },
  card: { gap: theme.spacing.md },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  sectionTitle: { color: theme.colors.text, flex: 1, fontSize: theme.typography.subheading, fontWeight: '900' },
  noteBox: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md, gap: theme.spacing.xs, padding: theme.spacing.md },
  noteLabel: { color: theme.colors.muted, fontSize: theme.typography.caption, fontWeight: '900', textTransform: 'uppercase' },
  body: { color: theme.colors.textSoft, fontSize: theme.typography.bodySmall, lineHeight: 22 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  portfolio: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md, flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md },
  portfolioImage: { borderRadius: theme.radii.sm, height: 48, width: 48 },
  portfolioCopy: { flex: 1, gap: 2 },
  portfolioLabel: { color: theme.colors.muted, fontSize: theme.typography.tiny },
  portfolioTitle: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '800' },
  date: { color: theme.colors.mutedLight, fontSize: theme.typography.tiny },
  reviewCard: { gap: theme.spacing.md },
  reviewSignals: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  reviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  reviewSignal: { backgroundColor: 'rgba(255,255,255,0.09)', borderColor: 'rgba(255,255,255,0.12)', borderRadius: theme.radii.md, borderWidth: 1, gap: 3, padding: theme.spacing.md, width: '48%' },
  reviewLabel: { color: 'rgba(255,255,255,0.58)', fontSize: theme.typography.caption, fontWeight: '900', textTransform: 'uppercase' },
  reviewValue: { color: theme.colors.white, fontSize: theme.typography.small, fontWeight: '900' },
  actions: { gap: theme.spacing.md },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20, textAlign: 'center' },
  pressed: { opacity: 0.68 },
});
