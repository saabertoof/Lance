import { supabase } from '@/lib/supabase';
import {
  normalizeClientSearchPlan,
  type SearchExecutionState,
} from '@/lib/searchPlan';
import type {
  AskLanceResponse,
  SavedSearchAlertFrequency,
  SavedSearchRecord,
  SearchAlertEventRecord,
} from '@/types/searchPhase6';
import type { SearchPlanV1 } from '../../supabase/functions/_shared/search-plan';

export const SEARCH_ALERT_PAGE_SIZE = 20;

type RawSavedSearch = {
  id: string;
  user_id: string;
  name: string;
  target_type: SavedSearchRecord['targetType'];
  original_query: string | null;
  normalized_text_query: string | null;
  filter_plan: SearchPlanV1;
  schema_version: number;
  sort: SavedSearchRecord['sort'];
  alert_frequency: SavedSearchAlertFrequency;
  alert_enabled: boolean;
  alert_baseline_at: string | null;
  last_opened_at: string | null;
  last_run_at: string | null;
  last_success_at: string | null;
  next_run_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};

type RawAlertEvent = {
  id: string;
  user_id: string;
  saved_search_id: string;
  opportunity_id: string | null;
  opportunity_title_snapshot: string;
  poster_name_snapshot: string;
  match_summary: string[] | null;
  matched_at: string;
  published_at_snapshot: string | null;
  read_at: string | null;
  saved_searches?: { name?: string } | { name?: string }[] | null;
};

export async function parseAskLance(
  query: string,
  clarification?: string,
) {
  const { data, error } = await supabase.functions.invoke<AskLanceResponse>(
    'ask-lance',
    {
      body: {
        query,
        ...(clarification?.trim() ? { clarification: clarification.trim() } : {}),
      },
    },
  );
  if (error) throw new Error(await safeFunctionMessage(error));
  if (!data?.plan || !data.requestId) {
    throw new Error('Ask Lance could not interpret that search. Try normal filters.');
  }
  return {
    ...data,
    plan: normalizeClientSearchPlan(data.plan),
  };
}

export async function loadSavedSearches() {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapSavedSearch(row as RawSavedSearch));
}

export async function loadSavedSearch(id: string) {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSavedSearch(data as RawSavedSearch) : null;
}

export async function saveSearch(input: {
  alertFrequency: SavedSearchAlertFrequency;
  name: string;
  originalQuery: string | null;
  plan: SearchPlanV1;
  state: SearchExecutionState;
}) {
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: (await requireUserId()),
      name: input.name.trim(),
      target_type: input.plan.target_type,
      original_query: input.originalQuery?.trim() || null,
      normalized_text_query: input.state.query.trim(),
      filter_plan: normalizeClientSearchPlan(input.plan),
      schema_version: input.plan.schema_version,
      sort: input.plan.sort,
      alert_frequency: input.alertFrequency,
      alert_enabled:
        input.plan.target_type === 'jobs' &&
        input.alertFrequency !== 'paused',
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapSavedSearch(data as RawSavedSearch);
}

export async function updateSavedSearch(
  id: string,
  updates: {
    alertFrequency?: SavedSearchAlertFrequency;
    name?: string;
  },
) {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.alertFrequency !== undefined) {
    payload.alert_frequency = updates.alertFrequency;
    payload.alert_enabled = updates.alertFrequency !== 'paused';
  }
  const { data, error } = await supabase
    .from('saved_searches')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return mapSavedSearch(data as RawSavedSearch);
}

export async function markSavedSearchOpened(id: string) {
  const { error } = await supabase
    .from('saved_searches')
    .update({ last_opened_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSavedSearch(id: string) {
  const { error } = await supabase.from('saved_searches').delete().eq('id', id);
  if (error) throw error;
}

export async function loadSearchAlertEvents(
  offset = 0,
  limit = SEARCH_ALERT_PAGE_SIZE,
) {
  const { data, error } = await supabase
    .from('search_alert_events')
    .select(
      'id, user_id, saved_search_id, opportunity_id, opportunity_title_snapshot, poster_name_snapshot, match_summary, matched_at, published_at_snapshot, read_at, saved_searches(name)',
    )
    .order('matched_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []).map((row) => mapAlertEvent(row as RawAlertEvent));
}

export async function markSearchAlertRead(id: string) {
  const { error } = await supabase
    .from('search_alert_events')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSearchAlertEvent(id: string) {
  const { error } = await supabase
    .from('search_alert_events')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function loadUnreadSearchAlertCount() {
  const { count, error } = await supabase
    .from('search_alert_events')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function loadAlertSchedulerStatus() {
  const { data, error } = await supabase.rpc(
    'phase6_alert_scheduler_status',
  );
  if (error) throw error;
  return data === true;
}

function mapSavedSearch(row: RawSavedSearch): SavedSearchRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetType: row.target_type,
    originalQuery: row.original_query,
    normalizedTextQuery: row.normalized_text_query ?? '',
    filterPlan: normalizeClientSearchPlan(row.filter_plan),
    schemaVersion: row.schema_version,
    sort: row.sort,
    alertFrequency: row.alert_frequency,
    alertEnabled: row.alert_enabled,
    alertBaselineAt: row.alert_baseline_at,
    lastOpenedAt: row.last_opened_at,
    lastRunAt: row.last_run_at,
    lastSuccessAt: row.last_success_at,
    nextRunAt: row.next_run_at,
    lastErrorCode: row.last_error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAlertEvent(row: RawAlertEvent): SearchAlertEventRecord {
  const relation = row.saved_searches;
  const savedSearch = Array.isArray(relation) ? relation[0] : relation;
  return {
    id: row.id,
    userId: row.user_id,
    savedSearchId: row.saved_search_id,
    savedSearchName: savedSearch?.name ?? 'Job alert',
    opportunityId: row.opportunity_id,
    opportunityTitle: row.opportunity_title_snapshot,
    posterName: row.poster_name_snapshot,
    matchSummary: row.match_summary ?? [],
    matchedAt: row.matched_at,
    publishedAt: row.published_at_snapshot,
    readAt: row.read_at,
  };
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error('Sign in again to continue.');
  return data.user.id;
}

async function safeFunctionMessage(error: {
  context?: unknown;
  message?: string;
}) {
  let message = error.message ?? '';
  const context = error.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json() as {
        error?: string;
        message?: string;
      };
      message = `${body.error ?? ''} ${body.message ?? ''}`.trim() || message;
    } catch {
      // The generic safe fallback below handles non-JSON function errors.
    }
  }
  if (message.includes('configured') || message.includes('not_configured')) {
    return "Ask Lance isn't configured yet. You can still use normal search.";
  }
  if (message.includes('wait a moment')) {
    return 'Please wait a moment before asking Lance again.';
  }
  if (message.includes('limit')) {
    return "You've reached today's Ask Lance limit. Normal search is still available.";
  }
  if (message.includes('too long') || message.includes('timeout')) {
    return 'Ask Lance took too long. Your request is still here, and normal search works.';
  }
  if (message.includes('professional search requests')) {
    return 'Ask Lance can only turn professional search requests into filters.';
  }
  if (message.includes('session') || message.includes('JWT')) {
    return 'Your session expired. Sign in again to use Ask Lance.';
  }
  return 'Ask Lance is temporarily unavailable. Normal search still works.';
}
