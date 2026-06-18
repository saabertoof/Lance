import type { BusinessRecord } from './business';

export const opportunityCategoryOptions = [
  { label: 'Software development', value: 'software_development' },
  { label: 'Web development', value: 'web_development' },
  { label: 'Mobile development', value: 'mobile_development' },
  { label: 'Product design', value: 'product_design' },
  { label: 'Graphic design', value: 'graphic_design' },
  { label: 'Video editing', value: 'video_editing' },
  { label: 'Photography', value: 'photography' },
  { label: 'Content creation', value: 'content_creation' },
  { label: 'Social media', value: 'social_media' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Sales', value: 'sales' },
  { label: 'Copywriting', value: 'copywriting' },
  { label: 'Virtual assistance', value: 'virtual_assistance' },
  { label: 'Community management', value: 'community_management' },
  { label: 'Operations', value: 'operations' },
  { label: 'Consulting', value: 'consulting' },
  { label: 'Finance', value: 'finance' },
  { label: 'Real estate', value: 'real_estate' },
  { label: 'Customer support', value: 'customer_support' },
  { label: 'Other', value: 'other' },
] as const;

export const workTypeOptions = [
  { label: 'One-time project', value: 'one_time_project' },
  { label: 'Ongoing freelance', value: 'ongoing_freelance' },
  { label: 'Part-time', value: 'part_time' },
  { label: 'Full-time', value: 'full_time' },
  { label: 'Cofounder', value: 'cofounder' },
  { label: 'Project collaboration', value: 'project_collaboration' },
  { label: 'Retainer', value: 'retainer' },
  { label: 'Internship', value: 'internship' },
  { label: 'Commission-based', value: 'commission_based' },
  { label: 'Other', value: 'other' },
] as const;

export const compensationTypeOptions = [
  { label: 'Hourly', value: 'hourly' },
  { label: 'Fixed project', value: 'fixed_project' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Retainer', value: 'retainer' },
  { label: 'Salary', value: 'salary' },
  { label: 'Commission', value: 'commission' },
  { label: 'Revenue share', value: 'revenue_share' },
  { label: 'Equity', value: 'equity' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Negotiable', value: 'negotiable' },
  { label: 'Mixed', value: 'mixed' },
] as const;

export const ratePeriodOptions = [
  { label: 'Per hour', value: 'per_hour' },
  { label: 'Per project', value: 'per_project' },
  { label: 'Per week', value: 'per_week' },
  { label: 'Per month', value: 'per_month' },
  { label: 'Per year', value: 'per_year' },
  { label: 'Other', value: 'other' },
] as const;

export const workArrangementOptions = [
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Local / in-person', value: 'in_person' },
  { label: 'Flexible', value: 'flexible' },
] as const;

export const timeCommitmentOptions = [
  { label: 'Under 5 hours per week', value: 'under_5_hours' },
  { label: '5-10 hours per week', value: 'hours_5_10' },
  { label: '10-20 hours per week', value: 'hours_10_20' },
  { label: '20-30 hours per week', value: 'hours_20_30' },
  { label: '30+ hours per week', value: 'hours_30_plus' },
  { label: 'Flexible', value: 'flexible' },
  { label: 'One-time deliverable', value: 'one_time_deliverable' },
] as const;

export const opportunityExperienceOptions = [
  { label: 'No formal experience required', value: 'none_required' },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Experienced', value: 'experienced' },
  { label: 'Expert', value: 'expert' },
  { label: 'Any level', value: 'any_level' },
] as const;

export type OpportunityCategory = (typeof opportunityCategoryOptions)[number]['value'];
export type WorkType = (typeof workTypeOptions)[number]['value'];
export type CompensationType = (typeof compensationTypeOptions)[number]['value'];
export type RatePeriod = (typeof ratePeriodOptions)[number]['value'];
export type WorkArrangement = (typeof workArrangementOptions)[number]['value'];
export type TimeCommitment = (typeof timeCommitmentOptions)[number]['value'];
export type OpportunityExperience =
  (typeof opportunityExperienceOptions)[number]['value'];
export type OpportunityStatus = 'draft' | 'published' | 'paused' | 'closed' | 'archived';

export type OpportunityDraft = {
  id: string | null;
  postingIdentity: 'personal' | 'business';
  businessId: string | null;
  title: string;
  slug: string;
  category: OpportunityCategory;
  shortSummary: string;
  fullDescription: string;
  workType: WorkType;
  compensationType: CompensationType;
  compensationMin: string;
  compensationMax: string;
  currency: string;
  ratePeriod: RatePeriod | '';
  compensationNotes: string;
  workplace: WorkArrangement;
  location: string;
  locationId: string | null;
  locationRegion: string;
  locationCountry: string;
  timeCommitment: TimeCommitment;
  experienceLevel: OpportunityExperience;
  skills: string[];
  industry: string;
  expectedStartDate: string;
  expirationDate: string;
  portfolioRequired: boolean;
  externalUrl: string;
  peopleNeeded: string;
  additionalRequirements: string;
  disclaimerAccepted: boolean;
  status: OpportunityStatus;
};

export type OpportunityPoster = {
  name: string;
  imageUrl: string | null;
  identityType: 'personal' | 'business';
  business: BusinessRecord | null;
};

export type OpportunityRecord = OpportunityDraft & {
  id: string;
  ownerProfileId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  poster: OpportunityPoster;
};

export function createEmptyOpportunityDraft(): OpportunityDraft {
  return {
    id: null,
    postingIdentity: 'personal',
    businessId: null,
    title: '',
    slug: '',
    category: 'software_development',
    shortSummary: '',
    fullDescription: '',
    workType: 'one_time_project',
    compensationType: 'fixed_project',
    compensationMin: '',
    compensationMax: '',
    currency: 'USD',
    ratePeriod: 'per_project',
    compensationNotes: '',
    workplace: 'remote',
    location: '',
    locationId: null,
    locationRegion: '',
    locationCountry: '',
    timeCommitment: 'one_time_deliverable',
    experienceLevel: 'any_level',
    skills: [],
    industry: 'Technology',
    expectedStartDate: '',
    expirationDate: '',
    portfolioRequired: false,
    externalUrl: '',
    peopleNeeded: '1',
    additionalRequirements: '',
    disclaimerAccepted: false,
    status: 'draft',
  };
}
