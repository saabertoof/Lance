import { z } from 'zod';

import { parseDateValue } from '@/lib/date';
import { normalizeListEntry } from '@/lib/profile';
import { slugify } from '@/lib/business';
import { supabase } from '@/lib/supabase';
import type { BusinessRecord } from '@/types/business';
import {
  compensationTypeOptions,
  createEmptyOpportunityDraft,
  opportunityCategoryOptions,
  OpportunityDraft,
  OpportunityRecord,
  OpportunityStatus,
  ratePeriodOptions,
  timeCommitmentOptions,
  workArrangementOptions,
  workTypeOptions,
  opportunityExperienceOptions,
} from '@/types/opportunity';

const opportunitySchema = z.object({
  title: z.string().trim().min(3, 'Enter an opportunity title.').max(120),
  category: z.enum(opportunityCategoryOptions.map((option) => option.value)),
  shortSummary: z.string().trim().min(10).max(180),
  fullDescription: z.string().trim().min(20).max(5000),
  workType: z.enum(workTypeOptions.map((option) => option.value)),
  compensationType: z.enum(compensationTypeOptions.map((option) => option.value)),
  workplace: z.enum(workArrangementOptions.map((option) => option.value)),
  timeCommitment: z.enum(timeCommitmentOptions.map((option) => option.value)),
  experienceLevel: z.enum(opportunityExperienceOptions.map((option) => option.value)),
  skills: z.array(z.string().min(1).max(50)).min(1, 'Add at least one required skill.'),
  industry: z.string().trim().min(2),
  currency: z.string().trim().regex(/^[A-Z]{3}$/, 'Use a three-letter currency code.'),
});

const warningCompensationTypes = new Set([
  'commission',
  'revenue_share',
  'equity',
  'unpaid',
  'negotiable',
  'mixed',
]);

type RawOpportunity = {
  id: string;
  owner_profile_id: string;
  business_id: string | null;
  posted_as_business: boolean;
  title: string;
  slug: string | null;
  category: OpportunityDraft['category'] | null;
  short_summary: string;
  full_description: string | null;
  opportunity_type: OpportunityDraft['workType'];
  compensation_type: OpportunityDraft['compensationType'];
  compensation_min: number | null;
  compensation_max: number | null;
  compensation_currency: string;
  compensation_label: string | null;
  rate_period: OpportunityDraft['ratePeriod'] | null;
  commitment: OpportunityDraft['timeCommitment'] | null;
  workplace: OpportunityDraft['workplace'];
  location: string | null;
  expected_start_date: string | null;
  expires_at: string | null;
  experience_requirements: OpportunityDraft['experienceLevel'] | null;
  external_url: string | null;
  industry: string | null;
  portfolio_required: boolean;
  people_needed: number | null;
  additional_requirements: string | null;
  lance_disclaimer_accepted_at: string | null;
  status: OpportunityStatus;
  published_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name?: string;
    avatar_url?: string | null;
  } | {
    display_name?: string;
    avatar_url?: string | null;
  }[] | null;
  businesses?: {
    id?: string;
    name?: string;
    logo_url?: string | null;
    slug?: string;
    business_type?: BusinessRecord['businessType'];
  } | {
    id?: string;
    name?: string;
    logo_url?: string | null;
    slug?: string;
    business_type?: BusinessRecord['businessType'];
  }[] | null;
  opportunity_skills?: {
    skills?: { name?: string } | { name?: string }[] | null;
  }[];
};

export function needsCompensationWarning(compensationType: OpportunityDraft['compensationType']) {
  return warningCompensationTypes.has(compensationType);
}

export function formatCompensation(opportunity: OpportunityDraft) {
  const minimum = opportunity.compensationMin ? Number(opportunity.compensationMin) : null;
  const maximum = opportunity.compensationMax ? Number(opportunity.compensationMax) : null;
  const typeLabel =
    compensationTypeOptions.find((option) => option.value === opportunity.compensationType)
      ?.label ?? opportunity.compensationType;
  const periodLabel = opportunity.ratePeriod
    ? ratePeriodOptions.find((option) => option.value === opportunity.ratePeriod)?.label
    : null;

  if (minimum && maximum) {
    return `${opportunity.currency} ${minimum.toLocaleString()}-${maximum.toLocaleString()}${
      periodLabel ? ` · ${periodLabel}` : ''
    }`;
  }

  if (minimum) {
    return `From ${opportunity.currency} ${minimum.toLocaleString()}${
      periodLabel ? ` · ${periodLabel}` : ''
    }`;
  }

  if (maximum) {
    return `Up to ${opportunity.currency} ${maximum.toLocaleString()}${
      periodLabel ? ` · ${periodLabel}` : ''
    }`;
  }

  return typeLabel;
}

export function validateOpportunityDraft(draft: OpportunityDraft, publishing: boolean) {
  if (draft.postingIdentity === 'business' && !draft.businessId) {
    return 'Choose the business or project posting this opportunity.';
  }

  if (!publishing) {
    if (draft.title.trim().length < 3) {
      return 'Add a title before saving a draft.';
    }

    if (draft.shortSummary.trim().length < 10) {
      return 'Add a short summary before saving a draft.';
    }

    return validateCompensation(draft);
  }

  const parsed = opportunitySchema.safeParse(draft);

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? 'Check the required opportunity fields.';
  }

  const compensationError = validateCompensation(draft);

  if (compensationError) {
    return compensationError;
  }

  if (!draft.disclaimerAccepted) {
    return 'Accept the Lance compensation disclaimer before publishing.';
  }

  if (draft.externalUrl) {
    try {
      const url = new URL(draft.externalUrl);
      if (url.protocol !== 'https:') {
        return 'The external project link must use HTTPS.';
      }
    } catch {
      return 'Enter a valid external project link.';
    }
  }

  if (draft.expectedStartDate && !parseDateValue(draft.expectedStartDate)) {
    return 'Choose a valid expected start date.';
  }

  if (draft.expirationDate && !parseDateValue(draft.expirationDate)) {
    return 'Choose a valid expiration date.';
  }

  if (
    draft.expectedStartDate &&
    draft.expirationDate &&
    draft.expirationDate < draft.expectedStartDate
  ) {
    return 'Expiration date cannot be before the expected start date.';
  }

  const peopleNeeded = Number(draft.peopleNeeded);
  if (!Number.isInteger(peopleNeeded) || peopleNeeded < 1 || peopleNeeded > 1000) {
    return 'Number of people needed must be between 1 and 1000.';
  }

  return null;
}

function validateCompensation(draft: OpportunityDraft) {
  const minimum = draft.compensationMin ? Number(draft.compensationMin) : null;
  const maximum = draft.compensationMax ? Number(draft.compensationMax) : null;

  if (minimum !== null && (!Number.isFinite(minimum) || minimum <= 0)) {
    return 'Compensation minimum must be a positive number.';
  }

  if (maximum !== null && (!Number.isFinite(maximum) || maximum <= 0)) {
    return 'Compensation maximum must be a positive number.';
  }

  if (minimum !== null && maximum !== null && maximum < minimum) {
    return 'Compensation maximum cannot be below the minimum.';
  }

  if ((minimum !== null || maximum !== null) && !draft.ratePeriod) {
    return 'Choose a rate period for numeric compensation.';
  }

  return null;
}

function opportunityPayload(
  draft: OpportunityDraft,
  ownerId: string,
  status: OpportunityStatus,
) {
  const slug =
    draft.slug ||
    `${slugify(draft.title).slice(0, 70)}-${Date.now().toString(36).slice(-6)}`;

  return {
    owner_profile_id: ownerId,
    business_id: draft.postingIdentity === 'business' ? draft.businessId : null,
    posted_as_business: draft.postingIdentity === 'business',
    title: draft.title.trim(),
    slug,
    category: draft.category,
    short_summary: draft.shortSummary.trim(),
    full_description: draft.fullDescription.trim() || null,
    opportunity_type: draft.workType,
    compensation_type: draft.compensationType,
    compensation_min: draft.compensationMin ? Number(draft.compensationMin) : null,
    compensation_max: draft.compensationMax ? Number(draft.compensationMax) : null,
    compensation_currency: draft.currency.trim().toUpperCase(),
    compensation_label: draft.compensationNotes.trim() || null,
    rate_period: draft.ratePeriod || null,
    commitment: draft.timeCommitment,
    workplace: draft.workplace,
    location: draft.location.trim() || null,
    expected_start_date: draft.expectedStartDate || null,
    expires_at: draft.expirationDate
      ? new Date(`${draft.expirationDate}T23:59:59.000Z`).toISOString()
      : null,
    experience_requirements: draft.experienceLevel,
    external_url: draft.externalUrl.trim() || null,
    industry: draft.industry,
    portfolio_required: draft.portfolioRequired,
    people_needed: draft.peopleNeeded ? Number(draft.peopleNeeded) : null,
    additional_requirements: draft.additionalRequirements.trim() || null,
    lance_disclaimer_accepted_at: draft.disclaimerAccepted
      ? new Date().toISOString()
      : null,
    status,
  };
}

export async function saveOpportunity(
  draft: OpportunityDraft,
  ownerId: string,
  status: OpportunityStatus,
) {
  const validationError = validateOpportunityDraft(draft, status === 'published');

  if (validationError) {
    throw new Error(validationError);
  }

  let row: RawOpportunity;
  const stageBeforePublishing = status === 'published' && draft.status === 'draft';
  const initialStatus = stageBeforePublishing ? 'draft' : status;

  if (draft.id) {
    const { data, error } = await supabase
      .from('opportunities')
      .update(opportunityPayload(draft, ownerId, initialStatus))
      .eq('id', draft.id)
      .eq('owner_profile_id', ownerId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    row = data as RawOpportunity;
  } else {
    const { data, error } = await supabase
      .from('opportunities')
      .insert(opportunityPayload(draft, ownerId, initialStatus))
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    row = data as RawOpportunity;
  }

  await syncOpportunitySkills(row.id, draft.skills);

  if (stageBeforePublishing) {
    const { error } = await supabase
      .from('opportunities')
      .update({
        status: 'published',
        lance_disclaimer_accepted_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('owner_profile_id', ownerId);

    if (error) {
      throw error;
    }
  }

  return row.id;
}

async function syncOpportunitySkills(opportunityId: string, skillNames: string[]) {
  const normalizedNames = [...new Set(skillNames.map(normalizeListEntry).filter(Boolean))];
  const skillIds: string[] = [];

  for (const name of normalizedNames) {
    const { data: existing, error: selectError } = await supabase
      .from('skills')
      .select('id')
      .ilike('name', name)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (existing) {
      skillIds.push(existing.id);
      continue;
    }

    const { data: created, error: insertError } = await supabase
      .from('skills')
      .insert({ name })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    skillIds.push(created.id);
  }

  const { error: deleteError } = await supabase
    .from('opportunity_skills')
    .delete()
    .eq('opportunity_id', opportunityId);

  if (deleteError) {
    throw deleteError;
  }

  if (skillIds.length > 0) {
    const { error: insertError } = await supabase.from('opportunity_skills').insert(
      skillIds.map((skillId) => ({
        opportunity_id: opportunityId,
        skill_id: skillId,
      })),
    );

    if (insertError) {
      throw insertError;
    }
  }
}

const opportunitySelect = `
  *,
  profiles!opportunities_owner_profile_id_fkey(display_name, avatar_url),
  businesses!opportunities_business_id_fkey(id, name, logo_url, slug, business_type),
  opportunity_skills(skills(name))
`;

export async function loadMyOpportunities(ownerId: string) {
  const { data, error } = await supabase
    .from('opportunities')
    .select(opportunitySelect)
    .eq('owner_profile_id', ownerId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapOpportunity(row as RawOpportunity));
}

export async function loadOpportunity(opportunityId: string) {
  const { data, error } = await supabase
    .from('opportunities')
    .select(opportunitySelect)
    .eq('id', opportunityId)
    .single();

  if (error) {
    throw error;
  }

  return mapOpportunity(data as RawOpportunity);
}

export async function loadBusinessOpportunities(businessId: string) {
  const { data, error } = await supabase
    .from('opportunities')
    .select(opportunitySelect)
    .eq('business_id', businessId)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapOpportunity(row as RawOpportunity));
}

export async function updateOpportunityStatus(
  opportunityId: string,
  ownerId: string,
  status: OpportunityStatus,
) {
  const updates: Record<string, unknown> = { status };

  if (status === 'published') {
    updates.lance_disclaimer_accepted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('opportunities')
    .update(updates)
    .eq('id', opportunityId)
    .eq('owner_profile_id', ownerId);

  if (error) {
    throw error;
  }
}

export async function deleteDraftOpportunity(opportunityId: string, ownerId: string) {
  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', opportunityId)
    .eq('owner_profile_id', ownerId)
    .eq('status', 'draft');

  if (error) {
    throw error;
  }
}

export function opportunityToDraft(opportunity: OpportunityRecord): OpportunityDraft {
  return {
    id: opportunity.id,
    postingIdentity: opportunity.postingIdentity,
    businessId: opportunity.businessId,
    title: opportunity.title,
    slug: opportunity.slug,
    category: opportunity.category,
    shortSummary: opportunity.shortSummary,
    fullDescription: opportunity.fullDescription,
    workType: opportunity.workType,
    compensationType: opportunity.compensationType,
    compensationMin: opportunity.compensationMin,
    compensationMax: opportunity.compensationMax,
    currency: opportunity.currency,
    ratePeriod: opportunity.ratePeriod,
    compensationNotes: opportunity.compensationNotes,
    workplace: opportunity.workplace,
    location: opportunity.location,
    timeCommitment: opportunity.timeCommitment,
    experienceLevel: opportunity.experienceLevel,
    skills: opportunity.skills,
    industry: opportunity.industry,
    expectedStartDate: opportunity.expectedStartDate,
    expirationDate: opportunity.expirationDate,
    portfolioRequired: opportunity.portfolioRequired,
    externalUrl: opportunity.externalUrl,
    peopleNeeded: opportunity.peopleNeeded,
    additionalRequirements: opportunity.additionalRequirements,
    disclaimerAccepted: opportunity.disclaimerAccepted,
    status: opportunity.status,
  };
}

export function formatOpportunityError(error: unknown) {
  if (error && typeof error === 'object') {
    const possibleError = error as { code?: string; message?: string; name?: string };

    if (possibleError.code === '23505') {
      return 'This opportunity link already exists. Save again to generate a new one.';
    }

    if (possibleError.code === '42501') {
      return 'You do not have permission to change this opportunity or posting identity.';
    }

    if (possibleError.name === 'Error' && possibleError.message) {
      return possibleError.message;
    }

    logOpportunityError(possibleError);
  }

  return 'The opportunity could not be saved. Check your connection and try again.';
}

function logOpportunityError(error: { code?: string; message?: string; name?: string }) {
  if (!__DEV__) return;

  console.warn('[Opportunity operation]', {
    code: error.code ?? null,
    message: error.message ?? 'Unknown error',
    name: error.name ?? 'UnknownError',
  });
}

export function groupOpportunities(opportunities: OpportunityRecord[]) {
  return {
    published: opportunities.filter((item) => item.status === 'published'),
    drafts: opportunities.filter((item) => item.status === 'draft'),
    paused: opportunities.filter((item) => item.status === 'paused'),
    closed: opportunities.filter(
      (item) => item.status === 'closed' || item.status === 'archived',
    ),
  };
}

function mapOpportunity(row: RawOpportunity): OpportunityRecord {
  const profileRelation = row.profiles;
  const profile = Array.isArray(profileRelation) ? profileRelation[0] : profileRelation;
  const businessRelation = row.businesses;
  const business = Array.isArray(businessRelation) ? businessRelation[0] : businessRelation;
  const skills = (row.opportunity_skills ?? [])
    .map((item) => {
      const skillRelation = item.skills;
      return Array.isArray(skillRelation) ? skillRelation[0]?.name : skillRelation?.name;
    })
    .filter((name): name is string => Boolean(name));
  const fallback = createEmptyOpportunityDraft();

  return {
    id: row.id,
    ownerProfileId: row.owner_profile_id,
    postingIdentity: row.posted_as_business ? 'business' : 'personal',
    businessId: row.business_id,
    title: row.title,
    slug: row.slug ?? '',
    category: row.category ?? fallback.category,
    shortSummary: row.short_summary,
    fullDescription: row.full_description ?? '',
    workType: row.opportunity_type,
    compensationType: row.compensation_type,
    compensationMin: row.compensation_min?.toString() ?? '',
    compensationMax: row.compensation_max?.toString() ?? '',
    currency: row.compensation_currency,
    ratePeriod: row.rate_period ?? '',
    compensationNotes: row.compensation_label ?? '',
    workplace: row.workplace,
    location: row.location ?? '',
    timeCommitment: row.commitment ?? fallback.timeCommitment,
    experienceLevel: row.experience_requirements ?? fallback.experienceLevel,
    skills,
    industry: row.industry ?? 'Other',
    expectedStartDate: row.expected_start_date ?? '',
    expirationDate: row.expires_at?.slice(0, 10) ?? '',
    portfolioRequired: row.portfolio_required,
    externalUrl: row.external_url ?? '',
    peopleNeeded: row.people_needed?.toString() ?? '1',
    additionalRequirements: row.additional_requirements ?? '',
    disclaimerAccepted: Boolean(row.lance_disclaimer_accepted_at),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    closedAt: row.closed_at,
    archivedAt: row.archived_at,
    poster: {
      name: row.posted_as_business ? business?.name ?? 'Business' : profile?.display_name ?? 'Lance member',
      imageUrl: row.posted_as_business ? business?.logo_url ?? null : profile?.avatar_url ?? null,
      identityType: row.posted_as_business ? 'business' : 'personal',
      business: null,
    },
  };
}
