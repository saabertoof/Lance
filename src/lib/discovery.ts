import { loadPublicBusinessesByIds } from '@/lib/business';
import { loadPublicOpportunitiesByIds } from '@/lib/opportunity';
import { supabase } from '@/lib/supabase';
import type { BusinessRecord } from '@/types/business';
import type {
  BusinessFilters,
  OpportunityFilters,
  PeopleFilters,
} from '@/types/discovery';
import type { OpportunityRecord } from '@/types/opportunity';
import {
  availabilityOptions,
  experienceOptions,
  opportunityInterestOptions,
  profileLinkOptions,
  remotePreferenceOptions,
  type ProfileLink,
  type PublicProfile,
} from '@/types/profile';

export const SEARCH_PAGE_SIZE = 20;
export const DISCOVER_BATCH_SIZE = 12;

type RawPublicProfile = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  remote_preference: PublicProfile['remotePreference'] | null;
  primary_role: string | null;
  headline: string | null;
  bio: string | null;
  experience_level: PublicProfile['experienceLevel'] | null;
  availability: PublicProfile['availability'] | null;
  industry_experience: string[] | null;
  updated_at: string;
  profile_skills?: {
    skills?: { name?: string } | { name?: string }[] | null;
  }[];
  profile_opportunity_interests?: {
    interest?: PublicProfile['opportunityInterests'][number];
  }[];
  user_links?: {
    label: string;
    link_type: ProfileLink['linkType'];
    value: string;
    display_order: number;
  }[];
};

type SearchResult<T> = {
  items: T[];
  total: number;
};

const publicProfileSelect = `
  id,
  display_name,
  username,
  avatar_url,
  city,
  remote_preference,
  primary_role,
  headline,
  bio,
  experience_level,
  availability,
  industry_experience,
  updated_at,
  profile_skills(skills(name)),
  profile_opportunity_interests(interest),
  user_links(label, link_type, value, display_order)
`;

export async function loadPublicProfile(profileId: string) {
  const [profile] = await loadPublicProfilesByIds([profileId]);
  return profile ?? null;
}

export async function loadPublicProfilesByIds(profileIds: string[]) {
  if (profileIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select(publicProfileSelect)
    .in('id', profileIds)
    .not('onboarding_completed_at', 'is', null)
    .is('deleted_at', null);

  if (error) throw error;

  const byId = new Map(
    (data ?? []).map((row) => {
      const profile = mapPublicProfile(row as RawPublicProfile);
      return [profile.id, profile] as const;
    }),
  );

  return profileIds
    .map((profileId) => byId.get(profileId))
    .filter((profile): profile is PublicProfile => Boolean(profile));
}

export async function loadSkillOptions() {
  const { data, error } = await supabase
    .from('skills')
    .select('name')
    .order('name')
    .limit(200);

  if (error) throw error;
  return (data ?? []).map((skill) => skill.name);
}

export async function searchPeople(
  query: string,
  filters: PeopleFilters,
  offset = 0,
  limit = SEARCH_PAGE_SIZE,
): Promise<SearchResult<PublicProfile>> {
  const { data, error } = await supabase.rpc('search_phase4_people', {
    p_query: query.trim(),
    p_primary_role: filters.primaryRole || null,
    p_skills: filters.skills,
    p_experience: filters.experienceLevel || null,
    p_availability: filters.availability || null,
    p_location: filters.location.trim() || null,
    p_remote_preference: filters.remotePreference || null,
    p_interests: filters.opportunityInterests,
    p_industries: filters.industryExperience,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data ?? []) as { profile_id: string; total_count: number }[];
  return {
    items: await loadPublicProfilesByIds(rows.map((row) => row.profile_id)),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

export async function searchOpportunities(
  query: string,
  filters: OpportunityFilters,
  offset = 0,
  limit = SEARCH_PAGE_SIZE,
  excludeOwned = false,
): Promise<SearchResult<OpportunityRecord>> {
  const { data, error } = await supabase.rpc('search_phase4_opportunities', {
    p_query: query.trim(),
    p_category: filters.category || null,
    p_skills: filters.skills,
    p_industry: filters.industry || null,
    p_compensation_type: filters.compensationType || null,
    p_paid_only: filters.paidOnly,
    p_work_type: filters.workType || null,
    p_workplace: filters.workplace || null,
    p_commitment: filters.timeCommitment || null,
    p_experience: filters.experienceLevel || null,
    p_location: filters.location.trim() || null,
    p_exclude_owned: excludeOwned,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data ?? []) as { opportunity_id: string; total_count: number }[];
  return {
    items: await loadPublicOpportunitiesByIds(rows.map((row) => row.opportunity_id)),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

export async function searchBusinesses(
  query: string,
  filters: BusinessFilters,
  offset = 0,
  limit = SEARCH_PAGE_SIZE,
): Promise<SearchResult<BusinessRecord>> {
  const { data, error } = await supabase.rpc('search_phase4_businesses', {
    p_query: query.trim(),
    p_business_type: filters.businessType || null,
    p_business_size: filters.businessSize || null,
    p_industry: filters.industry || null,
    p_location: filters.location.trim() || null,
    p_remote_status: filters.remoteStatus || null,
    p_has_active_opportunities: filters.hasActiveOpportunities,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data ?? []) as { business_id: string; total_count: number }[];
  return {
    items: await loadPublicBusinessesByIds(rows.map((row) => row.business_id)),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

export function formatDiscoveryError(error: unknown) {
  if (__DEV__ && error && typeof error === 'object') {
    const details = error as { code?: string; message?: string; name?: string };
    console.warn('[Discover/Search operation]', {
      code: details.code ?? null,
      message: details.message ?? 'Unknown error',
      name: details.name ?? 'UnknownError',
    });
  }

  return 'Lance could not load these results. Check your connection and try again.';
}

function mapPublicProfile(row: RawPublicProfile): PublicProfile {
  const skills = (row.profile_skills ?? [])
    .map((item) => {
      const relation = item.skills;
      return Array.isArray(relation) ? relation[0]?.name : relation?.name;
    })
    .filter((name): name is string => Boolean(name));
  const interests = (row.profile_opportunity_interests ?? [])
    .map((item) => item.interest)
    .filter(
      (interest): interest is PublicProfile['opportunityInterests'][number] =>
        typeof interest === 'string' &&
        opportunityInterestOptions.some((option) => option.value === interest),
    );
  const links = (row.user_links ?? [])
    .filter((link) => profileLinkOptions.some((option) => option.value === link.link_type))
    .sort((left, right) => left.display_order - right.display_order)
    .map((link) => ({
      label: link.label,
      linkType: link.link_type,
      value: link.value,
      displayOrder: link.display_order,
    }));

  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username ?? '',
    avatarUrl: row.avatar_url,
    city: row.city ?? '',
    remotePreference: remotePreferenceOptions.some(
      (option) => option.value === row.remote_preference,
    )
      ? (row.remote_preference as PublicProfile['remotePreference'])
      : 'flexible',
    primaryRole: row.primary_role ?? '',
    headline: row.headline ?? '',
    bio: row.bio ?? '',
    experienceLevel: experienceOptions.some(
      (option) => option.value === row.experience_level,
    )
      ? (row.experience_level as PublicProfile['experienceLevel'])
      : 'just_starting',
    availability: availabilityOptions.some(
      (option) => option.value === row.availability,
    )
      ? (row.availability as PublicProfile['availability'])
      : 'flexible_hours',
    skills,
    opportunityInterests: interests,
    industryExperience: row.industry_experience ?? [],
    links,
    updatedAt: row.updated_at,
  };
}
