import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MultiSelectChips } from '@/components/profile';
import {
  Button,
  Chip,
  EliteCard,
  EliteSectionHeader,
  EliteSignalPill,
  TextField,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useNetworkStatus } from '@/context/NetworkStatusContext';
import { captureClientError } from '@/lib/clientMonitoring';
import {
  formatCommunicationError,
  loadOpportunityResponseState,
  loadMyProfileSkills,
  sendOpportunityResponse,
} from '@/lib/communication';
import {
  formatCompensation,
  formatOpportunityLocation,
  isClearlyPaid,
} from '@/lib/opportunity';
import { trackOpportunityFunnelEvent } from '@/lib/opportunityFunnel';
import { loadPersonalProfile } from '@/lib/profile';
import { loadProfilePolish } from '@/lib/profilePolish';
import { routes } from '@/lib/routes';
import type { OpportunityRecord } from '@/types/opportunity';
import {
  availabilityOptions,
  experienceOptions,
  getOptionLabel,
  type Availability,
  type ExperienceLevel,
} from '@/types/profile';
import type { PortfolioItem } from '@/types/profilePolish';

type ApplicantSnapshot = {
  avatarUrl: string | null;
  availability: Availability;
  bio: string;
  displayName: string;
  experienceLevel: ExperienceLevel;
  headline: string;
  linkCount: number;
  locationLabel: string;
  primaryRole: string;
};

type ReadinessCheck = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  ready: boolean;
};

const META_SEPARATOR = ' \u00B7 ';

export function ExpressInterestSheet({
  onClose,
  onSuccess,
  opportunity,
  visible,
}: {
  onClose: () => void;
  onSuccess: (responseId: string) => void;
  opportunity: OpportunityRecord | null;
  visible: boolean;
}) {
  const { user } = useAuth();
  const { showSuccess } = useFeedback();
  const { isOffline } = useNetworkStatus();
  const submitting = useRef(false);
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [sender, setSender] = useState<ApplicantSnapshot | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioItemId, setPortfolioItemId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileState, setProfileState] = useState<
    'error' | 'idle' | 'loading' | 'ready'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSkills([]);
    setSender(null);
    setSelectedSkillIds([]);
    setPortfolio([]);
    setPortfolioItemId(null);
    setNote('');
    setAcknowledged(false);
    setProfileState('idle');
    setError(null);
  }, [opportunity?.id, visible]);

  const loadApplicationProfile = useCallback(async () => {
    if (!visible || !user || !opportunity) return;
    setProfileState('loading');
    setError(null);

    try {
      const [profileSkills, polish, personalProfile] = await Promise.all([
        loadMyProfileSkills(),
        loadProfilePolish(user.id),
        loadPersonalProfile(user.id, user.email ?? null),
      ]);
      if (!personalProfile) {
        throw new Error('Your reusable profile could not be found.');
      }

      setSkills(profileSkills);
      setSender({
        avatarUrl: personalProfile.avatarUrl,
        availability: personalProfile.availability,
        bio: personalProfile.bio,
        displayName: personalProfile.displayName,
        experienceLevel: personalProfile.experienceLevel,
        headline: personalProfile.headline,
        linkCount: personalProfile.links.length + polish.customLinks.length,
        locationLabel: polish.location?.label ?? personalProfile.city,
        primaryRole: personalProfile.primaryRole,
      });
      const required = new Set(
        opportunity.skills.map((skill) => skill.toLowerCase()),
      );
      setSelectedSkillIds(
        profileSkills
          .filter((skill) => required.has(skill.name.toLowerCase()))
          .slice(0, 5)
          .map((skill) => skill.id),
      );
      setPortfolio(polish.portfolio);
      setProfileState('ready');
    } catch (loadError) {
      captureClientError(loadError, 'opportunity_application_profile');
      setProfileState('error');
      setError(
        'Your reusable profile could not be prepared. Check your connection and try again.',
      );
    }
  }, [opportunity, user, visible]);

  useEffect(() => {
    if (!visible || !user || !opportunity) return;
    void loadApplicationProfile();
  }, [loadApplicationProfile, opportunity, user, visible]);

  const needsAcknowledgement = opportunity ? !isClearlyPaid(opportunity) : false;
  const selectedPortfolio = portfolio.find((item) => item.id === portfolioItemId) ?? null;
  const selectedSkills = skills.filter((skill) => selectedSkillIds.includes(skill.id));
  const notePreview = note.trim();
  const profileScore = sender
    ? profileCompleteness({
        hasAvatar: Boolean(sender.avatarUrl),
        hasBio: Boolean(sender.bio),
        hasHeadline: Boolean(sender.headline),
        hasLinks: sender.linkCount > 0,
        hasLocation: Boolean(sender.locationLabel),
        hasPortfolio: portfolio.length > 0,
        hasRole: Boolean(sender.primaryRole),
        hasSkills: skills.length > 0,
      })
    : null;
  const readinessChecks = sender
    ? buildReadinessChecks({
        portfolioCount: portfolio.length,
        sender,
        skillCount: skills.length,
      })
    : [];
  const missingReadiness = readinessChecks
    .filter((check) => !check.ready)
    .map((check) => check.label);

  function openProfileEditor() {
    onClose();
    router.push(routes.editProfile);
  }

  async function submit() {
    if (!opportunity || submitting.current) return;
    if (isOffline) {
      setError('You are offline. Reconnect before sending your application.');
      return;
    }
    if (profileState !== 'ready') {
      setError('Wait for your reusable profile to finish loading.');
      return;
    }
    if (selectedSkillIds.length > 5) {
      setError('Choose up to five relevant skills.');
      return;
    }
    if (needsAcknowledgement && !acknowledged) {
      setError('Acknowledge the compensation notice before continuing.');
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const responseId = await sendOpportunityResponse({
        opportunityId: opportunity.id,
        note,
        portfolioItemId,
        skillIds: selectedSkillIds,
        compensationAcknowledged: acknowledged,
      });
      void trackOpportunityFunnelEvent(opportunity.slug, 'application_submitted');
      showSuccess('Application sent.');
      onSuccess(responseId);
      setNote('');
      setPortfolioItemId(null);
      setAcknowledged(false);
      onClose();
    } catch (submitError) {
      captureClientError(submitError, 'opportunity_application_submit');
      const message = formatCommunicationError(submitError);
      if (/already responded/i.test(message)) {
        try {
          const current = await loadOpportunityResponseState(opportunity.id);
          if (current.responseId) {
            onSuccess(current.responseId);
            showSuccess('Application already sent.');
            onClose();
            return;
          }
        } catch (reconcileError) {
          captureClientError(
            reconcileError,
            'opportunity_application_reconcile',
          );
        }
      }
      setError(message);
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Application packet</Text>
            <Text numberOfLines={2} style={styles.title}>
              {opportunity ? opportunity.title : 'Apply with Lance'}
            </Text>
            <Text style={styles.subtitle}>
              Send the clean version of the DM: reusable profile, sharp proof,
              and one tight fit note.
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {opportunity ? (
            <EliteCard compact style={styles.opportunity} tone="accent">
              <View style={styles.opportunityTop}>
                <View style={styles.opportunityCopy}>
                  <Text style={styles.opportunityLabel}>Applying to</Text>
                  <Text numberOfLines={2} style={styles.opportunityTitle}>
                    {opportunity.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.meta}>
                    {opportunity.poster.name}
                  </Text>
                </View>
                <View style={styles.opportunityBadge}>
                  <Ionicons
                    color={theme.colors.accentStrong}
                    name="paper-plane-outline"
                    size={15}
                  />
                  <Text style={styles.opportunityBadgeText}>Profile apply</Text>
                </View>
              </View>
              <View style={styles.opportunityMetaRow}>
                <ProfileSignal
                  icon="cash-outline"
                  label={formatCompensation(opportunity)}
                />
                <ProfileSignal
                  icon="location-outline"
                  label={formatOpportunityLocation(opportunity)}
                />
              </View>
            </EliteCard>
          ) : null}
          {profileState === 'loading' ? (
            <View style={styles.prepareState}>
              <ActivityIndicator color={theme.colors.accentStrong} />
              <View style={styles.prepareCopy}>
                <Text style={styles.prepareTitle}>Preparing your profile</Text>
                <Text style={styles.prepareBody}>
                  Loading your skills, links, and portfolio.
                </Text>
              </View>
            </View>
          ) : null}
          {profileState === 'error' ? (
            <View style={styles.prepareState}>
              <Ionicons
                color={theme.colors.danger}
                name="cloud-offline-outline"
                size={20}
              />
              <View style={styles.prepareCopy}>
                <Text style={styles.prepareTitle}>Profile unavailable</Text>
                <Text style={styles.prepareBody}>
                  Nothing has been sent. Retry when your connection is stable.
                </Text>
              </View>
              <Button
                label="Retry"
                onPress={() => void loadApplicationProfile()}
                variant="secondary"
              />
            </View>
          ) : null}
          {sender ? (
            <View style={styles.profileCard}>
              <View style={styles.sender}>
                <View style={styles.senderAvatar}>
                  {sender.avatarUrl ? (
                    <Image
                      contentFit="cover"
                      source={sender.avatarUrl}
                      style={styles.senderImage}
                    />
                  ) : (
                    <Text style={styles.senderInitial}>
                      {sender.displayName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.senderCopy}>
                  <Text style={styles.senderLabel}>Sending your Lance profile</Text>
                  <Text numberOfLines={1} style={styles.senderName}>
                    {sender.displayName}
                  </Text>
                  <Text numberOfLines={1} style={styles.senderMeta}>
                    {compactMeta([sender.primaryRole, sender.locationLabel]) ||
                      'Add role and location to stand out'}
                  </Text>
                </View>
                {profileScore != null ? (
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreValue}>{profileScore}%</Text>
                    <Text style={styles.scoreLabel}>ready</Text>
                  </View>
                ) : null}
              </View>
              {sender.headline ? (
                <Text numberOfLines={2} style={styles.headline}>
                  {sender.headline}
                </Text>
              ) : null}
              <View style={styles.signalGrid}>
                <ProfileSignal
                  icon="time-outline"
                  label={getOptionLabel(availabilityOptions, sender.availability)}
                />
                <ProfileSignal
                  icon="sparkles-outline"
                  label={getOptionLabel(experienceOptions, sender.experienceLevel)}
                />
                <ProfileSignal
                  icon="images-outline"
                  label={`${portfolio.length} portfolio`}
                />
                <ProfileSignal
                  icon="link-outline"
                  label={`${sender.linkCount} links`}
                />
              </View>
            </View>
          ) : null}
          {sender && profileScore != null ? (
            <ProfileReadinessPanel
              checks={readinessChecks}
              onEditProfile={openProfileEditor}
              score={profileScore}
            />
          ) : null}
          <ApplicationPacketPreview
            gaps={missingReadiness}
            note={notePreview}
            profileScore={profileScore}
            selectedPortfolio={selectedPortfolio}
            selectedSkills={selectedSkills}
            sender={sender}
          />
          {opportunity && opportunity.skills.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.label}>What they are looking for</Text>
              <View style={styles.requiredSkills}>
                {opportunity.skills.map((skill) => (
                  <Chip key={skill.toLowerCase()} label={skill} />
                ))}
              </View>
            </View>
          ) : null}
          {skills.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Skills to highlight</Text>
                <Text style={styles.sectionHint}>{selectedSkillIds.length}/5</Text>
              </View>
              <MultiSelectChips
                onChange={(values) => {
                  if (values.length <= 5) setSelectedSkillIds(values);
                }}
                options={skills.map((skill) => ({
                  label: skill.name,
                  value: skill.id,
                }))}
                selected={selectedSkillIds}
              />
            </View>
          ) : null}
          {portfolio.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Proof to attach</Text>
                <Text style={styles.sectionHint}>Optional</Text>
              </View>
              <View style={styles.portfolio}>
                {portfolio.map((item) => {
                  const selected = portfolioItemId === item.id;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={item.id}
                      onPress={() => setPortfolioItemId(selected ? null : item.id)}
                      style={[
                        styles.portfolioItem,
                        selected && styles.portfolioSelected,
                      ]}>
                      {item.mediaUrl || item.thumbnailUrl ? (
                        <Image
                          contentFit="cover"
                          source={item.thumbnailUrl ?? item.mediaUrl}
                          style={styles.portfolioImage}
                        />
                      ) : null}
                      {selected ? (
                        <View style={styles.selectedMark}>
                          <Ionicons color={theme.colors.white} name="checkmark" size={13} />
                        </View>
                      ) : null}
                      <Text numberOfLines={2} style={styles.portfolioTitle}>
                        {item.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          <TextField
            label="Why you fit"
            maxLength={500}
            multiline
            onChangeText={setNote}
            placeholder="Keep it short: what you can do, proof you have done it, and when you can start."
            style={styles.note}
            value={note}
          />
          {needsAcknowledgement ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acknowledged }}
              onPress={() => setAcknowledged((value) => !value)}
              style={styles.checkRow}>
              <View style={[styles.checkbox, acknowledged && styles.checked]}>
                {acknowledged ? (
                  <Ionicons color={theme.colors.white} name="checkmark" size={17} />
                ) : null}
              </View>
              <Text style={styles.checkText}>
                I understand that Lance does not employ users, process payments, or
                guarantee compensation.
              </Text>
            </Pressable>
          ) : null}
          <Text style={styles.review}>
            Creators see your public Lance profile, this note, highlighted skills,
            and the proof you choose. Private account settings stay private.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.actions}>
          <Button label="Cancel" onPress={onClose} variant="ghost" />
          <Button
            disabled={isOffline || profileState !== 'ready'}
            label={isOffline ? 'Reconnect to send' : 'Send packet'}
            loading={isSubmitting}
            onPress={() => void submit()}
            style={styles.primary}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ProfileReadinessPanel({
  checks,
  onEditProfile,
  score,
}: {
  checks: ReadinessCheck[];
  onEditProfile: () => void;
  score: number;
}) {
  const missing = checks.filter((check) => !check.ready);

  return (
    <View style={styles.readinessCard}>
      <View style={styles.readinessTop}>
        <View style={styles.readinessCopy}>
          <Text style={styles.readinessEyebrow}>Profile readiness</Text>
          <Text style={styles.readinessTitle}>{packetStrengthLabel(score)}</Text>
        </View>
        <View style={styles.readinessScore}>
          <Text style={styles.readinessScoreValue}>{score}%</Text>
        </View>
      </View>
      <View style={styles.readinessBar}>
        <View style={[styles.readinessFill, { width: `${score}%` }]} />
      </View>
      <Text style={styles.readinessBody}>
        {missing.length
          ? `Missing ${missing.slice(0, 3).join(', ')}. You can still send, but better packets get reviewed faster.`
          : 'Your public profile has the core signals creators usually scan first.'}
      </Text>
      <View style={styles.readinessChecks}>
        {checks.map((check) => (
          <ReadinessPill key={check.label} check={check} />
        ))}
      </View>
      {missing.length ? (
        <Pressable
          accessibilityRole="button"
          onPress={onEditProfile}
          style={({ pressed }) => [
            styles.editProfileLink,
            pressed && styles.editProfileLinkPressed,
          ]}>
          <Text style={styles.editProfileText}>Polish profile</Text>
          <Ionicons
            color={theme.colors.accentStrong}
            name="arrow-forward"
            size={14}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function ReadinessPill({ check }: { check: ReadinessCheck }) {
  return (
    <View style={[styles.readinessPill, check.ready && styles.readinessPillReady]}>
      <Ionicons
        color={check.ready ? theme.colors.success : theme.colors.textSoft}
        name={check.icon}
        size={13}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.readinessPillText,
          check.ready && styles.readinessPillTextReady,
        ]}>
        {check.label}
      </Text>
    </View>
  );
}

function ApplicationPacketPreview({
  gaps,
  note,
  profileScore,
  selectedPortfolio,
  selectedSkills,
  sender,
}: {
  gaps: string[];
  note: string;
  profileScore: number | null;
  selectedPortfolio: PortfolioItem | null;
  selectedSkills: { id: string; name: string }[];
  sender: ApplicantSnapshot | null;
}) {
  const skillSummary =
    selectedSkills.length > 0
      ? selectedSkills.map((skill) => skill.name).join(', ')
      : 'Choose up to five skills to make the application easier to scan.';

  return (
    <EliteCard style={styles.packetCard} tone="cyan">
      <View style={styles.packetHeader}>
        <EliteSectionHeader
          eyebrow="Application packet"
          icon="scan-outline"
          subtitle="A compact profile bundle the creator can review fast."
          title="What the creator gets"
          tone="cyan"
        />
        <View style={styles.packetScore}>
          <Text style={styles.packetScoreValue}>
            {profileScore == null ? '--' : `${profileScore}%`}
          </Text>
          <Text style={styles.packetScoreLabel}>profile</Text>
        </View>
      </View>
      <View style={styles.packetSignalRow}>
        <EliteSignalPill
          icon="person-circle-outline"
          label={sender ? 'Profile loaded' : 'Preparing profile'}
          tone={sender ? 'success' : 'neutral'}
        />
        <EliteSignalPill
          icon="pricetags-outline"
          label={
            selectedSkills.length > 0
              ? `${selectedSkills.length} skills`
              : 'Skills recommended'
          }
          tone={selectedSkills.length > 0 ? 'accent' : 'warning'}
        />
        <EliteSignalPill
          icon="images-outline"
          label={selectedPortfolio ? 'Proof attached' : 'Proof optional'}
          tone={selectedPortfolio ? 'success' : 'neutral'}
        />
        <EliteSignalPill
          icon="chatbubble-ellipses-outline"
          label={note ? 'Fit note ready' : 'Fit note helps'}
          tone={note ? 'success' : 'warning'}
        />
      </View>

      {gaps.length > 0 ? (
        <View style={styles.packetNudge}>
          <Ionicons
            color={theme.colors.warning}
            name="sparkles-outline"
            size={16}
          />
          <Text style={styles.packetNudgeText}>
            Stronger packet if you add {gaps.slice(0, 3).join(', ')}.
          </Text>
        </View>
      ) : (
        <View style={[styles.packetNudge, styles.packetNudgeReady]}>
          <Ionicons color={theme.colors.success} name="checkmark-circle" size={16} />
          <Text style={styles.packetNudgeText}>
            This packet has the core signals creators usually scan first.
          </Text>
        </View>
      )}

      <View style={styles.packetRows}>
        <PacketRow
          detail={
            sender
              ? compactMeta([sender.primaryRole, sender.locationLabel]) ||
                'Profile basics'
              : 'Still loading'
          }
          icon="person-circle-outline"
          label="Reusable profile"
          ready={Boolean(sender)}
          value={sender?.displayName ?? 'Preparing'}
        />
        <PacketRow
          detail={skillSummary}
          icon="pricetags-outline"
          label="Highlighted skills"
          ready={selectedSkills.length > 0}
          value={
            selectedSkills.length > 0
              ? `${selectedSkills.length} selected`
              : 'Needs selection'
          }
        />
        <PacketRow
          detail={
            selectedPortfolio
              ? 'Attached to this application'
              : 'Optional, but strong proof helps creators decide faster.'
          }
          icon="images-outline"
          label="Proof of work"
          ready={Boolean(selectedPortfolio)}
          value={selectedPortfolio?.title ?? 'None attached'}
        />
        <PacketRow
          detail={
            note ||
            'Add one tight note about what you can do, proof you have done it, and when you can start.'
          }
          icon="chatbubble-ellipses-outline"
          label="Fit note"
          ready={Boolean(note)}
          value={note ? 'Ready' : 'Recommended'}
        />
      </View>
    </EliteCard>
  );
}

function PacketRow({
  detail,
  icon,
  label,
  ready,
  value,
}: {
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  ready: boolean;
  value: string;
}) {
  return (
    <View style={styles.packetRow}>
      <View style={[styles.packetIcon, ready && styles.packetIconReady]}>
        <Ionicons
          color={ready ? theme.colors.success : theme.colors.textSoft}
          name={icon}
          size={17}
        />
      </View>
      <View style={styles.packetRowCopy}>
        <View style={styles.packetRowTop}>
          <Text style={styles.packetLabel}>{label}</Text>
          <Text style={[styles.packetValue, ready && styles.packetValueReady]}>
            {value}
          </Text>
        </View>
        <Text numberOfLines={2} style={styles.packetDetail}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

function ProfileSignal({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.profileSignal}>
      <Ionicons color={theme.colors.textSoft} name={icon} size={14} />
      <Text numberOfLines={1} style={styles.profileSignalText}>
        {label}
      </Text>
    </View>
  );
}

function profileCompleteness(input: {
  hasAvatar: boolean;
  hasBio: boolean;
  hasHeadline: boolean;
  hasLinks: boolean;
  hasLocation: boolean;
  hasPortfolio: boolean;
  hasRole: boolean;
  hasSkills: boolean;
}) {
  const checks = Object.values(input);
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function buildReadinessChecks({
  portfolioCount,
  sender,
  skillCount,
}: {
  portfolioCount: number;
  sender: ApplicantSnapshot;
  skillCount: number;
}): ReadinessCheck[] {
  return [
    {
      icon: 'person-circle-outline',
      label: 'Photo',
      ready: Boolean(sender.avatarUrl),
    },
    {
      icon: 'sparkles-outline',
      label: 'Headline',
      ready: Boolean(sender.headline),
    },
    {
      icon: 'reader-outline',
      label: 'Bio',
      ready: Boolean(sender.bio),
    },
    {
      icon: 'pricetags-outline',
      label: 'Skills',
      ready: skillCount > 0,
    },
    {
      icon: 'images-outline',
      label: 'Proof',
      ready: portfolioCount > 0,
    },
    {
      icon: 'link-outline',
      label: 'Links',
      ready: sender.linkCount > 0,
    },
    {
      icon: 'location-outline',
      label: 'Location',
      ready: Boolean(sender.locationLabel),
    },
  ];
}

function packetStrengthLabel(score: number) {
  if (score >= 86) return 'Strong packet';
  if (score >= 70) return 'Good packet';
  if (score >= 50) return 'Needs a little proof';
  return 'Needs profile polish';
}

function compactMeta(values: (string | null | undefined)[]) {
  return values.filter((value): value is string => Boolean(value)).join(META_SEPARATOR);
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.background, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: theme.layout.screenPadding },
  headerCopy: { flex: 1, paddingRight: theme.spacing.md },
  eyebrow: { color: theme.colors.accentStrong, fontFamily: theme.typography.familyMonoSemiBold, fontSize: theme.typography.caption, letterSpacing: 1.2, marginBottom: 5, textTransform: 'uppercase' },
  title: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, fontSize: theme.typography.tiny, lineHeight: 18, marginTop: 3, maxWidth: 280 },
  close: { color: theme.colors.accentStrong, fontSize: theme.typography.small, fontWeight: '800' },
  content: { gap: theme.spacing.xl, padding: theme.layout.screenPadding, paddingBottom: 120 },
  opportunity: { gap: theme.spacing.md },
  opportunityTop: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  opportunityCopy: { flex: 1, gap: 3, minWidth: 0 },
  opportunityLabel: { color: theme.colors.accentStrong, fontFamily: theme.typography.familyMonoSemiBold, fontSize: theme.typography.caption, letterSpacing: 0.9, textTransform: 'uppercase' },
  opportunityTitle: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  opportunityBadge: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderColor: 'rgba(167,139,250,0.28)', borderRadius: theme.radii.pill, borderWidth: 1, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  opportunityBadgeText: { color: theme.colors.accentStrong, fontFamily: theme.typography.familySemiBold, fontSize: theme.typography.caption },
  opportunityMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  meta: { color: theme.colors.muted, fontSize: theme.typography.small },
  prepareState: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md },
  prepareCopy: { flex: 1, gap: 2 },
  prepareTitle: { color: theme.colors.text, fontFamily: theme.typography.familySemiBold, fontSize: theme.typography.small },
  prepareBody: { color: theme.colors.muted, fontSize: theme.typography.caption, lineHeight: 16 },
  profileCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.lg, borderWidth: 1, gap: theme.spacing.md, padding: theme.spacing.md, ...theme.shadows.card },
  sender: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  senderAvatar: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: 24, height: 48, justifyContent: 'center', overflow: 'hidden', width: 48 },
  senderImage: { height: '100%', width: '100%' },
  senderInitial: { color: theme.colors.accentStrong, fontSize: theme.typography.body, fontWeight: '900' },
  senderCopy: { flex: 1, gap: 2 },
  senderLabel: { color: theme.colors.accentStrong, fontSize: theme.typography.tiny, fontWeight: '900', textTransform: 'uppercase' },
  senderName: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '900' },
  senderMeta: { color: theme.colors.muted, fontSize: theme.typography.caption, fontWeight: '700' },
  scoreBadge: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.md, minWidth: 54, paddingHorizontal: theme.spacing.sm, paddingVertical: 7 },
  scoreValue: { color: theme.colors.accentStrong, fontSize: theme.typography.small, fontWeight: '900' },
  scoreLabel: { color: theme.colors.accentStrong, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  headline: { color: theme.colors.textSoft, fontSize: theme.typography.small, fontWeight: '700', lineHeight: 20 },
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  profileSignal: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.pill, flexDirection: 'row', gap: 5, maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 7 },
  profileSignalText: { color: theme.colors.textSoft, flexShrink: 1, fontSize: theme.typography.caption, fontWeight: '800' },
  readinessCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.lg, borderWidth: 1, gap: theme.spacing.md, padding: theme.spacing.md },
  readinessTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  readinessCopy: { flex: 1, gap: 2 },
  readinessEyebrow: { color: theme.colors.muted, fontFamily: theme.typography.familyMonoSemiBold, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase' },
  readinessTitle: { color: theme.colors.text, fontFamily: theme.typography.familySemiBold, fontSize: theme.typography.small },
  readinessScore: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderColor: 'rgba(167,139,250,0.24)', borderRadius: theme.radii.md, borderWidth: 1, minWidth: 54, paddingHorizontal: 9, paddingVertical: 7 },
  readinessScoreValue: { color: theme.colors.accentStrong, fontFamily: theme.typography.familySemiBold, fontSize: theme.typography.small },
  readinessBar: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.pill, height: 6, overflow: 'hidden' },
  readinessFill: { backgroundColor: theme.colors.accentStrong, borderRadius: theme.radii.pill, height: '100%' },
  readinessBody: { color: theme.colors.textSoft, fontSize: theme.typography.caption, lineHeight: 17 },
  readinessChecks: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  readinessPill: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, borderRadius: theme.radii.pill, borderWidth: 1, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  readinessPillReady: { backgroundColor: 'rgba(52,216,112,0.1)', borderColor: 'rgba(52,216,112,0.24)' },
  readinessPillText: { color: theme.colors.textSoft, fontFamily: theme.typography.familySemiBold, fontSize: theme.typography.caption },
  readinessPillTextReady: { color: theme.colors.success },
  editProfileLink: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 5, minHeight: 32, paddingRight: theme.spacing.sm },
  editProfileLinkPressed: { opacity: 0.7 },
  editProfileText: { color: theme.colors.accentStrong, fontFamily: theme.typography.familySemiBold, fontSize: theme.typography.caption },
  packetCard: { gap: theme.spacing.md },
  packetHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  packetSignalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  packetScore: { alignItems: 'flex-end' },
  packetScoreValue: { color: theme.colors.white, fontFamily: theme.typography.familySemiBold, fontSize: theme.typography.subheading },
  packetScoreLabel: { color: 'rgba(255,255,255,0.52)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  packetNudge: { alignItems: 'flex-start', backgroundColor: 'rgba(248,196,107,0.09)', borderColor: 'rgba(248,196,107,0.2)', borderRadius: theme.radii.md, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.sm },
  packetNudgeReady: { backgroundColor: 'rgba(52,216,112,0.09)', borderColor: 'rgba(52,216,112,0.18)' },
  packetNudgeText: { color: 'rgba(255,255,255,0.78)', flex: 1, fontSize: theme.typography.caption, lineHeight: 17 },
  packetRows: { gap: theme.spacing.sm },
  packetRow: { alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.055)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: theme.radii.md, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.sm },
  packetIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: theme.radii.sm, height: 34, justifyContent: 'center', width: 34 },
  packetIconReady: { backgroundColor: 'rgba(52,216,112,0.13)' },
  packetRowCopy: { flex: 1, gap: 4, minWidth: 0 },
  packetRowTop: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'space-between' },
  packetLabel: { color: 'rgba(255,255,255,0.58)', flex: 1, fontFamily: theme.typography.familyMonoSemiBold, fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' },
  packetValue: { color: theme.colors.textSoft, flexShrink: 1, fontFamily: theme.typography.familySemiBold, fontSize: theme.typography.caption, textAlign: 'right' },
  packetValueReady: { color: theme.colors.success },
  packetDetail: { color: 'rgba(255,255,255,0.78)', fontSize: theme.typography.caption, lineHeight: 17 },
  section: { gap: theme.spacing.md },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '800' },
  sectionHint: { color: theme.colors.muted, fontSize: theme.typography.caption, fontWeight: '800' },
  requiredSkills: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  portfolio: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  portfolioItem: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md, borderWidth: 1, gap: theme.spacing.sm, minHeight: 112, overflow: 'hidden', paddingBottom: theme.spacing.sm, width: '47%' },
  portfolioSelected: { borderColor: theme.colors.accent, borderWidth: 2 },
  portfolioImage: { aspectRatio: 16 / 9, width: '100%' },
  selectedMark: { alignItems: 'center', backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill, height: 24, justifyContent: 'center', position: 'absolute', right: 8, top: 8, width: 24 },
  portfolioTitle: { color: theme.colors.text, fontSize: theme.typography.tiny, fontWeight: '700', paddingHorizontal: theme.spacing.sm },
  note: { minHeight: 120, paddingTop: theme.spacing.md, textAlignVertical: 'top' },
  checkRow: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.md },
  checkbox: { alignItems: 'center', borderColor: theme.colors.border, borderRadius: theme.radii.sm, borderWidth: 1, height: 24, justifyContent: 'center', marginTop: 1, width: 24 },
  checked: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  checkText: { color: theme.colors.textSoft, flex: 1, fontSize: theme.typography.small, lineHeight: 21 },
  review: { color: theme.colors.muted, fontSize: theme.typography.tiny, lineHeight: 18 },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20 },
  actions: { alignItems: 'center', borderTopColor: theme.colors.border, borderTopWidth: 1, flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
  primary: { flex: 1 },
});
