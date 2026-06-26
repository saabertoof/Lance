import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppearanceMode = 'system' | 'light' | 'dark';

export type LocalSettingsPreferences = {
  aiApplicantSummary: boolean;
  aiDrafting: boolean;
  aiOpportunityDraft: boolean;
  aiProfileHelp: boolean;
  applicationUpdates: boolean;
  matchingOpportunities: boolean;
  messageNotifications: boolean;
  newApplicantNotifications: boolean;
  opportunityReminders: boolean;
  savedSearchAlerts: boolean;
  appearanceMode: AppearanceMode;
};

const DEFAULT_SETTINGS: LocalSettingsPreferences = {
  aiApplicantSummary: false,
  aiDrafting: true,
  aiOpportunityDraft: true,
  aiProfileHelp: true,
  applicationUpdates: true,
  matchingOpportunities: true,
  messageNotifications: true,
  newApplicantNotifications: true,
  opportunityReminders: true,
  savedSearchAlerts: true,
  appearanceMode: 'system',
};

function keyFor(profileId: string) {
  return `lance:settings:${profileId}`;
}

export async function loadLocalSettingsPreferences(profileId: string) {
  const stored = await AsyncStorage.getItem(keyFor(profileId));
  if (!stored) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(stored) as Partial<LocalSettingsPreferences>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveLocalSettingsPreferences(
  profileId: string,
  preferences: LocalSettingsPreferences,
) {
  await AsyncStorage.setItem(keyFor(profileId), JSON.stringify(preferences));
}

export const defaultLocalSettingsPreferences = DEFAULT_SETTINGS;
