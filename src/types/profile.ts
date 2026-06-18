export const intentOptions = [
  { label: 'Find opportunities', value: 'find_opportunities' },
  { label: 'Find people', value: 'find_people' },
  { label: 'Hire or find help', value: 'hire_or_find_help' },
  { label: 'Promote my services', value: 'promote_services' },
  { label: 'Build a team', value: 'build_team' },
  { label: 'Explore everything', value: 'explore_everything' },
] as const;

export const remotePreferenceOptions = [
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'In person', value: 'in_person' },
  { label: 'Flexible', value: 'flexible' },
] as const;

export const roleOptions = [
  'Founder',
  'Developer',
  'Designer',
  'Video editor',
  'Photographer',
  'Content creator',
  'Marketer',
  'Social media manager',
  'Sales',
  'Copywriter',
  'Virtual assistant',
  'Community manager',
  'Operations',
  'Consultant',
  'Other',
] as const;

export const experienceOptions = [
  { label: 'Just starting', value: 'just_starting' },
  { label: 'Some experience', value: 'some_experience' },
  { label: 'Experienced', value: 'experienced' },
  { label: 'Expert', value: 'expert' },
] as const;

export const availabilityOptions = [
  { label: 'A few hours per week', value: 'few_hours_per_week' },
  { label: '5-10 hours per week', value: 'hours_5_10' },
  { label: '10-20 hours per week', value: 'hours_10_20' },
  { label: '20+ hours per week', value: 'hours_20_plus' },
  { label: 'Flexible', value: 'flexible_hours' },
] as const;

export const opportunityInterestOptions = [
  { label: 'Paid freelance', value: 'paid_freelance' },
  { label: 'Ongoing part-time', value: 'ongoing_part_time' },
  { label: 'One-time project', value: 'one_time_project' },
  { label: 'Retainer work', value: 'retainer_work' },
  { label: 'Cofounder', value: 'cofounder' },
  { label: 'Project collaboration', value: 'project_collaboration' },
  { label: 'Commission', value: 'commission' },
  { label: 'Revenue share', value: 'revenue_share' },
  { label: 'Equity', value: 'equity' },
  { label: 'Local work', value: 'local_work' },
  { label: 'Remote work', value: 'remote_work' },
  { label: 'Open to discussing', value: 'open_to_discussing' },
] as const;

export const profileLinkOptions = [
  { label: 'Portfolio', value: 'portfolio' },
  { label: 'Personal website', value: 'website' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'X', value: 'x' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'GitHub', value: 'github' },
  { label: 'Discord', value: 'discord' },
  { label: 'Calendly', value: 'calendly' },
  { label: 'Email', value: 'email' },
] as const;

export type PrimaryIntent = (typeof intentOptions)[number]['value'];
export type RemotePreference = (typeof remotePreferenceOptions)[number]['value'];
export type ExperienceLevel = (typeof experienceOptions)[number]['value'];
export type Availability = (typeof availabilityOptions)[number]['value'];
export type OpportunityInterest = (typeof opportunityInterestOptions)[number]['value'];
export type ProfileLinkType = (typeof profileLinkOptions)[number]['value'];

export type ProfileLink = {
  label: string;
  linkType: ProfileLinkType;
  value: string;
  displayOrder: number;
};

export type ProfileDraft = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  localAvatarUri: string | null;
  localAvatarBase64: string | null;
  city: string;
  remotePreference: RemotePreference;
  confirmedAdult: boolean;
  primaryIntent: PrimaryIntent;
  primaryRole: string;
  headline: string;
  bio: string;
  experienceLevel: ExperienceLevel;
  availability: Availability;
  skills: string[];
  opportunityInterests: OpportunityInterest[];
  industryExperience: string[];
  links: ProfileLink[];
};

export type PersonalProfile = Omit<
  ProfileDraft,
  'localAvatarUri' | 'localAvatarBase64' | 'confirmedAdult'
> & {
  id: string;
  confirmedAdultAt: string | null;
  onboardingCompletedAt: string | null;
  email: string | null;
};

export type PublicProfile = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  city: string;
  remotePreference: RemotePreference;
  primaryRole: string;
  headline: string;
  bio: string;
  experienceLevel: ExperienceLevel;
  availability: Availability;
  skills: string[];
  opportunityInterests: OpportunityInterest[];
  industryExperience: string[];
  links: ProfileLink[];
  updatedAt: string;
};

export function createEmptyProfileDraft(displayName = ''): ProfileDraft {
  return {
    displayName,
    username: '',
    avatarUrl: null,
    localAvatarUri: null,
    localAvatarBase64: null,
    city: '',
    remotePreference: 'flexible',
    confirmedAdult: false,
    primaryIntent: 'explore_everything',
    primaryRole: '',
    headline: '',
    bio: '',
    experienceLevel: 'just_starting',
    availability: 'flexible_hours',
    skills: [],
    opportunityInterests: [],
    industryExperience: [],
    links: [],
  };
}

export function getOptionLabel<T extends string>(
  options: readonly { label: string; value: T }[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}
