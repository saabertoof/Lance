const publicBaseUrl = 'https://lance.app';

export function getBusinessPublicUrl(business: {
  id: string;
  slug?: string | null;
}) {
  const slug = business.slug?.trim();
  return slug ? `${publicBaseUrl}/b/${slug}` : `${publicBaseUrl}/business/${business.id}`;
}

export function getProfilePublicUrl(profile: {
  id: string;
}) {
  return `${publicBaseUrl}/profile/${profile.id}`;
}

