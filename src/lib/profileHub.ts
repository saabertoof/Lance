import { supabase } from '@/lib/supabase';

export type OwnerProfileSummary = {
  applied: number;
  businesses: number;
  connections: number;
  newApplicants: number;
  opportunities: number;
  pendingRequests: number;
  saved: number;
};

export async function loadOwnerProfileSummary(
  profileId: string,
): Promise<OwnerProfileSummary> {
  const now = new Date().toISOString();
  const [
    connections,
    pendingRequests,
    applied,
    opportunities,
    newApplicants,
    businesses,
    savedProfiles,
    savedOpportunities,
  ] = await Promise.all([
    supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('match_type', 'person')
      .eq('status', 'active')
      .or(`profile_one_id.eq.${profileId},profile_two_id.eq.${profileId}`),
    supabase
      .from('connection_requests')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_profile_id', profileId)
      .eq('status', 'pending')
      .gt('expires_at', now),
    supabase
      .from('opportunity_interests')
      .select('id', { count: 'exact', head: true })
      .eq('interested_profile_id', profileId),
    supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('owner_profile_id', profileId)
      .is('deleted_at', null),
    supabase
      .from('opportunity_interests')
      .select('id', { count: 'exact', head: true })
      .eq('owner_profile_id', profileId)
      .is('owner_viewed_at', null)
      .in('status', ['submitted', 'in_discussion']),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('owner_profile_id', profileId)
      .eq('status', 'active')
      .is('deleted_at', null),
    supabase
      .from('saved_profiles')
      .select('saved_profile_id', { count: 'exact', head: true })
      .eq('saver_profile_id', profileId),
    supabase
      .from('saved_opportunities')
      .select('opportunity_id', { count: 'exact', head: true })
      .eq('profile_id', profileId),
  ]);

  const firstError = [
    connections.error,
    pendingRequests.error,
    applied.error,
    opportunities.error,
    newApplicants.error,
    businesses.error,
    savedProfiles.error,
    savedOpportunities.error,
  ].find(Boolean);

  if (firstError) throw firstError;

  return {
    applied: applied.count ?? 0,
    businesses: businesses.count ?? 0,
    connections: connections.count ?? 0,
    newApplicants: newApplicants.count ?? 0,
    opportunities: opportunities.count ?? 0,
    pendingRequests: pendingRequests.count ?? 0,
    saved: (savedProfiles.count ?? 0) + (savedOpportunities.count ?? 0),
  };
}
