import { loadPublicBusinessesByIds } from '@/lib/business';
import { loadPublicOpportunitiesByIds } from '@/lib/opportunity';
import { supabase } from '@/lib/supabase';
import { signProfileMedia } from '@/lib/profilePolish';
import {
  filterBlockedOpportunityIds,
  filterBlockedProfileIds,
} from '@/lib/communication';
import { locationCatalog, skillCatalog } from '@/constants/catalogs';
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
import {
  createEmptyProfilePolish,
  defaultProfileTheme,
  type CustomProfileLink,
  type PortfolioItem,
  type ProfilePrompt,
} from '@/types/profilePolish';

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
  banner_path: string | null;
  location_id: string | null;
  location_region: string | null;
  location_country: string | null;
  profile_template: PublicProfile['polish']['theme']['template'] | null;
  profile_accent: PublicProfile['polish']['theme']['accent'] | null;
  profile_header_alignment: PublicProfile['polish']['theme']['headerAlignment'] | null;
  profile_card_shape: PublicProfile['polish']['theme']['cardShape'] | null;
  profile_background: PublicProfile['polish']['theme']['background'] | null;
  profile_skills?: {
    skills?: { name?: string } | { name?: string }[] | null;
  }[];
  profile_opportunity_interests?: {
    interest?: PublicProfile['opportunityInterests'][number];
  }[];
  user_links?: {
    id: string;
    label: string;
    link_type: string;
    value: string;
    display_order: number;
    icon_key: string | null;
  }[];
  profile_current_intents?: {
    intent: PublicProfile['polish']['currentIntents'][number];
    visibility: string;
    display_order: number;
  }[];
  profile_prompts?: {
    id: string;
    prompt_key: string;
    answer: string;
    display_order: number;
  }[];
  portfolio_items?: {
    id: string;
    item_type: PortfolioItem['itemType'];
    title: string;
    description: string | null;
    media_url: string | null;
    storage_path: string | null;
    thumbnail_url: string | null;
    external_url: string | null;
    accessibility_description: string | null;
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
  banner_path,
  location_id,
  location_region,
  location_country,
  profile_template,
  profile_accent,
  profile_header_alignment,
  profile_card_shape,
  profile_background,
  updated_at,
  profile_skills(skills(name)),
  profile_opportunity_interests(interest),
  user_links(id, label, link_type, value, display_order, icon_key),
  profile_current_intents(intent, visibility, display_order),
  profile_prompts(id, prompt_key, answer, display_order),
  portfolio_items(id, item_type, title, description, media_url, storage_path, thumbnail_url, external_url, accessibility_description, display_order)
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

  const rows = (data ?? []) as unknown as RawPublicProfile[];
  const mediaPaths = rows.flatMap((row) => [
    row.banner_path,
    ...(row.portfolio_items ?? []).flatMap((item) => [
      item.storage_path,
      item.thumbnail_url?.startsWith('profile-media:')
        ? item.thumbnail_url.slice('profile-media:'.length)
        : null,
    ]),
  ]).filter((path): path is string => Boolean(path));
  const signedUrls = await signProfileMedia(mediaPaths);

  const byId = new Map(
    rows.map((row) => {
      const profile = mapPublicProfile(row, signedUrls);
      return [profile.id, profile] as const;
    }),
  );

  return profileIds
    .map((profileId) => byId.get(profileId))
    .filter((profile): profile is PublicProfile => Boolean(profile));
}

export async function loadSkillOptions() {
  return skillCatalog.map((skill) => skill.label);
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
  const visibleIds = await filterBlockedProfileIds(rows.map((row) => row.profile_id));
  return {
    items: await loadPublicProfilesByIds(visibleIds),
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
  const visibleIds = await filterBlockedOpportunityIds(
    rows.map((row) => row.opportunity_id),
  );
  return {
    items: await loadPublicOpportunitiesByIds(visibleIds),
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

function mapPublicProfile(
  row: RawPublicProfile,
  signedUrls: Map<string, string>,
): PublicProfile {
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
      linkType: link.link_type as ProfileLink['linkType'],
      value: link.value,
      displayOrder: link.display_order,
    }));
  const customLinks = (row.user_links ?? [])
    .filter((link) => link.link_type === 'custom')
    .sort((left, right) => left.display_order - right.display_order)
    .map(
      (link): CustomProfileLink => ({
        id: link.id,
        label: link.label,
        url: link.value,
        iconKey: link.icon_key,
        displayOrder: link.display_order,
      }),
    );
  const location =
    locationCatalog.find((option) => option.id === row.location_id) ??
    (row.location_id
      ? {
          id: row.location_id,
          label: [row.city, row.location_region, row.location_country]
            .filter(Boolean)
            .join(', '),
          city: row.city,
          region: row.location_region,
          country: row.location_country ?? '',
          search: [row.city, row.location_region, row.location_country]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        }
      : null);
  const polish = createEmptyProfilePolish(row.city ?? '');
  polish.bannerPath = row.banner_path;
  polish.bannerUrl = row.banner_path ? signedUrls.get(row.banner_path) ?? null : null;
  polish.location = location;
  polish.currentIntents = (row.profile_current_intents ?? [])
    .filter((intent) => intent.visibility === 'public')
    .sort((left, right) => left.display_order - right.display_order)
    .map((intent) => intent.intent);
  polish.prompts = (row.profile_prompts ?? [])
    .sort((left, right) => left.display_order - right.display_order)
    .map(
      (prompt): ProfilePrompt => ({
        id: prompt.id,
        promptKey: prompt.prompt_key,
        answer: prompt.answer,
        displayOrder: prompt.display_order,
      }),
    );
  polish.theme = {
    template: row.profile_template ?? defaultProfileTheme.template,
    accent: row.profile_accent ?? defaultProfileTheme.accent,
    headerAlignment:
      row.profile_header_alignment ?? defaultProfileTheme.headerAlignment,
    cardShape: row.profile_card_shape ?? defaultProfileTheme.cardShape,
    background: row.profile_background ?? defaultProfileTheme.background,
  };
  polish.portfolio = (row.portfolio_items ?? [])
    .sort((left, right) => left.display_order - right.display_order)
    .map(
      (item): PortfolioItem => ({
        id: item.id,
        itemType: item.item_type,
        title: item.title,
        caption: item.description ?? '',
        mediaUrl:
          (item.storage_path ? signedUrls.get(item.storage_path) : item.media_url) ?? null,
        storagePath: item.storage_path,
        thumbnailUrl: item.thumbnail_url?.startsWith('profile-media:')
          ? signedUrls.get(item.thumbnail_url.slice('profile-media:'.length)) ?? null
          : item.thumbnail_url,
        externalUrl: item.external_url,
        accessibilityDescription: item.accessibility_description ?? '',
        displayOrder: item.display_order,
      }),
    );
  polish.customLinks = customLinks;

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
    polish,
    updatedAt: row.updated_at,
  };
}
