import { supabase } from '@/lib/supabase';
import type {
  CommunicationPreference,
  ConnectReason,
  ConnectResult,
  ConnectionRecord,
  ConnectionRequestRecord,
  ConversationDetail,
  ConversationSummary,
  MessageRecord,
  OpportunityResponseRecord,
  OpportunityResponseState,
  ProfileSkillOption,
  ProfileSummary,
  RelationshipStatus,
  ReportReason,
  ReportTargetKind,
} from '@/types/communication';

export const COMMUNICATION_PAGE_SIZE = 20;
export const MESSAGE_PAGE_SIZE = 40;

type RawProfileSummary = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  primary_role: string | null;
  city: string | null;
};

type UnknownRow = Record<string, unknown>;

export async function loadRelationshipStatus(profileId: string) {
  const { data, error } = await supabase.rpc('phase5_relationship_state', {
    target_profile_id: profileId,
  });
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    state: (row.state as RelationshipStatus['state']) ?? 'none',
    requestId: stringOrNull(row.request_id),
    connectionId: stringOrNull(row.connection_id),
    conversationId: stringOrNull(row.conversation_id),
    blockedByMe: row.blocked_by_me === true,
    blocked: row.blocked === true,
  } satisfies RelationshipStatus;
}

export async function sendConnectionRequest(input: {
  profileId: string;
  reason: ConnectReason;
  note: string;
  portfolioItemId: string | null;
}) {
  const { data, error } = await supabase.rpc('phase5_send_connection_request', {
    target_profile_id: input.profileId,
    target_reason: input.reason,
    target_note: input.note.trim() || null,
    target_portfolio_item_id: input.portfolioItemId,
  });
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    state: row.state as ConnectResult['state'],
    requestId: stringOrNull(row.request_id),
    connectionId: stringOrNull(row.connection_id),
    conversationId: stringOrNull(row.conversation_id),
  } satisfies ConnectResult;
}

export async function acceptConnectionRequest(requestId: string) {
  const { data, error } = await supabase.rpc('phase5_accept_connection_request', {
    target_request_id: requestId,
  });
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    state: 'connected',
    requestId: stringOrNull(row.request_id),
    connectionId: stringOrNull(row.connection_id),
    conversationId: stringOrNull(row.conversation_id),
  } satisfies ConnectResult;
}

export async function updateConnectionRequest(
  requestId: string,
  action: 'withdraw' | 'decline',
) {
  const { error } = await supabase.rpc('phase5_update_connection_request', {
    target_request_id: requestId,
    target_action: action,
  });
  if (error) throw error;
}

export async function loadConnectionRequests(
  direction: 'received' | 'sent',
  offset = 0,
) {
  const user = await requireUser();
  const column =
    direction === 'received' ? 'recipient_profile_id' : 'requester_profile_id';
  const { data, error } = await supabase
    .from('connection_requests')
    .select(`
      id, requester_profile_id, recipient_profile_id, reason, note,
      portfolio_item_id, status, created_at, expires_at,
      requester:profiles!connection_requests_requester_profile_id_fkey(
        id, display_name, username, avatar_url, primary_role, city
      ),
      recipient:profiles!connection_requests_recipient_profile_id_fkey(
        id, display_name, username, avatar_url, primary_role, city
      ),
      portfolio_items(title)
    `)
    .eq(column, user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + COMMUNICATION_PAGE_SIZE - 1);
  if (error) throw error;
  return (data ?? []).map(mapConnectionRequest);
}

export async function loadConnectionRequest(requestId: string) {
  const { data, error } = await supabase
    .from('connection_requests')
    .select(`
      id, requester_profile_id, recipient_profile_id, reason, note,
      portfolio_item_id, status, created_at, expires_at,
      requester:profiles!connection_requests_requester_profile_id_fkey(
        id, display_name, username, avatar_url, primary_role, city
      ),
      recipient:profiles!connection_requests_recipient_profile_id_fkey(
        id, display_name, username, avatar_url, primary_role, city
      ),
      portfolio_items(title)
    `)
    .eq('id', requestId)
    .single();
  if (error) throw error;
  return mapConnectionRequest(data);
}

export async function loadConnections(offset = 0) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, profile_one_id, profile_two_id, created_at,
      conversations(id),
      profile_one:profiles!matches_profile_one_id_fkey(
        id, display_name, username, avatar_url, primary_role, city
      ),
      profile_two:profiles!matches_profile_two_id_fkey(
        id, display_name, username, avatar_url, primary_role, city
      )
    `)
    .eq('match_type', 'person')
    .eq('status', 'active')
    .or(`profile_one_id.eq.${user.id},profile_two_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + COMMUNICATION_PAGE_SIZE - 1);
  if (error) throw error;
  return (data ?? []).map((row): ConnectionRecord => {
    const first = singleRelation(row.profile_one) as RawProfileSummary;
    const second = singleRelation(row.profile_two) as RawProfileSummary;
    const conversation = singleRelation(row.conversations) as { id?: string } | null;
    return {
      id: row.id,
      createdAt: row.created_at,
      conversationId: conversation?.id ?? null,
      otherProfile: mapProfileSummary(first.id === user.id ? second : first),
    };
  });
}

export async function loadMyProfileSkills(): Promise<ProfileSkillOption[]> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from('profile_skills')
    .select('skill_id, skills(name)')
    .eq('profile_id', user.id);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const skill = singleRelation(row.skills) as { name?: string } | null;
    return { id: row.skill_id, name: skill?.name ?? 'Skill' };
  });
}

export async function sendOpportunityResponse(input: {
  opportunityId: string;
  note: string;
  portfolioItemId: string | null;
  skillIds: string[];
  compensationAcknowledged: boolean;
}) {
  const { data, error } = await supabase.rpc('phase5_send_opportunity_response', {
    target_opportunity_id: input.opportunityId,
    target_note: input.note.trim() || null,
    target_portfolio_item_id: input.portfolioItemId,
    target_skill_ids: input.skillIds,
    compensation_acknowledged: input.compensationAcknowledged,
  });
  if (error) throw error;
  return data as string;
}

export async function loadOpportunityResponseState(opportunityId: string) {
  const { data, error } = await supabase.rpc('phase5_opportunity_response_state', {
    target_opportunity_id: opportunityId,
  });
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    responseId: stringOrNull(row.response_id),
    status: (row.status as OpportunityResponseState['status']) ?? 'none',
    conversationId: stringOrNull(row.conversation_id),
  } satisfies OpportunityResponseState;
}

export async function loadOpportunityResponses(input: {
  direction: 'received' | 'sent';
  opportunityId?: string;
  businessId?: string;
  offset?: number;
}) {
  const user = await requireUser();
  let query = supabase
    .from('opportunity_interests')
    .select(`
      id, opportunity_id, interested_profile_id, owner_profile_id, note,
      portfolio_item_id, status, created_at, owner_viewed_at,
      responder:profiles!opportunity_interests_interested_profile_id_fkey(
        id, display_name, username, avatar_url, primary_role, city
      ),
      opportunities!inner(id, title, business_id, owner_profile_id,
        businesses(name),
        profiles!opportunities_owner_profile_id_fkey(display_name)
      ),
      portfolio_items(title, media_url, thumbnail_url),
      opportunity_interest_skills(skill_id, skills(name)),
      conversations(id)
    `)
    .order('created_at', { ascending: false })
    .range(
      input.offset ?? 0,
      (input.offset ?? 0) + COMMUNICATION_PAGE_SIZE - 1,
    );

  query =
    input.direction === 'received'
      ? query.eq('owner_profile_id', user.id)
      : query.eq('interested_profile_id', user.id);
  if (input.opportunityId) query = query.eq('opportunity_id', input.opportunityId);
  if (input.businessId) query = query.eq('opportunities.business_id', input.businessId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapOpportunityResponse);
}

export async function loadOpportunityResponse(responseId: string) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from('opportunity_interests')
    .select(`
      id, opportunity_id, interested_profile_id, owner_profile_id, note,
      portfolio_item_id, status, created_at, owner_viewed_at,
      responder:profiles!opportunity_interests_interested_profile_id_fkey(
        id, display_name, username, avatar_url, primary_role, city
      ),
      opportunities!inner(id, title, business_id, owner_profile_id,
        businesses(name),
        profiles!opportunities_owner_profile_id_fkey(display_name)
      ),
      portfolio_items(title, media_url, thumbnail_url),
      opportunity_interest_skills(skill_id, skills(name)),
      conversations(id)
    `)
    .eq('id', responseId)
    .single();
  if (error) throw error;
  const response = mapOpportunityResponse(data as unknown as UnknownRow);
  if (![response.ownerProfileId, response.responderProfileId].includes(user.id)) {
    throw new Error('This response is not available.');
  }
  return response;
}

export async function markOpportunityResponsesViewed(input: {
  opportunityId?: string;
  businessId?: string;
}) {
  const { error } = await supabase.rpc('phase5_mark_responses_viewed', {
    target_opportunity_id: input.opportunityId ?? null,
    target_business_id: input.businessId ?? null,
  });
  if (error) throw error;
}

export async function startOpportunityConversation(responseId: string) {
  const { data, error } = await supabase.rpc(
    'phase5_start_opportunity_conversation',
    { target_interest_id: responseId },
  );
  if (error) throw error;
  return data as string;
}

export async function updateOpportunityResponse(
  responseId: string,
  action: 'withdraw' | 'decline' | 'close',
) {
  const { error } = await supabase.rpc('phase5_update_opportunity_response', {
    target_interest_id: responseId,
    target_action: action,
  });
  if (error) throw error;
}

export async function loadConversationSummaries(offset = 0) {
  const user = await requireUser();
  const { data, error } = await supabase.rpc('phase5_list_chats', {
    target_limit: COMMUNICATION_PAGE_SIZE,
    target_offset: offset,
  });
  if (error) throw error;
  const rows = (data ?? []) as UnknownRow[];
  const profileIds = rows
    .map((row) => row.other_profile_id as string)
    .filter(Boolean);
  const messageFilter = rows
    .filter((row) => row.last_message_body && row.last_message_at)
    .map(
      (row) =>
        `and(conversation_id.eq.${row.conversation_id},created_at.eq.${row.last_message_at})`,
    )
    .join(',');
  const [profilesResult, sendersResult] = await Promise.all([
    profileIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, username, primary_role, city')
          .in('id', profileIds)
      : Promise.resolve({ data: [], error: null }),
    messageFilter
      ? supabase
          .from('messages')
          .select('conversation_id, sender_profile_id, created_at')
          .or(messageFilter)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const profiles = new Map(
    (profilesResult.error ? [] : profilesResult.data ?? []).map((profile) => [
      profile.id,
      profile,
    ]),
  );
  const senders = new Map(
    (sendersResult.error ? [] : sendersResult.data ?? []).map((message) => [
      `${message.conversation_id}:${message.created_at}`,
      message.sender_profile_id,
    ]),
  );

  return rows.map(
    (row): ConversationSummary => ({
      id: row.conversation_id as string,
      type: row.conversation_type as ConversationSummary['type'],
      status: row.conversation_status as ConversationSummary['status'],
      otherProfile: {
        id: row.other_profile_id as string,
        displayName: row.other_display_name as string,
        username:
          profiles.get(row.other_profile_id as string)?.username ?? '',
        avatarUrl: (row.other_avatar_url as string | null) ?? null,
        primaryRole:
          profiles.get(row.other_profile_id as string)?.primary_role ?? '',
        city: profiles.get(row.other_profile_id as string)?.city ?? '',
      },
      opportunityId: (row.opportunity_id as string | null) ?? null,
      opportunityTitle: (row.opportunity_title as string | null) ?? null,
      businessName: (row.business_name as string | null) ?? null,
      lastMessageBody: (row.last_message_body as string | null) ?? '',
      lastMessageFromMe:
        senders.get(`${row.conversation_id}:${row.last_message_at}`) === user.id,
      lastMessageAt: row.last_message_at as string,
      unreadCount: Number(row.unread_count ?? 0),
    }),
  );
}

export async function loadPendingInboxRequestCount() {
  const user = await requireUser();
  const now = new Date().toISOString();
  const [connections, applications] = await Promise.all([
    supabase
      .from('connection_requests')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_profile_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', now),
    supabase
      .from('opportunity_interests')
      .select('id', { count: 'exact', head: true })
      .eq('owner_profile_id', user.id)
      .eq('status', 'submitted'),
  ]);
  const error = connections.error ?? applications.error;
  if (error) throw error;
  return (connections.count ?? 0) + (applications.count ?? 0);
}

export function subscribeToInbox(onChange: () => void) {
  const channel = supabase
    .channel(`inbox:${createClientNonce()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function loadConversationDetail(conversationId: string) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, conversation_type, status, opportunity_id, opportunity_interest_id,
      opportunities(
        title, status, compensation_type, compensation_min, compensation_max,
        currency, rate_period
      ),
      opportunity_interests(
        note, status,
        portfolio_items(title),
        opportunity_interest_skills(skills(name))
      ),
      businesses(name),
      conversation_members(profile_id,
        profiles(id, display_name, username, avatar_url, primary_role, city)
      )
    `)
    .eq('id', conversationId)
    .single();
  if (error) throw error;
  const members = (data.conversation_members ?? []) as unknown as {
    profile_id: string;
    profiles: RawProfileSummary | RawProfileSummary[] | null;
  }[];
  const other = members.find((member) => member.profile_id !== user.id);
  if (!other) throw new Error('This conversation is not available.');
  const opportunity = singleRelation(data.opportunities) as {
    title?: string;
    status?: string;
    compensation_type?: string;
    compensation_min?: number | null;
    compensation_max?: number | null;
    currency?: string | null;
    rate_period?: string | null;
  } | null;
  const response = singleRelation(data.opportunity_interests) as {
    note?: string | null;
    portfolio_items?: { title?: string } | { title?: string }[] | null;
    opportunity_interest_skills?: {
      skills?: { name?: string } | { name?: string }[] | null;
    }[];
  } | null;
  const business = singleRelation(data.businesses) as { name?: string } | null;
  const portfolio = singleRelation(response?.portfolio_items) as {
    title?: string;
  } | null;
  return {
    id: data.id,
    type: data.conversation_type,
    status: data.status,
    otherProfile: mapProfileSummary(
      singleRelation(other.profiles) as RawProfileSummary,
    ),
    opportunityId: data.opportunity_id,
    opportunityTitle: opportunity?.title ?? null,
    opportunityResponseId: data.opportunity_interest_id,
    businessName: business?.name ?? null,
    opportunityStatus: opportunity?.status ?? null,
    compensationSummary: opportunity
      ? formatConversationCompensation(opportunity)
      : null,
    responseNote: response?.note ?? '',
    responseSkills: (response?.opportunity_interest_skills ?? []).map(
      (selection) => {
        const skill = singleRelation(selection.skills) as { name?: string } | null;
        return skill?.name ?? 'Skill';
      },
    ),
    responsePortfolioTitle: portfolio?.title ?? null,
  } satisfies ConversationDetail;
}

export async function loadMessages(
  conversationId: string,
  before?: string,
) {
  let query = supabase
    .from('messages')
    .select('id, conversation_id, sender_profile_id, body, client_nonce, created_at')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapMessage).reverse();
}

export async function sendMessage(
  conversationId: string,
  body: string,
  clientNonce: string,
) {
  const { data, error } = await supabase.rpc('phase5_send_message', {
    target_conversation_id: conversationId,
    target_body: body,
    target_client_nonce: clientNonce,
  });
  if (error) throw error;
  return mapMessage(data);
}

export async function markConversationRead(conversationId: string) {
  const { error } = await supabase.rpc('phase5_mark_conversation_read', {
    target_conversation_id: conversationId,
  });
  if (error) throw error;
}

export async function loadUnreadCount() {
  const { data, error } = await supabase.rpc('phase5_unread_count');
  if (error) throw error;
  return Number(data ?? 0);
}

export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: MessageRecord) => void,
) {
  const channel = supabase
    .channel(`conversation:${conversationId}:${createClientNonce()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(mapMessage(payload.new)),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function blockProfile(profileId: string, reason = '') {
  const { error } = await supabase.rpc('phase5_block_profile', {
    target_profile_id: profileId,
    target_reason: reason.trim() || null,
  });
  if (error) throw error;
}

export async function unblockProfile(profileId: string) {
  const { error } = await supabase.rpc('phase5_unblock_profile', {
    target_profile_id: profileId,
  });
  if (error) throw error;
}

export async function submitReport(input: {
  kind: ReportTargetKind;
  targetId: string;
  reason: ReportReason;
  details: string;
}) {
  const { data, error } = await supabase.rpc('phase5_submit_report', {
    target_kind: input.kind,
    target_id: input.targetId,
    target_reason: input.reason,
    target_details: input.details.trim() || null,
  });
  if (error) throw error;
  return data as string;
}

export async function loadCommunicationPreference() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from('communication_preferences')
    .select('connect_request_setting')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return (data?.connect_request_setting ?? 'everyone') as CommunicationPreference;
}

export async function saveCommunicationPreference(
  setting: CommunicationPreference,
) {
  const user = await requireUser();
  const { error } = await supabase.from('communication_preferences').upsert({
    profile_id: user.id,
    connect_request_setting: setting,
  });
  if (error) throw error;
}

export async function filterBlockedProfileIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.rpc('phase5_filter_profile_ids', {
    target_profile_ids: ids,
  });
  if (error && error.code === 'PGRST202') return ids;
  if (error) throw error;
  return (data ?? []) as string[];
}

export async function filterBlockedOpportunityIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.rpc('phase5_filter_opportunity_ids', {
    target_opportunity_ids: ids,
  });
  if (error && error.code === 'PGRST202') return ids;
  if (error) throw error;
  return (data ?? []) as string[];
}

export function createClientNonce() {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function formatCommunicationError(error: unknown) {
  const details =
    error && typeof error === 'object'
      ? (error as { code?: string; message?: string; name?: string })
      : {};
  if (__DEV__) {
    console.warn('[Communication operation]', {
      code: details.code ?? null,
      message: details.message ?? 'Unknown error',
      name: details.name ?? 'UnknownError',
    });
  }
  const message = details.message ?? '';
  const friendly =
    /^(The connection is not active|Sign in again|This (request|connection|profile|person|opportunity|response|conversation|message|report)|Choose |Keep |Add |Acknowledge |You (have reached|already|cannot)|Messages |Messaging |Reports |A new request)/i.test(
      message,
    );
  return friendly && message
    ? message
    : 'That action could not be completed. Check your connection and try again.';
}

function mapConnectionRequest(row: UnknownRow): ConnectionRequestRecord {
  const portfolio = singleRelation(row.portfolio_items) as { title?: string } | null;
  return {
    id: row.id as string,
    requesterProfileId: row.requester_profile_id as string,
    recipientProfileId: row.recipient_profile_id as string,
    reason: row.reason as ConnectReason,
    note: (row.note as string | null) ?? '',
    portfolioItemId: (row.portfolio_item_id as string | null) ?? null,
    portfolioTitle: portfolio?.title ?? null,
    status:
      row.status === 'pending' &&
      new Date(row.expires_at as string).getTime() <= Date.now()
        ? 'expired'
        : (row.status as ConnectionRequestRecord['status']),
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
    requester: mapProfileSummary(singleRelation(row.requester) as RawProfileSummary),
    recipient: mapProfileSummary(singleRelation(row.recipient) as RawProfileSummary),
  };
}

function mapOpportunityResponse(row: UnknownRow): OpportunityResponseRecord {
  const responder = singleRelation(row.responder) as RawProfileSummary;
  const opportunity = singleRelation(row.opportunities) as UnknownRow;
  const business = singleRelation(opportunity?.businesses) as { name?: string } | null;
  const owner = singleRelation(opportunity?.profiles) as { display_name?: string } | null;
  const portfolio = singleRelation(row.portfolio_items) as {
    title?: string;
    media_url?: string | null;
    thumbnail_url?: string | null;
  } | null;
  const conversation = singleRelation(row.conversations) as { id?: string } | null;
  return {
    id: row.id as string,
    opportunityId: row.opportunity_id as string,
    responderProfileId: row.interested_profile_id as string,
    ownerProfileId: row.owner_profile_id as string,
    note: (row.note as string | null) ?? '',
    portfolioItemId: (row.portfolio_item_id as string | null) ?? null,
    portfolioTitle: portfolio?.title ?? null,
    portfolioMediaUrl: portfolio?.thumbnail_url ?? portfolio?.media_url ?? null,
    status: row.status as OpportunityResponseRecord['status'],
    createdAt: row.created_at as string,
    ownerViewedAt: (row.owner_viewed_at as string | null) ?? null,
    responder: mapProfileSummary(responder),
    opportunityTitle: (opportunity?.title as string | undefined) ?? 'Opportunity',
    posterName: business?.name ?? owner?.display_name ?? 'Lance member',
    businessId: (opportunity?.business_id as string | null) ?? null,
    selectedSkills: ((row.opportunity_interest_skills as UnknownRow[] | null) ?? []).map(
      (selection) => {
        const skill = singleRelation(selection.skills) as { name?: string } | null;
        return { id: selection.skill_id as string, name: skill?.name ?? 'Skill' };
      },
    ),
    conversationId: conversation?.id ?? null,
  };
}

function mapMessage(row: UnknownRow): MessageRecord {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderProfileId: row.sender_profile_id as string,
    body: row.body as string,
    clientNonce: (row.client_nonce as string | null) ?? null,
    createdAt: row.created_at as string,
    deliveryState: 'sent',
  };
}

function mapProfileSummary(row: RawProfileSummary): ProfileSummary {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username ?? '',
    avatarUrl: row.avatar_url,
    primaryRole: row.primary_role ?? '',
    city: row.city ?? '',
  };
}

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function formatConversationCompensation(opportunity: {
  compensation_type?: string;
  compensation_min?: number | null;
  compensation_max?: number | null;
  currency?: string | null;
  rate_period?: string | null;
}) {
  const type = (opportunity.compensation_type ?? 'negotiable').replaceAll('_', ' ');
  const minimum = opportunity.compensation_min;
  const maximum = opportunity.compensation_max;
  if (minimum == null && maximum == null) {
    return type.replace(/^\w/, (letter) => letter.toUpperCase());
  }
  const currency = opportunity.currency ?? 'USD';
  const range =
    minimum != null && maximum != null
      ? `${minimum.toLocaleString()}-${maximum.toLocaleString()}`
      : (minimum ?? maximum)?.toLocaleString();
  const period = opportunity.rate_period
    ? ` ${opportunity.rate_period.replaceAll('_', ' ')}`
    : '';
  return `${currency} ${range}${period}`;
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error('Sign in again to continue.');
  return data.user;
}
