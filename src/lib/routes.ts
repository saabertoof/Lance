import type { Href } from 'expo-router';

export const routes = {
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
};
