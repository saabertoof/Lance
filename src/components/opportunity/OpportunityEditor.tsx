import { Ionicons } from '@expo/vector-icons';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
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
import { needsCompensationWarning, validateOpportunityDraft } from '@/lib/opportunity';
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
  const [magicPrompt, setMagicPrompt] = useState('');
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

  function applyMagicDraft() {
    const prompt = magicPrompt.trim();

    if (prompt.length < 12) {
      onError('Describe the person you need in a sentence or two.');
      return;
    }

    const suggestion = buildMagicDraft(prompt, getValues());
    (Object.keys(suggestion) as (keyof OpportunityDraft)[]).forEach((key) => {
      setValue(key, suggestion[key] as never, { shouldDirty: true });
    });
    onError(null);
    setStep(2);
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
            title="Opportunity and category"
            subtitle="Give people a clear first read on what you need."
          />
          <MagicDraftPanel
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

function MagicDraftPanel({
  onApply,
  onChange,
  prompt,
}: {
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
            Describe the person you need. Lance will draft editable starter fields.
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
      <Button label="Draft it" onPress={onApply} variant="secondary" />
    </View>
  );
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

function buildMagicDraft(prompt: string, current: OpportunityDraft): Partial<OpportunityDraft> {
  const text = prompt.trim().replace(/\s+/g, ' ');
  const lower = text.toLowerCase();
  const skills = inferSkills(lower);
  const title = inferOpportunityTitle(text, lower);
  const remote = /\b(remote|online|anywhere)\b/.test(lower);
  const local = /\b(local|in person|in-person|on site|onsite)\b/.test(lower);
  const paidPerClip = /\b(per clip|per video|per short|per edit)\b/.test(lower);
  const hourly = /\b(hourly|per hour)\b/.test(lower);
  const equity = /\b(equity|cofounder|co-founder)\b/.test(lower);
  const unpaid = /\b(unpaid|volunteer)\b/.test(lower);
  const ongoing = /\b(ongoing|long term|long-term|weekly|monthly|retainer)\b/.test(lower);
  const partTime = /\b(part time|part-time|few hours|10-20|5-10)\b/.test(lower);

  return {
    title,
    shortSummary: inferShortSummary(title, text),
    fullDescription:
      `Help with ${text}. The work should be clear, polished, and easy to review. ` +
      'Share examples of relevant work, communicate what you need, and keep the creator updated as you go.',
    category: inferCategory(lower),
    workType: equity
      ? 'cofounder'
      : ongoing
        ? 'ongoing_freelance'
        : partTime
          ? 'part_time'
          : 'one_time_project',
    compensationType: unpaid
      ? 'unpaid'
      : equity
        ? 'equity'
        : hourly
          ? 'hourly'
          : paidPerClip
            ? 'fixed_project'
            : /\bpaid|budget|pay|rate|compensat/.test(lower)
              ? 'fixed_project'
              : current.compensationType,
    ratePeriod: hourly ? 'per_hour' : paidPerClip ? 'per_project' : current.ratePeriod || 'per_project',
    workplace: remote ? 'remote' : local ? 'in_person' : current.workplace,
    timeCommitment: partTime
      ? 'hours_10_20'
      : ongoing
        ? 'hours_5_10'
        : current.timeCommitment || 'one_time_deliverable',
    experienceLevel: /\bexpert|senior|pro|experienced\b/.test(lower)
      ? 'experienced'
      : /\bbeginner|junior|student\b/.test(lower)
        ? 'beginner'
        : current.experienceLevel,
    industry: inferIndustry(lower, current.industry),
    skills: uniqueStrings([...(current.skills ?? []), ...skills]).slice(0, 8),
    additionalRequirements: inferIdealCandidate(skills),
    portfolioRequired: skills.some((skill) =>
      /editing|design|content|video|thumbnail|motion|copy/i.test(skill),
    ),
  };
}

function inferOpportunityTitle(text: string, lower: string) {
  const context = inferCreatorContext(text);
  if (/\b(short[- ]?form|tiktok|shorts|clips?|capcut)\b/.test(lower)) {
    return context ? `Short-form editor for ${context}` : 'Short-form editor';
  }
  if (/\bthumbnail\b/.test(lower)) return context ? `Thumbnail designer for ${context}` : 'Thumbnail designer';
  if (/\bdesigner|ui|figma|brand\b/.test(lower)) return context ? `Designer for ${context}` : 'Designer';
  if (/\bdeveloper|react|app|website|landing page|builder|coding\b/.test(lower)) {
    return context ? `Builder for ${context}` : 'Builder for a creator project';
  }
  if (/\bsocial|growth|tiktok|instagram|twitter|x\b/.test(lower)) {
    return context ? `Growth help for ${context}` : 'Social growth help';
  }
  if (/\bassistant|ops|operations\b/.test(lower)) return 'Creator operations assistant';
  const words = text.split(/\s+/).slice(0, 8).join(' ');
  return words.length > 0 ? sentenceCase(words) : 'Creator opportunity';
}

function inferCreatorContext(text: string) {
  const match = text.match(/\b(?:for|on|with)\s+(?:my\s+)?(.+?)(?:,|\.|;|$)/i);
  return match?.[1]?.trim().replace(/\s+/g, ' ').slice(0, 52);
}

function inferShortSummary(title: string, prompt: string) {
  return `${title}. ${prompt.length > 110 ? prompt.slice(0, 107).trim() + '...' : prompt}`;
}

function inferCategory(lower: string): OpportunityDraft['category'] {
  if (/\bvideo|edit|clip|shorts|capcut|youtube|tiktok|podcast\b/.test(lower)) return 'video_editing';
  if (/\bphoto|camera|videography\b/.test(lower)) return 'photography';
  if (/\bdesign|thumbnail|figma|ui|brand\b/.test(lower)) return 'graphic_design';
  if (/\bcode|developer|react|native|app|website|webflow|framer|shopify|supabase\b/.test(lower)) return 'web_development';
  if (/\bsocial|growth|instagram|twitter|x|community\b/.test(lower)) return 'social_media';
  if (/\bcopy|script|newsletter|email\b/.test(lower)) return 'copywriting';
  if (/\bsales|lead|outreach\b/.test(lower)) return 'sales';
  if (/\bassistant|ops|operations\b/.test(lower)) return 'operations';
  return 'content_creation';
}

function inferIndustry(lower: string, fallback: string) {
  if (/\bcrypto|defi|web3|token|wallet|trading\b/.test(lower)) return 'Blockchain / Crypto';
  if (/\byoutube|tiktok|creator|stream|podcast|content\b/.test(lower)) return 'Creator Economy';
  if (/\bshopify|ecom|e-commerce|commerce\b/.test(lower)) return 'E-commerce';
  if (/\bsaas|software|app|startup\b/.test(lower)) return 'SaaS';
  return fallback || 'Creator Economy';
}

function inferIdealCandidate(skills: string[]) {
  const skillText = skills.length > 0 ? ` with ${skills.slice(0, 4).join(', ')}` : '';
  return `Strong fit if you can show relevant work${skillText}, communicate clearly, and move quickly without needing heavy direction.`;
}

function inferSkills(lower: string) {
  const matches: string[] = [];
  const add = (pattern: RegExp, skill: string) => {
    if (pattern.test(lower)) matches.push(skill);
  };

  add(/\bshort[- ]?form|shorts|clips?\b/, 'Short-form editing');
  add(/\bcapcut\b/, 'CapCut');
  add(/\btiktok\b/, 'TikTok growth');
  add(/\byoutube|shorts\b/, 'YouTube Shorts');
  add(/\bthumbnail\b/, 'Thumbnail design');
  add(/\bstream|clipping\b/, 'Stream clipping');
  add(/\bpodcast\b/, 'Podcast editing');
  add(/\bugc\b/, 'UGC content');
  add(/\bscript\b/, 'Scriptwriting');
  add(/\bcontent strategy|content plan\b/, 'Content strategy');
  add(/\bvideo|videography|camera\b/, 'Videography');
  add(/\bmotion\b/, 'Motion graphics');
  add(/\bmeme\b/, 'Meme marketing');
  add(/\blanding page|landing\b/, 'Landing pages');
  add(/\bfunnel\b/, 'Funnel building');
  add(/\baffiliate\b/, 'Affiliate marketing');
  add(/\bpaid ads?|ads?\b/, 'Paid ads');
  add(/\bemail|newsletter\b/, 'Email marketing');
  add(/\bcommunity\b/, 'Community management');
  add(/\bdiscord\b/, 'Discord management');
  add(/\bsocial\b/, 'Social media management');
  add(/\btwitter|x growth\b/, 'X/Twitter growth');
  add(/\binstagram\b/, 'Instagram growth');
  add(/\bsales|outreach\b/, 'Sales outreach');
  add(/\blead gen|lead generation\b/, 'Lead generation');
  add(/\bvibe cod|mvp|prototype\b/, 'MVP building');
  add(/\bautomation|zapier|make\.com\b/, 'AI automations');
  add(/\bno[- ]?code\b/, 'No-code');
  add(/\bframer\b/, 'Framer');
  add(/\bwebflow\b/, 'Webflow');
  add(/\bshopify\b/, 'Shopify');
  add(/\bbubble\b/, 'Bubble');
  add(/\bsupabase\b/, 'Supabase');
  add(/\breact native\b/, 'React Native');
  add(/\bui\b/, 'UI design');
  add(/\bproduct design\b/, 'Product design');
  add(/\bcrypto\b/, 'Crypto research');
  add(/\btrading\b/, 'Trading content');
  add(/\bdefi\b/, 'DeFi');
  add(/\bwallet\b/, 'Wallet tracking');
  add(/\bmeme coin\b/, 'Meme coin research');
  add(/\btoken\b/, 'Token research');
  add(/\bon[- ]?chain\b/, 'On-chain analysis');

  return uniqueStrings(matches.length > 0 ? matches : ['Communication', 'Creator operations']);
}

function uniqueStrings(values: string[]) {
  return [...new Map(values.map((value) => [value.toLowerCase(), value])).values()];
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  magicBody: {
    color: theme.colors.muted,
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
