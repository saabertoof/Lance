export const businessTypeOptions = [
  { label: 'Solo operator', value: 'solo_operator' },
  { label: 'Creator', value: 'creator' },
  { label: 'Startup', value: 'startup' },
  { label: 'Agency', value: 'agency' },
  { label: 'Small business', value: 'small_business' },
  { label: 'Local business', value: 'local_business' },
  { label: 'Nonprofit', value: 'nonprofit' },
  { label: 'Project', value: 'project' },
  { label: 'Community', value: 'community' },
  { label: 'Other', value: 'other' },
] as const;

export const businessSizeOptions = [
  { label: '1 person', value: 'one_person' },
  { label: '2-10 people', value: 'two_to_ten' },
  { label: '11-50 people', value: 'eleven_to_fifty' },
  { label: '51+ people', value: 'fifty_one_plus' },
] as const;

export const businessRemoteOptions = [
  { label: 'Fully remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Local / in-person', value: 'in_person' },
  { label: 'Flexible', value: 'flexible' },
  { label: 'Not applicable', value: 'not_applicable' },
] as const;

export const industryOptions = [
  'Technology',
  'Artificial intelligence',
  'Media',
  'Content',
  'Marketing',
  'E-commerce',
  'Fashion',
  'Real estate',
  'Finance',
  'Crypto / Web3',
  'Food and hospitality',
  'Health and fitness',
  'Education',
  'Gaming',
  'Creative services',
  'Professional services',
  'Nonprofit',
  'Other',
] as const;

export type BusinessType = (typeof businessTypeOptions)[number]['value'];
export type BusinessSize = (typeof businessSizeOptions)[number]['value'];
export type BusinessRemoteStatus = (typeof businessRemoteOptions)[number]['value'];
export type BusinessStatus = 'active' | 'archived';

export type BusinessDraft = {
  name: string;
  slug: string;
  businessType: BusinessType;
  shortDescription: string;
  fullDescription: string;
  industry: string;
  businessSize: BusinessSize;
  location: string;
  remoteStatus: BusinessRemoteStatus;
  foundingYear: string;
  logoUrl: string | null;
  localLogoUri: string | null;
  localLogoBase64: string | null;
  localLogoMimeType: string | null;
  websiteUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  xUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  contactEmail: string;
};

export type BusinessRecord = Omit<
  BusinessDraft,
  'localLogoUri' | 'localLogoBase64' | 'localLogoMimeType' | 'foundingYear'
> & {
  id: string;
  ownerProfileId: string;
  foundingYear: number | null;
  status: BusinessStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  activeOpportunityCount: number;
  draftOpportunityCount: number;
  managedByName: string;
};

export function createEmptyBusinessDraft(): BusinessDraft {
  return {
    name: '',
    slug: '',
    businessType: 'startup',
    shortDescription: '',
    fullDescription: '',
    industry: 'Technology',
    businessSize: 'one_person',
    location: '',
    remoteStatus: 'flexible',
    foundingYear: '',
    logoUrl: null,
    localLogoUri: null,
    localLogoBase64: null,
    localLogoMimeType: null,
    websiteUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
    xUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    contactEmail: '',
  };
}
