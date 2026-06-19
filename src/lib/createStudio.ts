import { supabase } from '@/lib/supabase';
import type { BusinessStatus, BusinessType } from '@/types/business';
import type {
  OpportunityStatus,
  WorkType,
} from '@/types/opportunity';

export type CreateStudioDraft = {
  id: string;
  title: string;
  updatedAt: string;
  workType: WorkType;
};

export type CreateStudioOpportunity = {
  id: string;
  status: OpportunityStatus;
  title: string;
  updatedAt: string;
};

export type CreateStudioBusiness = {
  businessType: BusinessType;
  id: string;
  logoUrl: string | null;
  name: string;
  status: BusinessStatus;
  updatedAt: string;
};

export type CreateStudioSummary = {
  businesses: CreateStudioBusiness[];
  drafts: CreateStudioDraft[];
  failedSections: ('businesses' | 'drafts' | 'opportunities')[];
  opportunities: CreateStudioOpportunity[];
};

type RawDraft = {
  id: string;
  opportunity_type: WorkType;
  title: string;
  updated_at: string;
};

type RawOpportunity = {
  id: string;
  status: OpportunityStatus;
  title: string;
  updated_at: string;
};

type RawBusiness = {
  business_type: BusinessType;
  id: string;
  logo_url: string | null;
  name: string;
  status: BusinessStatus;
  updated_at: string;
};

export async function loadCreateStudioSummary(
  ownerId: string,
): Promise<CreateStudioSummary> {
  const [draftResult, opportunityResult, businessResult] =
    await Promise.allSettled([
      loadDraftSummaries(ownerId),
      loadOpportunitySummaries(ownerId),
      loadBusinessSummaries(ownerId),
    ]);

  const failedSections: CreateStudioSummary['failedSections'] = [];
  if (draftResult.status === 'rejected') failedSections.push('drafts');
  if (opportunityResult.status === 'rejected') {
    failedSections.push('opportunities');
  }
  if (businessResult.status === 'rejected') failedSections.push('businesses');

  return {
    businesses:
      businessResult.status === 'fulfilled' ? businessResult.value : [],
    drafts: draftResult.status === 'fulfilled' ? draftResult.value : [],
    failedSections,
    opportunities:
      opportunityResult.status === 'fulfilled' ? opportunityResult.value : [],
  };
}

async function loadDraftSummaries(ownerId: string) {
  const { data, error } = await supabase
    .from('opportunities')
    .select('id, title, opportunity_type, updated_at')
    .eq('owner_profile_id', ownerId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) throw error;

  return ((data ?? []) as RawDraft[]).map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
    workType: row.opportunity_type,
  }));
}

async function loadOpportunitySummaries(ownerId: string) {
  const { data, error } = await supabase
    .from('opportunities')
    .select('id, title, status, updated_at')
    .eq('owner_profile_id', ownerId)
    .in('status', ['published', 'paused', 'closed'])
    .order('updated_at', { ascending: false })
    .limit(6);

  if (error) throw error;

  return ((data ?? []) as RawOpportunity[]).map((row) => ({
    id: row.id,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
  }));
}

async function loadBusinessSummaries(ownerId: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, business_type, status, logo_url, updated_at')
    .eq('owner_profile_id', ownerId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(6);

  if (error) throw error;

  return ((data ?? []) as RawBusiness[]).map((row) => ({
    businessType: row.business_type,
    id: row.id,
    logoUrl: row.logo_url,
    name: row.name,
    status: row.status,
    updatedAt: row.updated_at,
  }));
}
