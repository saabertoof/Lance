import type { Href } from 'expo-router';

export const routes = {
  editProfile: '/profile/edit' as Href,
  profileSettings: '/profile/settings' as Href,
  profile: (id: string) =>
    ({ pathname: '/profile/[id]', params: { id } }) as unknown as Href,
  saved: '/profile/saved' as Href,
  businesses: '/business' as Href,
  newBusiness: '/business/new' as Href,
  business: (id: string) =>
    ({ pathname: '/business/[id]', params: { id } }) as unknown as Href,
  editBusiness: (id: string) =>
    ({ pathname: '/business/[id]/edit', params: { id } }) as Href,
  interestedTalent: (id: string) =>
    ({ pathname: '/business/[id]/interested-talent', params: { id } }) as Href,
  opportunities: '/opportunity' as Href,
  newOpportunity: (businessId?: string) =>
    businessId
      ? (({
          pathname: '/opportunity/new',
          params: { businessId },
        }) as Href)
      : ('/opportunity/new' as Href),
  opportunity: (id: string) =>
    ({ pathname: '/opportunity/[id]', params: { id } }) as unknown as Href,
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
};
