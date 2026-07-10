import { supabase } from '@/lib/supabase';
import type { OpportunityDraft } from '@/types/opportunity';

type MagicDraftPayload = {
  additional_requirements: string;
  category: OpportunityDraft['category'];
  compensation_max: string;
  compensation_min: string;
  compensation_notes: string;
  compensation_type: OpportunityDraft['compensationType'];
  currency: string;
  experience_level: OpportunityDraft['experienceLevel'];
  expiration_date: string;
  expected_start_date: string;
  full_description: string;
  industry: string;
  location_country: string;
  location_id?: string | null;
  location_label: string;
  location_region: string;
  people_needed: string;
  portfolio_required: boolean;
  rate_period: OpportunityDraft['ratePeriod'] | '';
  share_caption: string;
  share_hook: string;
  short_summary: string;
  skills: string[];
  time_commitment: OpportunityDraft['timeCommitment'];
  title: string;
  workplace: OpportunityDraft['workplace'];
  work_type: OpportunityDraft['workType'];
};

type MagicDraftResponse = {
  draft?: MagicDraftPayload;
  requestId?: string;
  source?: 'openai';
};

export type MagicOpportunityDraftApiResult = {
  draft: Partial<OpportunityDraft>;
  requestId: string;
  shareCaption: string;
  shareHook: string;
  source: 'openai';
};

export async function generateMagicOpportunityDraft(
  prompt: string,
  currentDraft: OpportunityDraft,
): Promise<MagicOpportunityDraftApiResult> {
  const { data, error } = await supabase.functions.invoke<MagicDraftResponse>(
    'magic-opportunity-draft',
    {
      body: {
        prompt,
        currentDraft,
      },
    },
  );

  if (error) throw new Error(await safeMagicDraftMessage(error));
  if (!data?.draft || !data.requestId) {
    throw new Error('Magic Draft could not create that opportunity.');
  }

  return {
    draft: mapMagicDraft(data.draft),
    requestId: data.requestId,
    shareCaption: data.draft.share_caption,
    shareHook: data.draft.share_hook,
    source: 'openai',
  };
}

function mapMagicDraft(draft: MagicDraftPayload): Partial<OpportunityDraft> {
  return {
    additionalRequirements: draft.additional_requirements,
    category: draft.category,
    compensationMax: draft.compensation_max,
    compensationMin: draft.compensation_min,
    compensationNotes: draft.compensation_notes,
    compensationType: draft.compensation_type,
    currency: draft.currency,
    experienceLevel: draft.experience_level,
    expirationDate: draft.expiration_date,
    expectedStartDate: draft.expected_start_date,
    fullDescription: draft.full_description,
    industry: draft.industry,
    location: draft.location_label,
    locationCountry: draft.location_country,
    locationId: draft.location_id ?? null,
    locationRegion: draft.location_region,
    peopleNeeded: draft.people_needed,
    portfolioRequired: draft.portfolio_required,
    ratePeriod: draft.rate_period,
    shortSummary: draft.short_summary,
    skills: draft.skills,
    timeCommitment: draft.time_commitment,
    title: draft.title,
    workplace: draft.workplace,
    workType: draft.work_type,
  };
}

async function safeMagicDraftMessage(error: {
  context?: unknown;
  message?: string;
}) {
  let message = error.message ?? '';
  const context = error.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json() as {
        error?: string;
        message?: string;
      };
      message = `${body.error ?? ''} ${body.message ?? ''}`.trim() || message;
    } catch {
      // The generic safe fallback below handles non-JSON function errors.
    }
  }
  if (message.includes('configured') || message.includes('not_configured')) {
    return "Magic Draft isn't configured yet.";
  }
  if (message.includes('professional opportunity')) {
    return 'Magic Draft can only help write professional opportunity drafts.';
  }
  if (message.includes('session') || message.includes('JWT')) {
    return 'Your session expired. Sign in again to use Magic Draft.';
  }
  if (message.includes('too long') || message.includes('timeout')) {
    return 'Magic Draft took too long. Your text is still here.';
  }
  return 'Magic Draft is temporarily unavailable.';
}
