import { loadPublicProfilesByIds } from '@/lib/discovery';
import { loadPublicOpportunitiesByIds } from '@/lib/opportunity';
import { supabase } from '@/lib/supabase';

export const SAVED_PAGE_SIZE = 20;

export async function loadSavedIds(userId: string) {
  const [profilesResult, opportunitiesResult] = await Promise.all([
    supabase
      .from('saved_profiles')
      .select('saved_profile_id')
      .eq('saver_profile_id', userId),
    supabase
      .from('saved_opportunities')
      .select('opportunity_id')
      .eq('profile_id', userId),
  ]);

  const error = profilesResult.error ?? opportunitiesResult.error;
  if (error) throw error;

  return {
    profileIds: (profilesResult.data ?? []).map((row) => row.saved_profile_id),
    opportunityIds: (opportunitiesResult.data ?? []).map((row) => row.opportunity_id),
  };
}

export async function saveProfile(userId: string, profileId: string) {
  const { error } = await supabase.from('saved_profiles').insert({
    saver_profile_id: userId,
    saved_profile_id: profileId,
  });

  if (error && error.code !== '23505') throw error;
}

export async function unsaveProfile(userId: string, profileId: string) {
  const { error } = await supabase
    .from('saved_profiles')
    .delete()
    .eq('saver_profile_id', userId)
    .eq('saved_profile_id', profileId);

  if (error) throw error;
}

export async function saveOpportunity(userId: string, opportunityId: string) {
  const { error } = await supabase.from('saved_opportunities').insert({
    profile_id: userId,
    opportunity_id: opportunityId,
  });

  if (error && error.code !== '23505') throw error;
}

export async function unsaveOpportunity(userId: string, opportunityId: string) {
  const { error } = await supabase
    .from('saved_opportunities')
    .delete()
    .eq('profile_id', userId)
    .eq('opportunity_id', opportunityId);

  if (error) throw error;
}

export async function loadSavedProfiles(
  userId: string,
  offset = 0,
  limit = SAVED_PAGE_SIZE,
) {
  const { data, error } = await supabase
    .from('saved_profiles')
    .select('saved_profile_id')
    .eq('saver_profile_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const rows = data ?? [];
  return {
    items: await loadPublicProfilesByIds(rows.map((row) => row.saved_profile_id)),
    requestedCount: rows.length,
  };
}

export async function loadSavedOpportunities(
  userId: string,
  offset = 0,
  limit = SAVED_PAGE_SIZE,
) {
  const { data, error } = await supabase
    .from('saved_opportunities')
    .select('opportunity_id')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const rows = data ?? [];
  return {
    items: await loadPublicOpportunitiesByIds(rows.map((row) => row.opportunity_id)),
    requestedCount: rows.length,
  };
}

export function logSavedError(operation: string, error: unknown) {
  if (!__DEV__) return;

  const details =
    error && typeof error === 'object'
      ? (error as { code?: string; message?: string; name?: string })
      : {};

  console.warn(`[Saved operation: ${operation}]`, {
    code: details.code ?? null,
    message: details.message ?? 'Unknown error',
    name: details.name ?? 'UnknownError',
  });
}
