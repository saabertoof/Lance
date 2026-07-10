import { Ionicons } from '@expo/vector-icons';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FormSection,
  CatalogSelector,
  LocationInput,
  SingleSelectChips,
  StepProgress,
} from '@/components/profile';
import { Button, DateField, TextField } from '@/components/ui';
import { industryCatalog, skillCatalog } from '@/constants/catalogs';
import { theme } from '@/constants/theme';
import { useNetworkStatus } from '@/context/NetworkStatusContext';
import {
  OpportunityLinkPreviewCard,
  OpportunitySharePoster,
} from '@/components/create';
import { slugify } from '@/lib/business';
import {
  formatCompensation,
  formatOpportunityLocation,
  needsCompensationWarning,
  validateOpportunityDraft,
} from '@/lib/opportunity';
import { generateMagicOpportunityDraft } from '@/lib/opportunityMagicDraftApi';
import { buildMagicOpportunityDraft } from '@/lib/opportunityMagicDraft';
import {
  getLocationCatalogId,
  getLocationCountryCode,
  locationOptionFromStored,
} from '@/lib/location';
import type { BusinessRecord } from '@/types/business';
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

import { PostingIdentitySelector } from './PostingIdentitySelector';

const TOTAL_STEPS = 7;

type OpportunityEditorProps = {
  businesses: BusinessRecord[];
  displayName: string;
  initialDraft: OpportunityDraft;
  initialMagicPrompt?: string;
  initialStep?: number;
  isSaving: boolean;
  onCreateBusiness: () => void;
  onError: (message: string | null) => void;
  onDraftChange?: (draft: OpportunityDraft) => void;
  onSave: (draft: OpportunityDraft, status: OpportunityStatus) => Promise<void>;
  onStepChange?: (step: number) => void;
  profileImageUrl: string | null;
};

export function OpportunityEditor({
  businesses,
  displayName,
  initialDraft,
  initialMagicPrompt = '',
  initialStep = 0,
  isSaving,
  onCreateBusiness,
  onDraftChange,
  onError,
  onSave,
  onStepChange,
  profileImageUrl,
}: OpportunityEditorProps) {
  const [step, setStep] = useState(initialStep);
  const [magicPrompt, setMagicPrompt] = useState(initialMagicPrompt);
  const [isDraftingWithLance, setIsDraftingWithLance] = useState(false);
  const [magicNotice, setMagicNotice] = useState<string | null>(null);
  const { isOffline } = useNetworkStatus();
  const { getValues, setValue, watch } = useForm<OpportunityDraft>({
    defaultValues: initialDraft,
  });
  const draft = watch();

  useEffect(() => {
    if (!onDraftChange) return;
    const timeout = setTimeout(() => onDraftChange(draft), 600);
    return () => clearTimeout(timeout);
  }, [draft, onDraftChange]);

  function moveToStep(nextStep: number) {
    const bounded = Math.max(0, Math.min(nextStep, TOTAL_STEPS - 1));
    setStep(bounded);
    onStepChange?.(bounded);
  }

  function set<K extends keyof OpportunityDraft>(key: K, value: OpportunityDraft[K]) {
    setValue(key, value as never, { shouldDirty: true });
    onError(null);
    setMagicNotice(null);
  }

  function continueForward() {
    const error = validateStep(step, getValues());

    if (error) {
      onError(error);
      return;
    }

    onError(null);
    moveToStep(step + 1);
  }

  async function save(status: OpportunityStatus) {
    if (isOffline) {
      onError('Reconnect before saving. Your unfinished draft remains on this device.');
      return;
    }
    const currentDraft = getValues();
    const error = validateOpportunityDraft(currentDraft, status === 'published');

    if (error) {
      onError(error);
      return;
    }

    await onSave(currentDraft, status);
  }

  async function applyMagicDraft() {
    const prompt = magicPrompt.trim();

    if (prompt.length < 12) {
      onError('Describe the person you need in a sentence or two.');
      return;
    }

    if (isDraftingWithLance) return;

    setIsDraftingWithLance(true);
    try {
      const result = isOffline
        ? null
        : await generateMagicOpportunityDraft(prompt, getValues());
      const suggestion = result?.draft ?? buildMagicOpportunityDraft(prompt, getValues());
      applyDraftSuggestion(suggestion);
      setMagicNotice(
        result
          ? 'Lance drafted this with AI. Review the fields before publishing.'
          : 'Offline mode used a local starter draft. You can still edit everything.',
      );
      onError(null);
      moveToStep(2);
    } catch (error) {
      const suggestion = buildMagicOpportunityDraft(prompt, getValues());
      applyDraftSuggestion(suggestion);
      setMagicNotice(
        `${getErrorMessage(error)} Used a local starter draft instead.`,
      );
      onError(null);
      moveToStep(2);
    } finally {
      setIsDraftingWithLance(false);
    }
  }

  function applyDraftSuggestion(suggestion: Partial<OpportunityDraft>) {
    (Object.keys(suggestion) as (keyof OpportunityDraft)[]).forEach((key) => {
      setValue(key, suggestion[key] as never, { shouldDirty: true });
    });
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
            onPress={() => moveToStep(step - 1)}
            variant="ghost"
          />
        ) : null}
        {canSaveDraft ? (
          <Button
            disabled={isSaving || isOffline}
            label="Save draft"
            loading={isSaving}
            onPress={() => save('draft')}
            style={styles.action}
            variant="secondary"
          />
        ) : null}
        <Button
          disabled={isSaving || (step === TOTAL_STEPS - 1 && isOffline)}
          label={
            step < TOTAL_STEPS - 1
              ? 'Continue'
              : isOffline
                ? 'Reconnect to save'
              : primaryStatus === 'published' && initialDraft.status === 'draft'
                ? 'Publish and get link'
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
            subtitle="Post personally or as a business profile you own."
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
            title="Opportunity and category"
            subtitle="Give people a clear first read on what you need."
          />
          <MagicDraftPanel
            isDrafting={isDraftingWithLance}
            notice={magicNotice}
            onApply={applyMagicDraft}
            onChange={setMagicPrompt}
            prompt={magicPrompt}
          />
          <TextField
            label="Opportunity title"
            maxLength={120}
            onChangeText={(title) => set('title', title)}
            placeholder="Short-form editor for launch content"
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
            title="The pitch"
            subtitle="Tell people what you need, make it clear, and keep it easy to skim."
          />
          <TextField
            label="One-line hook"
            maxLength={180}
            multiline
            onChangeText={(shortSummary) => set('shortSummary', shortSummary)}
            placeholder="A compact summary people can understand in one glance."
            style={styles.shortArea}
            textAlignVertical="top"
            value={draft.shortSummary}
          />
          <TextField
            label="What they'll do"
            maxLength={5000}
            multiline
            onChangeText={(fullDescription) => set('fullDescription', fullDescription)}
            placeholder="Describe the goal, deliverables, and useful context."
            style={styles.longArea}
            textAlignVertical="top"
            value={draft.fullDescription}
          />
          <TextField
            label="Who this is for (optional)"
            maxLength={1200}
            multiline
            onChangeText={(additionalRequirements) =>
              set('additionalRequirements', additionalRequirements)
            }
            placeholder="Any tools, schedule needs, taste, or experience that would help."
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
            subtitle="Set clear expectations before anyone applies."
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
              <Ionicons color="#F4BE65" name="warning-outline" size={20} />
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
      return (
        <>
          <StepHeader
            title="Location and work arrangement"
            subtitle="Help people understand where the work happens and how flexible it is."
          />
          <FormSection title="Work arrangement">
            <SingleSelectChips
              onChange={(workplace) => set('workplace', workplace)}
              options={workArrangementOptions}
              selected={draft.workplace}
            />
          </FormSection>
          <LocationInput
            helperText={
              draft.workplace === 'remote'
                ? 'Optional for remote opportunities. Add a city only if it matters.'
                : 'Add the city where hybrid or in-person work is based.'
            }
            label={draft.workplace === 'remote' ? 'Location (optional)' : 'City and country'}
            legacyValue={draft.location}
            onChange={(location) => {
              set('location', location?.label ?? '');
              set('locationId', getLocationCatalogId(location));
              set('locationRegion', location?.region ?? '');
              set('locationCountry', getLocationCountryCode(location));
            }}
            value={locationOptionFromStored({
              id: draft.locationId,
              label: draft.location,
              region: draft.locationRegion,
              country: draft.locationCountry,
            })}
          />
          <CatalogSelector
            catalog={industryCatalog.map((label) => ({ label, category: 'Industries' }))}
            catalogType="industries"
            label="Industry"
            max={1}
            onChange={(industries) => set('industry', industries.at(-1) ?? '')}
            placeholder="Search industries"
            values={draft.industry ? [draft.industry] : []}
          />
          <DateField
            label="Expected start date (optional)"
            onChange={(expectedStartDate) => set('expectedStartDate', expectedStartDate)}
            value={draft.expectedStartDate}
          />
          <DateField
            label="Expiration date (optional)"
            minimumDate={draft.expectedStartDate || undefined}
            onChange={(expirationDate) => set('expirationDate', expirationDate)}
            value={draft.expirationDate}
          />
          <TextField
            autoCapitalize="none"
            inputMode="url"
            label="External link (optional)"
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
          <CatalogSelector
            catalog={skillCatalog}
            catalogType="skills"
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
          title="Review and publish"
          subtitle="Publishing creates a clean Lance link you can share anywhere."
        />
        <OpportunityLinkPreviewCard
          compensationLabel={formatCompensation(draft)}
          locationLabel={formatOpportunityLocation(draft)}
          posterImageUrl={preview.poster.imageUrl}
          posterLabel={preview.poster.name}
          skills={draft.skills}
          summary={draft.shortSummary}
          title={draft.title}
          urlLabel={`lance.app/o/${draft.slug || slugify(draft.title).slice(0, 48) || 'your-opportunity'}`}
        />
        <View style={styles.socialPreviewBlock}>
          <Text style={styles.socialPreviewLabel}>Social share card</Text>
          <OpportunitySharePoster
            compensationLabel={formatCompensation(draft)}
            locationLabel={formatOpportunityLocation(draft)}
            posterImageUrl={preview.poster.imageUrl}
            posterLabel={preview.poster.name}
            skills={draft.skills}
            summary={draft.shortSummary}
            title={draft.title}
            urlLabel={`lance.app/o/${draft.slug || slugify(draft.title).slice(0, 48) || 'your-opportunity'}`}
          />
        </View>
        <Checkbox
          checked={draft.disclaimerAccepted}
          label="I understand that Lance does not employ users, process payments, or guarantee compensation."
          onPress={() => set('disclaimerAccepted', !draft.disclaimerAccepted)}
        />
      </>
    );
  }
}

function MagicDraftPanel({
  isDrafting,
  notice,
  onApply,
  onChange,
  prompt,
}: {
  isDrafting: boolean;
  notice: string | null;
  onApply: () => void;
  onChange: (value: string) => void;
  prompt: string;
}) {
  return (
    <View style={styles.magicPanel}>
      <View style={styles.magicHeader}>
        <View style={styles.magicIcon}>
          <Ionicons color={theme.colors.accentStrong} name="sparkles-outline" size={18} />
        </View>
        <View style={styles.magicCopy}>
          <Text style={styles.magicTitle}>Magic Draft</Text>
          <Text style={styles.magicBody}>
            Describe the person you need. Lance drafts editable fields and a share-ready link preview.
          </Text>
        </View>
      </View>
      <TextField
        label="What are you looking for?"
        maxLength={420}
        multiline
        onChangeText={onChange}
        placeholder="Need a short-form editor for my crypto YouTube channel, paid per clip, remote, CapCut preferred"
        style={styles.magicInput}
        textAlignVertical="top"
        value={prompt}
      />
      {notice ? <Text style={styles.magicNotice}>{notice}</Text> : null}
      <Button
        label="Draft with Lance"
        loading={isDrafting}
        onPress={onApply}
        variant="secondary"
      />
    </View>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Magic Draft is temporarily unavailable.';
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
    gap: theme.spacing.lg,
  },
  content: {
    gap: theme.spacing.lg,
  },
  magicPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  magicHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  magicIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  magicCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  magicTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.cardTitle,
  },
  magicBody: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  magicNotice: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  magicInput: {
    minHeight: 92,
    paddingTop: theme.spacing.md,
  },
  header: {
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.heading,
    lineHeight: 27,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.bodySmall,
    lineHeight: 20,
  },
  shortArea: {
    minHeight: 92,
    paddingTop: theme.spacing.md,
  },
  longArea: {
    minHeight: 158,
    paddingTop: theme.spacing.md,
  },
  socialPreviewBlock: {
    alignSelf: 'center',
    gap: theme.spacing.sm,
    maxWidth: 360,
    width: '100%',
  },
  socialPreviewLabel: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.caption,
    textTransform: 'uppercase',
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
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.22)',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  warningText: {
    color: '#F4BE65',
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
    fontFamily: theme.typography.familyMedium,
    lineHeight: 21,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  action: {
    flex: 1,
    minWidth: 120,
  },
  pressed: {
    opacity: 0.7,
  },
});
