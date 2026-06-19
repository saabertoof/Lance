import {
  createEmptySearchPlan,
  normalizeSearchPlan,
  type SearchPlanTarget,
  type SearchPlanV1,
} from '../../supabase/functions/_shared/search-plan';

import {
  industryCatalog,
  locationCatalog,
  skillCatalog,
} from '@/constants/catalogs';
import type {
  BusinessFilters,
  OpportunityFilters,
  PeopleFilters,
  SearchMode,
} from '@/types/discovery';
import type { OpportunityRecord } from '@/types/opportunity';
import type { PublicProfile } from '@/types/profile';
import type { BusinessRecord } from '@/types/business';

export type SearchExecutionState = {
  businessFilters: BusinessFilters;
  mode: SearchMode;
  opportunityFilters: OpportunityFilters;
  peopleFilters: PeopleFilters;
  query: string;
};

export type SearchPlanChip = {
  id: string;
  label: string;
};

const catalogs = {
  industries: industryCatalog,
  locations: locationCatalog,
  skills: skillCatalog.map((skill) => skill.label),
};

export function normalizeClientSearchPlan(plan: SearchPlanV1) {
  return normalizeSearchPlan(plan, catalogs);
}

export function searchModeToTarget(mode: SearchMode): SearchPlanTarget {
  return mode === 'opportunities' ? 'jobs' : mode;
}

export function targetToSearchMode(target: SearchPlanTarget): SearchMode {
  return target === 'jobs' ? 'opportunities' : target;
}

export function planToSearchState(plan: SearchPlanV1): SearchExecutionState {
  const normalized = normalizeClientSearchPlan(plan);
  return {
    mode: targetToSearchMode(normalized.target_type),
    query: normalized.keywords.join(' '),
    peopleFilters: {
      primaryRole: normalized.people_filters.primary_roles[0] ?? '',
      skills: normalized.people_filters.skills,
      experienceLevel:
        normalized.people_filters.experience_levels[0] ?? '',
      availability: normalized.people_filters.availability[0] ?? '',
      location: normalized.location_terms[0] ?? '',
      remotePreference:
        normalized.people_filters.remote_preferences[0] ?? '',
      opportunityInterests:
        normalized.people_filters.opportunity_interests,
      industryExperience: normalized.people_filters.industries,
    },
    opportunityFilters: {
      category: normalized.job_filters.categories[0] ?? '',
      skills: normalized.job_filters.required_skills,
      industry: normalized.job_filters.industries[0] ?? '',
      compensationType:
        normalized.job_filters.compensation_types[0] ?? '',
      paidOnly: normalized.job_filters.clearly_paid_only,
      workType: normalized.job_filters.work_types[0] ?? '',
      workplace: normalized.job_filters.work_arrangements[0] ?? '',
      timeCommitment: normalized.job_filters.time_commitments[0] ?? '',
      experienceLevel:
        normalized.job_filters.experience_levels[0] ?? '',
      location: normalized.location_terms[0] ?? '',
    },
    businessFilters: {
      businessType: normalized.business_filters.business_types[0] ?? '',
      businessSize: normalized.business_filters.business_sizes[0] ?? '',
      industry: normalized.business_filters.industries[0] ?? '',
      location: normalized.location_terms[0] ?? '',
      remoteStatus: normalized.business_filters.remote_statuses[0] ?? '',
      hasActiveOpportunities:
        normalized.business_filters.has_active_jobs,
    },
  };
}

export function searchStateToPlan(
  state: SearchExecutionState,
  originalQuery: string | null = null,
): SearchPlanV1 {
  const plan = createEmptySearchPlan(searchModeToTarget(state.mode));
  plan.original_intent_summary =
    originalQuery?.trim() || suggestedSearchName(state);
  plan.keywords = state.query.trim() ? [state.query.trim()] : [];
  plan.location_terms = [
    state.mode === 'people'
      ? state.peopleFilters.location
      : state.mode === 'opportunities'
        ? state.opportunityFilters.location
        : state.businessFilters.location,
  ].filter(Boolean);
  plan.sort = state.mode === 'opportunities' ? 'newest' : 'relevance';
  plan.people_filters = {
    primary_roles: valueArray(state.peopleFilters.primaryRole),
    skills: state.peopleFilters.skills,
    industries: state.peopleFilters.industryExperience,
    experience_levels: valueArray(state.peopleFilters.experienceLevel),
    availability: valueArray(state.peopleFilters.availability),
    remote_preferences: valueArray(state.peopleFilters.remotePreference),
    current_intents: [],
    opportunity_interests: state.peopleFilters.opportunityInterests,
  };
  plan.job_filters = {
    categories: valueArray(state.opportunityFilters.category),
    required_skills: state.opportunityFilters.skills,
    industries: valueArray(state.opportunityFilters.industry),
    compensation_types: valueArray(
      state.opportunityFilters.compensationType,
    ),
    clearly_paid_only: state.opportunityFilters.paidOnly,
    work_types: valueArray(state.opportunityFilters.workType),
    work_arrangements: valueArray(state.opportunityFilters.workplace),
    time_commitments: valueArray(state.opportunityFilters.timeCommitment),
    experience_levels: valueArray(
      state.opportunityFilters.experienceLevel,
    ),
    posting_identity_types: [],
    newest_only: true,
  };
  plan.business_filters = {
    business_types: valueArray(state.businessFilters.businessType),
    business_sizes: valueArray(state.businessFilters.businessSize),
    industries: valueArray(state.businessFilters.industry),
    remote_statuses: valueArray(state.businessFilters.remoteStatus),
    has_active_jobs: state.businessFilters.hasActiveOpportunities,
  };
  return normalizeClientSearchPlan(plan);
}

export function suggestedSearchName(state: SearchExecutionState) {
  const labels = [
    state.query.trim(),
    state.mode === 'people'
      ? state.peopleFilters.primaryRole ||
        state.peopleFilters.skills[0] ||
        state.peopleFilters.location
      : state.mode === 'opportunities'
        ? state.opportunityFilters.category ||
          state.opportunityFilters.skills[0] ||
          state.opportunityFilters.location
        : state.businessFilters.businessType ||
          state.businessFilters.industry ||
          state.businessFilters.location,
  ].filter(Boolean);
  const fallback =
    state.mode === 'people'
      ? 'People search'
      : state.mode === 'opportunities'
        ? 'Job search'
        : 'Business search';
  return labels.join(' - ').slice(0, 72) || fallback;
}

export function getSearchPlanChips(plan: SearchPlanV1): SearchPlanChip[] {
  const chips: SearchPlanChip[] = [
    ...plan.keywords.map((value, index) => ({
      id: `keywords:${index}`,
      label: value,
    })),
    ...plan.location_terms.map((value, index) => ({
      id: `location_terms:${index}`,
      label: value,
    })),
  ];
  const groups =
    plan.target_type === 'people'
      ? plan.people_filters
      : plan.target_type === 'jobs'
        ? plan.job_filters
        : plan.business_filters;
  for (const [key, value] of Object.entries(groups)) {
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        chips.push({
          id: `${plan.target_type}:${key}:${index}`,
          label: humanize(String(item)),
        }),
      );
    } else if (value === true) {
      chips.push({
        id: `${plan.target_type}:${key}:boolean`,
        label: humanize(key),
      });
    }
  }
  return chips;
}

export function removeSearchPlanChip(
  plan: SearchPlanV1,
  chipId: string,
): SearchPlanV1 {
  const next = structuredClone(plan);
  const [scope, key, indexValue] = chipId.split(':');
  const index = Number(indexValue);
  if (scope === 'keywords' || scope === 'location_terms') {
    next[scope].splice(index, 1);
    return next;
  }
  const group =
    scope === 'people'
      ? next.people_filters
      : scope === 'jobs'
        ? next.job_filters
        : next.business_filters;
  const record = group as unknown as Record<string, unknown>;
  if (indexValue === 'boolean') {
    record[key] = false;
  } else if (Array.isArray(record[key])) {
    (record[key] as unknown[]).splice(index, 1);
  }
  return next;
}

export function getPlanMatchReasons(
  plan: SearchPlanV1 | null,
  item: PublicProfile | OpportunityRecord | BusinessRecord,
) {
  if (!plan) return [];
  if (plan.target_type === 'people' && 'skills' in item && 'displayName' in item) {
    const matches = overlap(item.skills, plan.people_filters.skills);
    return [
      matches.length > 0
        ? `Matches ${matches.length} selected skill${matches.length === 1 ? '' : 's'}`
        : null,
      plan.people_filters.remote_preferences.includes(item.remotePreference)
        ? `Matches ${humanize(item.remotePreference)} work preference`
        : null,
      locationReason(plan.location_terms, item.city),
    ].filter(isString).slice(0, 2);
  }
  if (plan.target_type === 'jobs' && 'poster' in item) {
    const matches = overlap(item.skills, plan.job_filters.required_skills);
    return [
      matches.length > 0
        ? `Matches ${matches.length} required skill${matches.length === 1 ? '' : 's'}`
        : null,
      plan.job_filters.clearly_paid_only
        ? 'Matches the paid-only filter'
        : null,
      plan.job_filters.work_arrangements.includes(item.workplace)
        ? `Matches ${humanize(item.workplace)} work`
        : null,
      locationReason(plan.location_terms, item.location),
    ].filter(isString).slice(0, 2);
  }
  if (plan.target_type === 'businesses' && 'businessType' in item) {
    return [
      plan.business_filters.business_types.includes(item.businessType)
        ? `Matches ${humanize(item.businessType)} type`
        : null,
      plan.business_filters.has_active_jobs && item.activeOpportunityCount > 0
        ? 'Currently hiring'
        : null,
      locationReason(plan.location_terms, item.location),
    ].filter(isString).slice(0, 2);
  }
  return [];
}

function valueArray<T extends string>(value: T | ''): T[] {
  return value ? [value] : [];
}

function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function overlap(first: string[], second: string[]) {
  const selected = new Set(second.map(normalize));
  return first.filter((value) => selected.has(normalize(value)));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function locationReason(terms: string[], value: string) {
  const match = terms.find((term) => normalize(value).includes(normalize(term)));
  return match ? `Located near ${match}` : null;
}

function isString(value: string | null): value is string {
  return Boolean(value);
}
