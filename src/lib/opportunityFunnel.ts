import AsyncStorage from '@react-native-async-storage/async-storage';

import { calculateFunnelConversion } from '@/lib/reliability';
import { supabase } from '@/lib/supabase';

export type OpportunityFunnelEvent =
  | 'application_submitted'
  | 'apply_started'
  | 'view';
export type OpportunityResponseFunnelEvent = 'creator_reviewed' | 'message_started';

export type OpportunityFunnelSummary = {
  applicationStarts: number;
  applications: number;
  creatorReviews: number;
  messageStarts: number;
  views: number;
};

const FUNNEL_SESSION_KEY = 'lance.opportunity-funnel-session.v1';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cachedSessionId: string | null = null;

export async function trackOpportunityFunnelEvent(
  slug: string,
  event: OpportunityFunnelEvent,
) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return;

  try {
    const sessionId = await getFunnelSessionId();
    const { error } = await supabase.rpc('record_opportunity_funnel_event', {
      target_event: event,
      target_session_id: sessionId,
      target_slug: normalizedSlug,
    });
    if (error && !isMissingReliabilityMigration(error)) throw error;
  } catch (error) {
    if (__DEV__) {
      console.warn('[Opportunity funnel unavailable]', safeErrorName(error));
    }
  }
}

export async function trackOpportunityResponseFunnelEvent(
  responseId: string,
  event: OpportunityResponseFunnelEvent,
) {
  const normalizedResponseId = responseId.trim();
  if (!normalizedResponseId) return;

  try {
    const { error } = await supabase.rpc('record_opportunity_response_funnel_event', {
      target_event: event,
      target_interest_id: normalizedResponseId,
    });
    if (error && !isMissingReliabilityMigration(error)) throw error;
  } catch (error) {
    if (__DEV__) {
      console.warn('[Opportunity response funnel unavailable]', safeErrorName(error));
    }
  }
}

export async function loadOpportunityFunnelSummary(
  opportunityId: string,
): Promise<OpportunityFunnelSummary | null> {
  const { data, error } = await supabase.rpc('get_opportunity_funnel_summary', {
    target_opportunity_id: opportunityId,
  });
  if (error) {
    if (isMissingReliabilityMigration(error)) return null;
    throw error;
  }

  const row = (data ?? {}) as Record<string, unknown>;
  return {
    applicationStarts: nonNegativeNumber(row.application_starts),
    applications: nonNegativeNumber(row.applications),
    creatorReviews: nonNegativeNumber(row.creator_reviews),
    messageStarts: nonNegativeNumber(row.message_starts),
    views: nonNegativeNumber(row.views),
  };
}

export function opportunityConversionRate(summary: OpportunityFunnelSummary) {
  return calculateFunnelConversion(summary.views, summary.applications);
}

async function getFunnelSessionId() {
  if (cachedSessionId) return cachedSessionId;

  try {
    const stored = await AsyncStorage.getItem(FUNNEL_SESSION_KEY);
    if (stored && UUID_PATTERN.test(stored)) {
      cachedSessionId = stored;
      return stored;
    }
  } catch {
    // A fresh in-memory ID still preserves privacy and prevents a tracking failure.
  }

  const generated = createUuid();
  cachedSessionId = generated;
  try {
    await AsyncStorage.setItem(FUNNEL_SESSION_KEY, generated);
  } catch {
    // Tracking must never block the opportunity page.
  }
  return generated;
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function nonNegativeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function isMissingReliabilityMigration(error: unknown) {
  const details = error as { code?: string; message?: string };
  return (
    details?.code === 'PGRST202' ||
    /record_opportunity_funnel_event|record_opportunity_response_funnel_event|get_opportunity_funnel_summary/i.test(
      details?.message ?? '',
    )
  );
}

function safeErrorName(error: unknown) {
  return error && typeof error === 'object' && 'name' in error
    ? String(error.name)
    : 'UnknownError';
}
