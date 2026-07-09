import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { Button, Chip, TextField } from '@/components/ui';
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
import { loadPersonalProfile } from '@/lib/profile';
import { loadProfilePolish } from '@/lib/profilePolish';
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
  displayName: string;
  experienceLevel: ExperienceLevel;
  headline: string;
  linkCount: number;
  locationLabel: string;
  primaryRole: string;
};

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
  const profileScore = sender
    ? profileCompleteness({
        hasAvatar: Boolean(sender.avatarUrl),
        hasHeadline: Boolean(sender.headline),
        hasLinks: sender.linkCount > 0,
        hasLocation: Boolean(sender.locationLabel),
        hasPortfolio: portfolio.length > 0,
        hasRole: Boolean(sender.primaryRole),
        hasSkills: skills.length > 0,
      })
    : null;

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
            <Text numberOfLines={2} style={styles.title}>
              {opportunity ? `Apply to ${opportunity.title}` : 'Apply'}
            </Text>
            <Text style={styles.subtitle}>
              Send a clean reusable profile, not a messy DM. Add the proof that
              matters, then review before sending.
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
            <View style={styles.opportunity}>
              <Text style={styles.opportunityTitle}>{opportunity.title}</Text>
              <Text style={styles.meta}>{opportunity.poster.name}</Text>
              <Text style={styles.compensation}>{formatCompensation(opportunity)}</Text>
              <Text style={styles.meta}>{formatOpportunityLocation(opportunity)}</Text>
            </View>
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
                    {[sender.primaryRole, sender.locationLabel].filter(Boolean).join(' | ') ||
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
          <View style={styles.previewStrip}>
            <PreviewSignal
              label="Skills"
              value={
                selectedSkills.length > 0
                  ? `${selectedSkills.length} highlighted`
                  : 'None selected'
              }
            />
            <View style={styles.previewDivider} />
            <PreviewSignal
              label="Proof"
              value={selectedPortfolio?.title ?? 'None attached'}
            />
          </View>
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
            and the portfolio item you choose.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.actions}>
          <Button label="Cancel" onPress={onClose} variant="ghost" />
          <Button
            disabled={isOffline || profileState !== 'ready'}
            label={isOffline ? 'Reconnect to send' : 'Send application'}
            loading={isSubmitting}
            onPress={() => void submit()}
            style={styles.primary}
          />
        </View>
      </SafeAreaView>
    </Modal>
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

function PreviewSignal({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewSignal}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.previewValue}>{value}</Text>
    </View>
  );
}

function profileCompleteness(input: {
  hasAvatar: boolean;
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

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.background, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: theme.layout.screenPadding },
  headerCopy: { flex: 1, paddingRight: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, fontSize: theme.typography.tiny, lineHeight: 18, marginTop: 3, maxWidth: 280 },
  close: { color: theme.colors.accentStrong, fontSize: theme.typography.small, fontWeight: '800' },
  content: { gap: theme.spacing.xl, padding: theme.layout.screenPadding, paddingBottom: 120 },
  opportunity: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md, gap: theme.spacing.xs, padding: theme.spacing.lg },
  opportunityTitle: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  compensation: { color: theme.colors.accentStrong, fontSize: theme.typography.small, fontWeight: '800' },
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
  previewStrip: { alignItems: 'center', backgroundColor: '#17151F', borderRadius: theme.radii.lg, flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md },
  previewSignal: { flex: 1, gap: 2, minWidth: 0 },
  previewLabel: { color: 'rgba(255,255,255,0.54)', fontSize: theme.typography.caption, fontWeight: '900', textTransform: 'uppercase' },
  previewValue: { color: theme.colors.white, fontSize: theme.typography.small, fontWeight: '900' },
  previewDivider: { backgroundColor: 'rgba(255,255,255,0.16)', height: 34, width: 1 },
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
