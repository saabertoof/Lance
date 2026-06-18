import type {
  Availability,
  ExperienceLevel,
  OpportunityInterest,
  RemotePreference,
} from './profile';
import type {
  CompensationType,
  OpportunityCategory,
  OpportunityExperience,
  TimeCommitment,
  WorkArrangement,
  WorkType,
} from './opportunity';
import type {
  BusinessRemoteStatus,
  BusinessSize,
  BusinessType,
} from './business';

export type SearchMode = 'people' | 'opportunities' | 'businesses';
export type DiscoverMode = 'people' | 'opportunities';

export type PeopleFilters = {
  primaryRole: string;
  skills: string[];
  experienceLevel: ExperienceLevel | '';
  availability: Availability | '';
  location: string;
  remotePreference: RemotePreference | '';
  opportunityInterests: OpportunityInterest[];
  industryExperience: string[];
};

export type OpportunityFilters = {
  category: OpportunityCategory | '';
  skills: string[];
  industry: string;
  compensationType: CompensationType | '';
  paidOnly: boolean;
  workType: WorkType | '';
  workplace: WorkArrangement | '';
  timeCommitment: TimeCommitment | '';
  experienceLevel: OpportunityExperience | '';
  location: string;
};

export type BusinessFilters = {
  businessType: BusinessType | '';
  businessSize: BusinessSize | '';
  industry: string;
  location: string;
  remoteStatus: BusinessRemoteStatus | '';
  hasActiveOpportunities: boolean;
};

export const emptyPeopleFilters: PeopleFilters = {
  primaryRole: '',
  skills: [],
  experienceLevel: '',
  availability: '',
  location: '',
  remotePreference: '',
  opportunityInterests: [],
  industryExperience: [],
};

export const emptyOpportunityFilters: OpportunityFilters = {
  category: '',
  skills: [],
  industry: '',
  compensationType: '',
  paidOnly: false,
  workType: '',
  workplace: '',
  timeCommitment: '',
  experienceLevel: '',
  location: '',
};

export const emptyBusinessFilters: BusinessFilters = {
  businessType: '',
  businessSize: '',
  industry: '',
  location: '',
  remoteStatus: '',
  hasActiveOpportunities: false,
};

export function countPeopleFilters(filters: PeopleFilters) {
  return [
    filters.primaryRole,
    filters.skills.length,
    filters.experienceLevel,
    filters.availability,
    filters.location,
    filters.remotePreference,
    filters.opportunityInterests.length,
    filters.industryExperience.length,
  ].filter(Boolean).length;
}

export function countOpportunityFilters(filters: OpportunityFilters) {
  return [
    filters.category,
    filters.skills.length,
    filters.industry,
    filters.compensationType,
    filters.paidOnly,
    filters.workType,
    filters.workplace,
    filters.timeCommitment,
    filters.experienceLevel,
    filters.location,
  ].filter(Boolean).length;
}

export function countBusinessFilters(filters: BusinessFilters) {
  return [
    filters.businessType,
    filters.businessSize,
    filters.industry,
    filters.location,
    filters.remoteStatus,
    filters.hasActiveOpportunities,
  ].filter(Boolean).length;
}
