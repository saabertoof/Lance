import type { Href } from 'expo-router';
import type { BusinessType } from '@/types/business';

export const routes = {
  editProfile: '/profile/edit' as Href,
  profileSettings: '/profile/settings' as Href,
  betaFeedback: '/profile/feedback' as Href,
  profile: (id: string) =>
    ({ pathname: '/profile/[id]', params: { id } }) as unknown as Href,
  saved: '/profile/saved' as Href,
  businesses: '/business' as Href,
  newBusiness: '/business/new' as Href,
  newBusinessFor: (businessType: BusinessType) =>
    ({
      pathname: '/business/new',
      params: { businessType },
    }) as Href,
  business: (id: string) =>
    ({ pathname: '/business/[id]', params: { id } }) as unknown as Href,
  editBusiness: (id: string) =>
    ({ pathname: '/business/[id]/edit', params: { id } }) as Href,
  interestedTalent: (id: string) =>
    ({ pathname: '/business/[id]/interested-talent', params: { id } }) as Href,
  opportunities: '/opportunity' as Href,
  newOpportunity: (businessId?: string, prompt?: string) =>
    businessId || prompt
      ? (({
          pathname: '/opportunity/new',
          params: { ...(businessId ? { businessId } : {}), ...(prompt ? { prompt } : {}) },
        }) as Href)
      : ('/opportunity/new' as Href),
  opportunity: (id: string, options?: { share?: boolean }) =>
    ({
      pathname: '/opportunity/[id]',
      params: { id, ...(options?.share ? { share: '1' } : {}) },
    }) as unknown as Href,
  publicOpportunity: (slugOrId: string) =>
    ({
      pathname: '/o/[slug]',
      params: { slug: slugOrId },
    }) as unknown as Href,
  editOpportunity: (id: string) =>
    ({ pathname: '/opportunity/[id]/edit', params: { id } }) as Href,
  opportunityTalent: (id: string) =>
    ({ pathname: '/opportunity/[id]/responses', params: { id } }) as Href,
  conversation: (id: string) =>
    ({ pathname: '/messages/[id]', params: { id } }) as unknown as Href,
  messages: '/messages' as Href,
  messageRequests: ({
    pathname: '/(tabs)/messages',
    params: { direction: 'received', view: 'requests' },
  }) as unknown as Href,
  connectRequest: (id: string) =>
    ({ pathname: '/request/connect/[id]', params: { id } }) as unknown as Href,
  opportunityResponse: (id: string) =>
    ({ pathname: '/request/opportunity/[id]', params: { id } }) as unknown as Href,
  connections: '/profile/connections' as Href,
  sentRequests: '/profile/requests' as Href,
  applications: ({
    pathname: '/profile/requests',
    params: { kind: 'applications' },
  }) as unknown as Href,
  communicationSettings: '/profile/communication' as Href,
  interestedTalentHub: '/profile/interested-talent' as Href,
  savedSearches: '/search/manage' as Href,
  searchAlerts: '/search/alerts' as Href,
};
