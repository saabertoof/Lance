import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
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
import {
  formatCommunicationError,
  loadMyProfileSkills,
  sendOpportunityResponse,
} from '@/lib/communication';
import { formatCompensation, isClearlyPaid } from '@/lib/opportunity';
import { loadPersonalProfile } from '@/lib/profile';
import { loadProfilePolish } from '@/lib/profilePolish';
import type { OpportunityRecord } from '@/types/opportunity';
import type { PortfolioItem } from '@/types/profilePolish';

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
  const submitting = useRef(false);
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [sender, setSender] = useState<{
    avatarUrl: string | null;
    displayName: string;
  } | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioItemId, setPortfolioItemId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !user || !opportunity) return;
    Promise.all([
      loadMyProfileSkills(),
      loadProfilePolish(user.id),
      loadPersonalProfile(user.id, user.email ?? null),
    ])
      .then(([profileSkills, polish, personalProfile]) => {
        setSkills(profileSkills);
        if (personalProfile) {
          setSender({
            avatarUrl: personalProfile.avatarUrl,
            displayName: personalProfile.displayName,
          });
        }
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
      })
      .catch(() => {
        setSkills([]);
        setPortfolio([]);
      });
  }, [opportunity, user, visible]);

  const needsAcknowledgement = opportunity ? !isClearlyPaid(opportunity) : false;

  async function submit() {
    if (!opportunity || submitting.current) return;
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
      setError(formatCommunicationError(submitError));
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
              Your Lance profile carries your skills, portfolio, and links. Add
              a short note, then review before sending.
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
              <Text style={styles.meta}>
                {[opportunity.workplace, opportunity.location]
                  .filter(Boolean)
                  .join(' | ')}
              </Text>
            </View>
          ) : null}
          {sender ? (
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
                <Text style={styles.senderLabel}>Sending as</Text>
                <Text style={styles.senderName}>{sender.displayName}</Text>
              </View>
            </View>
          ) : null}
          {opportunity && opportunity.skills.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.label}>Required skills</Text>
              <View style={styles.requiredSkills}>
                {opportunity.skills.map((skill) => (
                  <Chip key={skill.toLowerCase()} label={skill} />
                ))}
              </View>
            </View>
          ) : null}
          {skills.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.label}>Relevant skills, up to five</Text>
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
              <Text style={styles.label}>Optional portfolio item</Text>
              <View style={styles.portfolio}>
                {portfolio.map((item) => {
                  const selected = portfolioItemId === item.id;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
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
            label="Optional note"
            maxLength={500}
            multiline
            onChangeText={setNote}
            placeholder="Why this opportunity fits your work"
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
            Applying never happens automatically. Review everything before
            submitting.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.actions}>
          <Button label="Cancel" onPress={onClose} variant="ghost" />
          <Button
            label="Submit application"
            loading={isSubmitting}
            onPress={() => void submit()}
            style={styles.primary}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
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
  sender: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  senderAvatar: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: 24, height: 48, justifyContent: 'center', overflow: 'hidden', width: 48 },
  senderImage: { height: '100%', width: '100%' },
  senderInitial: { color: theme.colors.accentStrong, fontSize: theme.typography.body, fontWeight: '900' },
  senderCopy: { flex: 1, gap: 2 },
  senderLabel: { color: theme.colors.muted, fontSize: theme.typography.tiny },
  senderName: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '900' },
  section: { gap: theme.spacing.md },
  label: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '800' },
  requiredSkills: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  portfolio: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  portfolioItem: { borderColor: theme.colors.border, borderRadius: theme.radii.md, borderWidth: 1, gap: theme.spacing.sm, overflow: 'hidden', paddingBottom: theme.spacing.sm, width: '47%' },
  portfolioSelected: { borderColor: theme.colors.accent, borderWidth: 2 },
  portfolioImage: { aspectRatio: 16 / 9, width: '100%' },
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
