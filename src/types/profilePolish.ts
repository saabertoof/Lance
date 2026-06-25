import type { LocationOption } from '@/constants/catalogs';

export const currentIntentOptions = [
  { label: 'Building a startup', value: 'building_startup' },
  { label: 'Looking for a cofounder', value: 'looking_for_cofounder' },
  { label: 'Looking for collaborators', value: 'looking_for_collaborators' },
  { label: 'Open to freelance work', value: 'open_to_freelance' },
  { label: 'Looking for internships', value: 'looking_for_internships' },
  { label: 'Looking for opportunities', value: 'looking_for_job' },
  { label: 'Hiring', value: 'hiring' },
  { label: 'Looking for projects', value: 'looking_for_projects' },
  { label: 'Offering my skills', value: 'offering_skills' },
  { label: 'Just networking', value: 'just_networking' },
  { label: 'Offering mentorship', value: 'offering_mentorship' },
  { label: 'Seeking mentorship', value: 'seeking_mentorship' },
] as const;

export const profilePromptOptions = [
  { label: 'What are you building?', value: 'building' },
  { label: 'What are you unusually good at?', value: 'unusually_good_at' },
  { label: 'Who should reach out to you?', value: 'reach_out' },
  { label: 'What do you need help with right now?', value: 'need_help' },
  { label: 'An idea I cannot stop thinking about...', value: 'idea' },
  { label: 'My unfair advantage is...', value: 'advantage' },
  { label: 'The kind of opportunity I want next...', value: 'next_opportunity' },
  { label: 'A project I am proud of...', value: 'proud_project' },
] as const;

export const profileTemplateOptions = ['clean', 'creator', 'studio', 'bold'] as const;
export const profileAccentOptions = ['purple', 'blue', 'green', 'rose', 'charcoal'] as const;
export const PROFILE_PORTFOLIO_LIMIT = 12;
export const PROFILE_PROMPT_LIMIT = 3;
export const PROFILE_INTENT_LIMIT = 3;

export type CurrentIntent = (typeof currentIntentOptions)[number]['value'];
export type ProfileTemplate = (typeof profileTemplateOptions)[number];
export type ProfileAccent = (typeof profileAccentOptions)[number];

export type ProfileThemeSettings = {
  template: ProfileTemplate;
  accent: ProfileAccent;
  headerAlignment: 'left' | 'center';
  cardShape: 'soft' | 'pill' | 'squared';
  background: 'neutral' | 'soft_gradient' | 'banner_led';
};

export type ProfilePrompt = {
  id: string;
  promptKey: string;
  answer: string;
  displayOrder: number;
};

export type PortfolioItem = {
  id: string;
  itemType: 'image' | 'external_video' | 'project_link';
  title: string;
  caption: string;
  mediaUrl: string | null;
  storagePath: string | null;
  thumbnailUrl: string | null;
  externalUrl: string | null;
  accessibilityDescription: string;
  displayOrder: number;
  localUri?: string | null;
  localBase64?: string | null;
  localMimeType?: string | null;
};

export type CustomProfileLink = {
  id: string;
  label: string;
  url: string;
  iconKey: string | null;
  displayOrder: number;
};

export type ProfilePolish = {
  bannerPath: string | null;
  bannerUrl: string | null;
  location: LocationOption | null;
  legacyLocation: string;
  currentIntents: CurrentIntent[];
  prompts: ProfilePrompt[];
  theme: ProfileThemeSettings;
  portfolio: PortfolioItem[];
  customLinks: CustomProfileLink[];
  pendingBannerBase64?: string | null;
  pendingBannerMimeType?: string | null;
  obsoleteBannerPath?: string | null;
};

export const defaultProfileTheme: ProfileThemeSettings = {
  template: 'clean',
  accent: 'purple',
  headerAlignment: 'left',
  cardShape: 'soft',
  background: 'neutral',
};

export function createEmptyProfilePolish(legacyLocation = ''): ProfilePolish {
  return {
    bannerPath: null,
    bannerUrl: null,
    location: null,
    legacyLocation,
    currentIntents: [],
    prompts: [],
    theme: defaultProfileTheme,
    portfolio: [],
    customLinks: [],
  };
}
