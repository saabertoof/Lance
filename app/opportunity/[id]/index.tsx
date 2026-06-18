import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CompensationBadge,
  OpportunityStatusBadge,
  WorkArrangementBadge,
} from '@/components/opportunity';
import { SaveButton } from '@/components/saved';
import { Button, Chip, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useSaved } from '@/context/SavedContext';
import { formatDateLabel } from '@/lib/date';
import {
  deleteDraftOpportunity,
  formatCompensation,
  formatOpportunityError,
  loadOpportunity,
  needsCompensationWarning,
  updateOpportunityStatus,
} from '@/lib/opportunity';
import { routes } from '@/lib/routes';
import {
  opportunityCategoryOptions,
  OpportunityRecord,
  OpportunityStatus,
  opportunityExperienceOptions,
  timeCommitmentOptions,
  workArrangementOptions,
  workTypeOptions,
} from '@/types/opportunity';
import { getOptionLabel } from '@/types/profile';

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess } = useFeedback();
  const { isOpportunitySaved, setOpportunitySaved } = useSaved();
  const updateRef = useRef(false);
  const [opportunity, setOpportunity] = useState<OpportunityRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setOpportunity(await loadOpportunity(id));
    } catch (loadError) {
      setError(formatOpportunityError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(status: OpportunityStatus) {
    if (!user || updateRef.current) return;
    updateRef.current = true;
    setIsUpdating(true);
    setError(null);

    try {
      await updateOpportunityStatus(id, user.id, status);
      await load();
      showSuccess(getStatusSuccessMessage(status, opportunity?.status));
    } catch (updateError) {
      setError(formatOpportunityError(updateError));
    } finally {
      updateRef.current = false;
      setIsUpdating(false);
    }
  }

  function confirmStatus(status: OpportunityStatus, title: string, body: string) {
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: title,
        style: status === 'closed' || status === 'archived' ? 'destructive' : 'default',
        onPress: () => void changeStatus(status),
      },
    ]);
  }

  function confirmDeleteDraft() {
    Alert.alert('Delete draft?', 'This draft will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user || updateRef.current) return;
          updateRef.current = true;
          setIsUpdating(true);
          try {
            await deleteDraftOpportunity(id, user.id);
            showSuccess('Opportunity draft deleted.');
            router.replace(routes.opportunities);
          } catch (deleteError) {
            setError(formatOpportunityError(deleteError));
          } finally {
            updateRef.current = false;
            setIsUpdating(false);
          }
        },
      },
    ]);
  }

  function confirmPublish() {
    Alert.alert(
      'Publish opportunity?',
      'By publishing, you confirm that you understand Lance does not employ users, process payments, or guarantee compensation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept and publish',
          onPress: () => void changeStatus('published'),
        },
      ],
    );
  }

  if (isLoading && !opportunity) return <LoadingState message="Loading opportunity" />;
  if (!opportunity) {
    return (
      <Screen centered>
        <Text style={styles.error}>{error ?? 'The opportunity could not be loaded.'}</Text>
      </Screen>
    );
  }

  const isOwner = opportunity.ownerProfileId === user?.id;
  const isSaved = isOpportunitySaved(opportunity.id);
  const mark = opportunity.poster.name.charAt(0).toUpperCase() || 'L';
  const compensationWarning = needsCompensationWarning(opportunity.compensationType);

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Pressable
          accessibilityLabel="Share opportunity"
          accessibilityRole="button"
          onPress={() =>
            Share.share({
              message: `View ${opportunity.title} on Lance: https://lance.app/o/${opportunity.slug}`,
            })
          }
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="share-outline" size={22} />
        </Pressable>
      </View>

      <View style={styles.posterRow}>
        <View style={styles.posterImage}>
          {opportunity.poster.imageUrl ? (
            <Image
              contentFit="cover"
              source={opportunity.poster.imageUrl}
              style={styles.image}
            />
          ) : (
            <Text style={styles.mark}>{mark}</Text>
          )}
        </View>
        <View style={styles.posterCopy}>
          <Text style={styles.posterName}>{opportunity.poster.name}</Text>
          <Text style={styles.posterType}>
            {opportunity.poster.identityType === 'business'
              ? 'Business or project'
              : 'Personal profile'}
          </Text>
        </View>
        <OpportunityStatusBadge status={opportunity.status} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.title}>{opportunity.title}</Text>
        <Text style={styles.summary}>{opportunity.shortSummary}</Text>
        <View style={styles.badges}>
          <CompensationBadge
            compensationType={opportunity.compensationType}
            label={formatCompensation(opportunity)}
          />
          <WorkArrangementBadge
            label={getOptionLabel(workArrangementOptions, opportunity.workplace)}
          />
        </View>
      </View>

      {!isOwner ? (
        <View style={styles.saveArea}>
          <SaveButton
            isSaved={isSaved}
            onPress={() => void setOpportunitySaved(opportunity.id, !isSaved)}
          />
          <Text style={styles.saveNote}>
            Saving is private and does not express interest or notify the poster.
          </Text>
        </View>
      ) : null}

      {compensationWarning ? (
        <View style={styles.warning}>
          <Ionicons color="#9A5B00" name="warning-outline" size={20} />
          <Text style={styles.warningText}>
            This opportunity may not include guaranteed base pay. Lance does not employ users,
            process payments, or guarantee compensation.
          </Text>
        </View>
      ) : null}

      {opportunity.compensationNotes ? (
        <Section title="Compensation notes">
          <Text style={styles.body}>{opportunity.compensationNotes}</Text>
        </Section>
      ) : null}

      <Section title="Opportunity details">
        <Detail
          label="Category"
          value={getOptionLabel(opportunityCategoryOptions, opportunity.category)}
        />
        <Detail label="Work type" value={getOptionLabel(workTypeOptions, opportunity.workType)} />
        <Detail
          label="Time commitment"
          value={getOptionLabel(timeCommitmentOptions, opportunity.timeCommitment)}
        />
        <Detail
          label="Experience"
          value={getOptionLabel(opportunityExperienceOptions, opportunity.experienceLevel)}
        />
        <Detail
          label="Arrangement"
          value={getOptionLabel(workArrangementOptions, opportunity.workplace)}
        />
        <Detail label="Location" value={opportunity.location || 'Not specified'} />
        <Detail label="Industry" value={opportunity.industry} />
        <Detail label="People needed" value={opportunity.peopleNeeded} />
        <Detail
          label="Portfolio"
          value={opportunity.portfolioRequired ? 'Required' : 'Not required'}
        />
      </Section>

      <Section title="Description">
        <Text style={styles.body}>{opportunity.fullDescription}</Text>
      </Section>

      {opportunity.additionalRequirements ? (
        <Section title="Additional requirements">
          <Text style={styles.body}>{opportunity.additionalRequirements}</Text>
        </Section>
      ) : null}

      <Section title="Required skills">
        <View style={styles.skills}>
          {opportunity.skills.map((skill) => (
            <Chip key={skill.toLowerCase()} label={skill} />
          ))}
        </View>
      </Section>

      <Section title="Dates and link">
        <Detail
          label="Expected start"
          value={
            opportunity.expectedStartDate
              ? formatDateLabel(opportunity.expectedStartDate)
              : 'Not specified'
          }
        />
        <Detail
          label="Expires"
          value={
            opportunity.expirationDate
              ? formatDateLabel(opportunity.expirationDate)
              : 'Not specified'
          }
        />
        <Detail
          label="Published"
          value={opportunity.publishedAt?.slice(0, 10) ?? 'Not published'}
        />
        {opportunity.externalUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(opportunity.externalUrl)}
            style={styles.link}>
            <Text style={styles.linkLabel}>External project link</Text>
            <Ionicons color={theme.colors.muted} name="open-outline" size={18} />
          </Pressable>
        ) : null}
      </Section>

      {isOwner ? (
        <OwnerControls
          isUpdating={isUpdating}
          onArchive={() =>
            confirmStatus(
              'archived',
              'Archive',
              'This opportunity will remain visible only to you.',
            )
          }
          onClose={() =>
            confirmStatus('closed', 'Close', 'This opportunity will stop accepting future activity.')
          }
          onDeleteDraft={confirmDeleteDraft}
          onEdit={() => router.push(routes.editOpportunity(id))}
          onPause={() =>
            confirmStatus('paused', 'Pause', 'This opportunity will be hidden until resumed.')
          }
          onPublish={confirmPublish}
          onResume={() => void changeStatus('published')}
          status={opportunity.status}
        />
      ) : (
        <Button disabled label="Opportunity actions coming soon" onPress={() => undefined} />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

function OwnerControls({
  isUpdating,
  onArchive,
  onClose,
  onDeleteDraft,
  onEdit,
  onPause,
  onPublish,
  onResume,
  status,
}: {
  isUpdating: boolean;
  onArchive: () => void;
  onClose: () => void;
  onDeleteDraft: () => void;
  onEdit: () => void;
  onPause: () => void;
  onPublish: () => void;
  onResume: () => void;
  status: OpportunityStatus;
}) {
  return (
    <View style={styles.ownerControls}>
      {status !== 'archived' ? (
        <Button disabled={isUpdating} label="Edit" onPress={onEdit} variant="secondary" />
      ) : null}
      {status === 'draft' ? (
        <>
          <Button loading={isUpdating} label="Publish" onPress={onPublish} />
          <Button
            disabled={isUpdating}
            label="Delete draft"
            onPress={onDeleteDraft}
            variant="danger"
          />
        </>
      ) : null}
      {status === 'published' ? (
        <>
          <Button loading={isUpdating} label="Pause" onPress={onPause} variant="secondary" />
          <Button disabled={isUpdating} label="Close" onPress={onClose} variant="danger" />
          <Button disabled={isUpdating} label="Archive" onPress={onArchive} variant="ghost" />
        </>
      ) : null}
      {status === 'paused' ? (
        <>
          <Button loading={isUpdating} label="Resume" onPress={onResume} />
          <Button disabled={isUpdating} label="Close" onPress={onClose} variant="danger" />
          <Button disabled={isUpdating} label="Archive" onPress={onArchive} variant="ghost" />
        </>
      ) : null}
      {status === 'closed' ? (
        <Button
          disabled={isUpdating}
          label="Archive"
          onPress={onArchive}
          variant="danger"
        />
      ) : null}
    </View>
  );
}

function getStatusSuccessMessage(
  status: OpportunityStatus,
  previousStatus?: OpportunityStatus,
) {
  if (status === 'published' && previousStatus === 'paused') {
    return 'Opportunity resumed.';
  }

  const messages: Record<OpportunityStatus, string> = {
    draft: 'Opportunity draft saved.',
    published: 'Opportunity published.',
    paused: 'Opportunity paused.',
    closed: 'Opportunity closed.',
    archived: 'Opportunity archived.',
  };

  return messages[status];
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  posterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  posterImage: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 52,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  mark: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  posterCopy: {
    flex: 1,
    gap: 2,
  },
  posterName: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  posterType: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
  },
  hero: {
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
    lineHeight: 36,
  },
  summary: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    lineHeight: 25,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  saveArea: {
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  saveNote: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  warning: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF5E8',
    borderColor: '#F2D7AA',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  warningText: {
    color: '#7D4B00',
    flex: 1,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  section: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  detail: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  detailValue: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '700',
    textAlign: 'right',
  },
  body: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    lineHeight: 25,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  link: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: theme.layout.minTouchTarget,
  },
  linkLabel: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  ownerControls: {
    gap: theme.spacing.md,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
});
