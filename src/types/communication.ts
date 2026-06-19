export const connectReasonOptions = [
  { label: 'Build something together', value: 'build_together' },
  { label: 'Looking for a cofounder', value: 'cofounder' },
  { label: 'Hire or find help', value: 'hire_or_help' },
  { label: 'Offer my skills', value: 'offer_skills' },
  { label: 'Work on a project', value: 'project' },
  { label: 'Network', value: 'network' },
  { label: 'Ask about their work', value: 'ask_about_work' },
  { label: 'Mentorship', value: 'mentorship' },
  { label: 'Other', value: 'other' },
] as const;

export const reportReasonOptions = [
  { label: 'Spam or scam', value: 'spam_scam' },
  { label: 'Harassment', value: 'harassment' },
  { label: 'Impersonation', value: 'impersonation' },
  { label: 'Inappropriate content', value: 'inappropriate_content' },
  { label: 'Misleading opportunity', value: 'misleading_opportunity' },
  { label: 'Discrimination', value: 'discrimination' },
  { label: 'Payment or compensation concern', value: 'compensation_concern' },
  { label: 'Underage concern', value: 'underage_concern' },
  { label: 'Other', value: 'other' },
] as const;

export type ConnectReason = (typeof connectReasonOptions)[number]['value'];
export type ReportReason = (typeof reportReasonOptions)[number]['value'];
export type ConnectionRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'expired';
export type OpportunityResponseStatus =
  | 'submitted'
  | 'in_discussion'
  | 'declined'
  | 'withdrawn'
  | 'closed';
export type RelationshipState =
  | 'none'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'connected'
  | 'blocked';

export type ProfileSummary = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  primaryRole: string;
  city: string;
};

export type RelationshipStatus = {
  state: RelationshipState;
  requestId: string | null;
  connectionId: string | null;
  conversationId: string | null;
  blockedByMe: boolean;
  blocked: boolean;
};

export type ConnectResult = {
  state: 'requested' | 'connected';
  requestId: string | null;
  connectionId: string | null;
  conversationId: string | null;
};

export type ConnectionRequestRecord = {
  id: string;
  requesterProfileId: string;
  recipientProfileId: string;
  reason: ConnectReason;
  note: string;
  portfolioItemId: string | null;
  portfolioTitle: string | null;
  status: ConnectionRequestStatus;
  createdAt: string;
  expiresAt: string;
  requester: ProfileSummary;
  recipient: ProfileSummary;
};

export type ConnectionRecord = {
  id: string;
  createdAt: string;
  conversationId: string | null;
  otherProfile: ProfileSummary;
};

export type ProfileSkillOption = {
  id: string;
  name: string;
};

export type OpportunityResponseRecord = {
  id: string;
  opportunityId: string;
  responderProfileId: string;
  ownerProfileId: string;
  note: string;
  portfolioItemId: string | null;
  portfolioTitle: string | null;
  portfolioMediaUrl: string | null;
  status: OpportunityResponseStatus;
  createdAt: string;
  ownerViewedAt: string | null;
  responder: ProfileSummary;
  opportunityTitle: string;
  posterName: string;
  businessId: string | null;
  selectedSkills: ProfileSkillOption[];
  conversationId: string | null;
};

export type OpportunityResponseState = {
  responseId: string | null;
  status: OpportunityResponseStatus | 'none';
  conversationId: string | null;
};

export type ConversationSummary = {
  id: string;
  type: 'direct' | 'opportunity';
  status: 'active' | 'archived' | 'blocked';
  otherProfile: ProfileSummary;
  opportunityId: string | null;
  opportunityTitle: string | null;
  businessName: string | null;
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type ConversationDetail = {
  id: string;
  type: 'direct' | 'opportunity';
  status: 'active' | 'archived' | 'blocked';
  otherProfile: ProfileSummary;
  opportunityId: string | null;
  opportunityTitle: string | null;
  opportunityResponseId: string | null;
  businessName: string | null;
  opportunityStatus: string | null;
  compensationSummary: string | null;
  responseNote: string;
  responseSkills: string[];
  responsePortfolioTitle: string | null;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  senderProfileId: string;
  body: string;
  clientNonce: string | null;
  createdAt: string;
  deliveryState?: 'pending' | 'sent' | 'failed';
};

export type ReportTargetKind =
  | 'profile'
  | 'business'
  | 'opportunity'
  | 'connection_request'
  | 'opportunity_response'
  | 'conversation'
  | 'message';

export type CommunicationPreference = 'everyone' | 'no_new_requests';
