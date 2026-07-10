import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export const betaFeedbackTypeOptions = [
  {
    icon: 'bug-outline',
    label: 'Bug',
    value: 'bug',
  },
  {
    icon: 'help-circle-outline',
    label: 'Confusing',
    value: 'confusing',
  },
  {
    icon: 'color-palette-outline',
    label: 'Design',
    value: 'design',
  },
  {
    icon: 'bulb-outline',
    label: 'Idea',
    value: 'idea',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    label: 'Other',
    value: 'other',
  },
] as const;

export type BetaFeedbackType =
  (typeof betaFeedbackTypeOptions)[number]['value'];

export async function submitBetaFeedback(input: {
  area: string;
  contactAllowed: boolean;
  message: string;
  type: BetaFeedbackType;
}) {
  const message = input.message.trim();
  if (message.length < 10) {
    throw new Error('Add a little more detail before sending feedback.');
  }

  const platform =
    Platform.OS === 'android' || Platform.OS === 'ios' || Platform.OS === 'web'
      ? Platform.OS
      : 'unknown';

  const { data, error } = await supabase.rpc('submit_beta_feedback', {
    target_app_version: Constants.expoConfig?.version ?? null,
    target_area: input.area.trim() || null,
    target_contact_allowed: input.contactAllowed,
    target_feedback_type: input.type,
    target_message: message,
    target_platform: platform,
  });
  if (error) throw error;
  return data as string;
}

export function formatBetaFeedbackError(error: unknown) {
  const details =
    error && typeof error === 'object'
      ? (error as { code?: unknown; message?: unknown })
      : {};
  const code = typeof details.code === 'string' ? details.code : '';
  const message = typeof details.message === 'string' ? details.message : '';
  if (code === 'PGRST202' || /submit_beta_feedback/i.test(message)) {
    return 'Beta feedback needs the latest Supabase migration before it can send.';
  }
  if (/Sign in again|profile is not available|Add a little more detail|sent a lot/i.test(message)) {
    return message;
  }
  return 'Feedback could not be sent. Check your connection and try again.';
}
