import { Ionicons } from '@expo/vector-icons';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FormSection,
  SingleSelectChips,
  StepProgress,
  TagInput,
} from '@/components/profile';
import { Button, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import { needsCompensationWarning, validateOpportunityDraft } from '@/lib/opportunity';
import type { BusinessRecord } from '@/types/business';
import { industryOptions } from '@/types/business';
import {
  compensationTypeOptions,
  opportunityCategoryOptions,
  OpportunityDraft,
  OpportunityRecord,
  OpportunityStatus,
  opportunityExperienceOptions,
  ratePeriodOptions,
  timeCommitmentOptions,
  workArrangementOptions,
  workTypeOptions,
} from '@/types/opportunity';

import { OpportunityCard } from './OpportunityCard';
import { PostingIdentitySelector } from './PostingIdentitySelector';

const TOTAL_STEPS = 7;

type OpportunityEditorProps = {
  businesses: BusinessRecord[];
  displayName: string;
  initialDraft: OpportunityDraft;
  isSaving: boolean;
  onCreateBusiness: () => void;
  onError: (message: string | null) => void;
  onSave: (draft: OpportunityDraft, status: OpportunityStatus) => Promise<void>;
  profileImageUrl: string | null;
};

export function OpportunityEditor({
  businesses,
  displayName,
  initialDraft,
  isSaving,
  onCreateBusiness,
  onError,
  onSave,
  profileImageUrl,
}: OpportunityEditorProps) {
  const [step, setStep] = useState(0);
  const { getValues, setValue, watch } = useForm<OpportunityDraft>({
    defaultValues: initialDraft,
  });
  const draft = watch();

  function set<K extends keyof OpportunityDraft>(key: K, value: OpportunityDraft[K]) {
    setValue(key, value as never, { shouldDirty: true });
    onError(null);
  }

  function continueForward() {
    const error = validateStep(step, getValues());

    if (error) {
      onError(error);
      return;
    }

    onError(null);
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  }

  async function save(status: OpportunityStatus) {
    const currentDraft = getValues();
    const error = validateOpportunityDraft(currentDraft, status === 'published');

    if (error) {
      onError(error);
      return;
    }

    await onSave(currentDraft, status);
  }

  const primaryStatus =
    initialDraft.status === 'draft' ? 'published' : initialDraft.status;
  const canSaveDraft = initialDraft.status === 'draft';

  return (
    <View style={styles.wrapper}>
      <StepProgress current={step + 1} total={TOTAL_STEPS} />
      <View style={styles.content}>{renderStep()}</View>
      <View style={styles.actions}>
        {step > 0 ? (
          <Button
            disabled={isSaving}
            label="Back"
            onPress={() => setStep((current) => current - 1)}
            variant="ghost"
          />
        ) : null}
        {canSaveDraft ? (
          <Button
            label="Save draft"
            loading={isSaving}
            onPress={() => save('draft')}
            style={styles.action}
            variant="secondary"
          />
        ) : null}
        <Button
          label={
            step < TOTAL_STEPS - 1
              ? 'Continue'
              : primaryStatus === 'published' && initialDraft.status === 'draft'
                ? 'Publish'
                : 'Save changes'
          }
          loading={isSaving}
          onPress={
            step < TOTAL_STEPS - 1 ? continueForward : () => save(primaryStatus)
          }
          style={styles.action}
        />
      </View>
    </View>
  );

  function renderStep() {
    if (step === 0) {
      return (
        <>
          <StepHeader
            title="Who is posting this?"
            subtitle="Post personally or as a business or project you own."
          />
          <PostingIdentitySelector
            businesses={businesses}
            displayName={displayName}
            onCreateBusiness={onCreateBusiness}
            onSelectBusiness={(businessId) => {
              set('postingIdentity', 'business');
              set('businessId', businessId);
            }}
            onSelectPersonal={() => {
              set('postingIdentity', 'personal');
              set('businessId', null);
            }}
            profileImageUrl={profileImageUrl}
            selectedBusinessId={draft.businessId}
            selectedIdentity={draft.postingIdentity}
          />
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <StepHeader
            title="Role and category"
            subtitle="Give people a clear first read on the work."
          />
          <TextField
            label="Title"
            maxLength={120}
            onChangeText={(title) => set('title', title)}
            placeholder="React developer for a mobile MVP"
            value={draft.title}
          />
          <FormSection title="Category">
            <SingleSelectChips
              onChange={(category) => set('category', category)}
              options={opportunityCategoryOptions}
              selected={draft.category}
            />
          </FormSection>
          <FormSection title="Work type">
            <SingleSelectChips
              onChange={(workType) => set('workType', workType)}
              options={workTypeOptions}
              selected={draft.workType}
            />
          </FormSection>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <StepHeader
            title="Description and requirements"
            subtitle="Explain the work plainly. Keep the summary compact and the detail useful."
          />
          <TextField
            label="Short summary"
            maxLength={180}
            multiline
            onChangeText={(shortSummary) => set('shortSummary', shortSummary)}
            placeholder="A concise overview shown on opportunity cards."
            style={styles.shortArea}
            textAlignVertical="top"
            value={draft.shortSummary}
          />
          <TextField
            label="Full description"
            maxLength={5000}
            multiline
            onChangeText={(fullDescription) => set('fullDescription', fullDescription)}
            placeholder="Describe the goal, responsibilities, deliverables, and useful context."
            style={styles.longArea}
            textAlignVertical="top"
            value={draft.fullDescription}
          />
          <TextField
            label="Additional requirements (optional)"
            maxLength={1200}
            multiline
            onChangeText={(additionalRequirements) =>
              set('additionalRequirements', additionalRequirements)
            }
            placeholder="Any tools, schedule needs, or other requirements."
            style={styles.shortArea}
            textAlignVertical="top"
            value={draft.additionalRequirements}
          />
          <Checkbox
            checked={draft.portfolioRequired}
            label="A portfolio is required"
            onPress={() => set('portfolioRequired', !draft.portfolioRequired)}
          />
        </>
      );
    }

    if (step === 3) {
      const showWarning = needsCompensationWarning(draft.compensationType);

      return (
        <>
          <StepHeader
            title="Compensation and time"
            subtitle="Keep compensation visible and specific whenever possible."
          />
          <FormSection title="Compensation type">
            <SingleSelectChips
              onChange={(compensationType) => set('compensationType', compensationType)}
              options={compensationTypeOptions}
              selected={draft.compensationType}
            />
          </FormSection>
          {showWarning ? (
            <View style={styles.warning}>
              <Ionicons color="#9A5B00" name="warning-outline" size={20} />
              <Text style={styles.warningText}>
                This compensation may not include guaranteed base pay. Make the terms especially
                clear.
              </Text>
            </View>
          ) : null}
          <View style={styles.twoColumns}>
            <TextField
              inputMode="decimal"
              label="Minimum"
              onChangeText={(compensationMin) =>
                set('compensationMin', numericValue(compensationMin))
              }
              placeholder="1000"
              style={styles.column}
              value={draft.compensationMin}
            />
            <TextField
              inputMode="decimal"
              label="Maximum"
              onChangeText={(compensationMax) =>
                set('compensationMax', numericValue(compensationMax))
              }
              placeholder="2500"
              style={styles.column}
              value={draft.compensationMax}
            />
          </View>
          <TextField
            autoCapitalize="characters"
            label="Currency"
            maxLength={3}
            onChangeText={(currency) => set('currency', currency.toUpperCase())}
            placeholder="USD"
            value={draft.currency}
          />
          <FormSection title="Rate period">
            <SingleSelectChips
              onChange={(ratePeriod) => set('ratePeriod', ratePeriod)}
              options={ratePeriodOptions}
              selected={draft.ratePeriod || 'other'}
            />
          </FormSection>
          <TextField
            label="Compensation notes (optional)"
            maxLength={500}
            multiline
            onChangeText={(compensationNotes) =>
              set('compensationNotes', compensationNotes)
            }
            placeholder="Explain the range, base pay, commission, equity, or negotiable terms."
            style={styles.shortArea}
            textAlignVertical="top"
            value={draft.compensationNotes}
          />
          <FormSection title="Time commitment">
            <SingleSelectChips
              onChange={(timeCommitment) => set('timeCommitment', timeCommitment)}
              options={timeCommitmentOptions}
              selected={draft.timeCommitment}
            />
          </FormSection>
        </>
      );
    }

    if (step === 4) {
      const industries = industryOptions.map((industry) => ({
        label: industry,
        value: industry,
      }));

      return (
        <>
          <StepHeader
            title="Location and work arrangement"
            subtitle="Help people understand where and when the work happens."
          />
          <FormSection title="Work arrangement">
            <SingleSelectChips
              onChange={(workplace) => set('workplace', workplace)}
              options={workArrangementOptions}
              selected={draft.workplace}
            />
          </FormSection>
          <TextField
            label="Location (optional)"
            maxLength={100}
            onChangeText={(location) => set('location', location)}
            placeholder="Chicago, IL"
            value={draft.location}
          />
          <FormSection title="Industry">
            <SingleSelectChips
              onChange={(industry) => set('industry', industry)}
              options={industries}
              selected={draft.industry}
            />
          </FormSection>
          <TextField
            label="Expected start date (optional)"
            onChangeText={(expectedStartDate) => set('expectedStartDate', expectedStartDate)}
            placeholder="YYYY-MM-DD"
            value={draft.expectedStartDate}
          />
          <TextField
            label="Expiration date (optional)"
            onChangeText={(expirationDate) => set('expirationDate', expirationDate)}
            placeholder="YYYY-MM-DD"
            value={draft.expirationDate}
          />
          <TextField
            autoCapitalize="none"
            inputMode="url"
            label="External project link (optional)"
            onChangeText={(externalUrl) => set('externalUrl', externalUrl)}
            placeholder="https://"
            value={draft.externalUrl}
          />
        </>
      );
    }

    if (step === 5) {
      return (
        <>
          <StepHeader
            title="Skills and experience"
            subtitle="These structured details will support future search and filters."
          />
          <TagInput
            label="Required skills"
            onChange={(skills) => set('skills', skills)}
            placeholder="Add a skill"
            values={draft.skills}
          />
          <FormSection title="Experience level">
            <SingleSelectChips
              onChange={(experienceLevel) => set('experienceLevel', experienceLevel)}
              options={opportunityExperienceOptions}
              selected={draft.experienceLevel}
            />
          </FormSection>
          <TextField
            inputMode="numeric"
            label="Number of people needed"
            onChangeText={(peopleNeeded) =>
              set('peopleNeeded', peopleNeeded.replace(/\D/g, ''))
            }
            placeholder="1"
            value={draft.peopleNeeded}
          />
        </>
      );
    }

    const posterBusiness = businesses.find((business) => business.id === draft.businessId);
    const preview = buildPreview(
      draft,
      posterBusiness,
      displayName,
      profileImageUrl,
    );

    return (
      <>
        <StepHeader
          title="Preview and publish"
          subtitle="Review the opportunity exactly as a future result card will present it."
        />
        <OpportunityCard onPress={() => undefined} opportunity={preview} />
        <Checkbox
          checked={draft.disclaimerAccepted}
          label="I understand that Lance does not employ users, process payments, or guarantee compensation."
          onPress={() => set('disclaimerAccepted', !draft.disclaimerAccepted)}
        />
      </>
    );
  }
}

function StepHeader({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function Checkbox({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}>
      <View style={[styles.checkbox, checked && styles.checkboxSelected]}>
        {checked ? <Ionicons color={theme.colors.white} name="checkmark" size={17} /> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}

function validateStep(step: number, draft: OpportunityDraft) {
  if (step === 0 && draft.postingIdentity === 'business' && !draft.businessId) {
    return 'Choose a business or use your personal profile.';
  }
  if (step === 1 && draft.title.trim().length < 3) {
    return 'Enter an opportunity title.';
  }
  if (step === 2 && draft.shortSummary.trim().length < 10) {
    return 'Add a short summary with at least 10 characters.';
  }
  if (step === 2 && draft.fullDescription.trim().length < 20) {
    return 'Add a full description with at least 20 characters.';
  }
  if (step === 5 && draft.skills.length === 0) {
    return 'Add at least one required skill.';
  }
  return null;
}

function numericValue(value: string) {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}

function buildPreview(
  draft: OpportunityDraft,
  business: BusinessRecord | undefined,
  displayName: string,
  profileImageUrl: string | null,
): OpportunityRecord {
  const now = new Date().toISOString();

  return {
    ...draft,
    id: draft.id ?? 'preview',
    ownerProfileId: 'preview',
    status: draft.status,
    createdAt: now,
    updatedAt: now,
    publishedAt: draft.status === 'published' ? now : null,
    closedAt: null,
    archivedAt: null,
    poster: {
      name: draft.postingIdentity === 'business' ? business?.name ?? 'Business' : displayName,
      imageUrl:
        draft.postingIdentity === 'business' ? business?.logoUrl ?? null : profileImageUrl,
      identityType: draft.postingIdentity,
      business: business ?? null,
    },
  };
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xl,
  },
  content: {
    gap: theme.spacing.xl,
  },
  header: {
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
  shortArea: {
    minHeight: 100,
    paddingTop: theme.spacing.lg,
  },
  longArea: {
    minHeight: 180,
    paddingTop: theme.spacing.lg,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  column: {
    flex: 1,
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
  checkboxRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: theme.layout.minTouchTarget,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    marginTop: 1,
    width: 24,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkboxLabel: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '600',
    lineHeight: 21,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  action: {
    flex: 1,
    minWidth: 120,
  },
  pressed: {
    opacity: 0.7,
  },
});
