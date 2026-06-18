import { z } from 'zod';

import { supabase } from '@/lib/supabase';
import {
  businessRemoteOptions,
  businessSizeOptions,
  businessTypeOptions,
  BusinessDraft,
  BusinessRecord,
} from '@/types/business';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const supportedLogoTypes = ['image/jpeg', 'image/png', 'image/webp'];

const optionalHttpsUrl = z
  .string()
  .trim()
  .refine((value) => !value || /^https:\/\/[^\s]+$/i.test(value), {
    message: 'Links must be valid HTTPS URLs.',
  });

const businessSchema = z.object({
  name: z.string().trim().min(2, 'Enter a business or project name.').max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,60}$/, 'Use 3-60 lowercase letters, numbers, or hyphens.'),
  businessType: z.enum(businessTypeOptions.map((option) => option.value)),
  shortDescription: z.string().trim().min(10).max(180),
  fullDescription: z.string().trim().max(2000),
  industry: z.string().trim().min(2).max(80),
  businessSize: z.enum(businessSizeOptions.map((option) => option.value)),
  location: z.string().trim().max(100),
  remoteStatus: z.enum(businessRemoteOptions.map((option) => option.value)),
  foundingYear: z.string().trim(),
  websiteUrl: optionalHttpsUrl,
  instagramUrl: optionalHttpsUrl,
  tiktokUrl: optionalHttpsUrl,
  xUrl: optionalHttpsUrl,
  linkedinUrl: optionalHttpsUrl,
  githubUrl: optionalHttpsUrl,
  contactEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid contact email.')]),
});

type RawBusiness = {
  id: string;
  owner_profile_id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  short_description: string | null;
  full_description: string | null;
  business_type: BusinessDraft['businessType'] | null;
  industry: string | null;
  business_size: BusinessDraft['businessSize'] | null;
  location: string | null;
  remote_status: BusinessDraft['remoteStatus'] | null;
  founding_year: number | null;
  website: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  contact_email: string | null;
  status: BusinessRecord['status'];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  profiles?: { display_name?: string } | { display_name?: string }[] | null;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function normalizeOptionalUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  return /^https:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function validateBusinessDraft(draft: BusinessDraft) {
  const normalized = {
    ...draft,
    websiteUrl: normalizeOptionalUrl(draft.websiteUrl),
    instagramUrl: normalizeOptionalUrl(draft.instagramUrl),
    tiktokUrl: normalizeOptionalUrl(draft.tiktokUrl),
    xUrl: normalizeOptionalUrl(draft.xUrl),
    linkedinUrl: normalizeOptionalUrl(draft.linkedinUrl),
    githubUrl: normalizeOptionalUrl(draft.githubUrl),
  };
  const parsed = businessSchema.safeParse(normalized);

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? 'Check the business fields.';
  }

  if (draft.foundingYear) {
    const year = Number(draft.foundingYear);
    const currentYear = new Date().getFullYear();

    if (!Number.isInteger(year) || year < 1800 || year > currentYear) {
      return `Founding year must be between 1800 and ${currentYear}.`;
    }
  }

  return null;
}

export function validateBusinessLogo(base64: string, mimeType: string | null) {
  if (!mimeType || !supportedLogoTypes.includes(mimeType)) {
    throw new Error('Choose a JPEG, PNG, or WebP logo.');
  }

  const estimatedBytes = Math.floor((base64.length * 3) / 4);

  if (estimatedBytes > MAX_LOGO_BYTES) {
    throw new Error('Choose a logo smaller than 5 MB.');
  }
}

function decodeBase64(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function uploadBusinessLogo(
  ownerId: string,
  businessId: string,
  base64: string,
  mimeType: string,
) {
  validateBusinessLogo(base64, mimeType);
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
  const path = `${ownerId}/${businessId}/logo.${extension}`;
  const { error } = await supabase.storage
    .from('business-assets')
    .upload(path, decodeBase64(base64), {
      cacheControl: '0',
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('business-assets').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

function businessPayload(draft: BusinessDraft, ownerId: string) {
  return {
    owner_profile_id: ownerId,
    name: draft.name.trim(),
    slug: draft.slug.trim().toLowerCase(),
    logo_url: draft.logoUrl,
    short_description: draft.shortDescription.trim(),
    full_description: draft.fullDescription.trim() || null,
    business_type: draft.businessType,
    industry: draft.industry,
    business_size: draft.businessSize,
    location: draft.location.trim() || null,
    remote_status: draft.remoteStatus,
    founding_year: draft.foundingYear ? Number(draft.foundingYear) : null,
    website: normalizeOptionalUrl(draft.websiteUrl) || null,
    instagram_url: normalizeOptionalUrl(draft.instagramUrl) || null,
    tiktok_url: normalizeOptionalUrl(draft.tiktokUrl) || null,
    x_url: normalizeOptionalUrl(draft.xUrl) || null,
    linkedin_url: normalizeOptionalUrl(draft.linkedinUrl) || null,
    github_url: normalizeOptionalUrl(draft.githubUrl) || null,
    contact_email: draft.contactEmail.trim().toLowerCase() || null,
    status: 'active',
  };
}

export async function saveBusiness(
  draft: BusinessDraft,
  ownerId: string,
  businessId?: string,
) {
  const validationError = validateBusinessDraft(draft);

  if (validationError) {
    throw new Error(validationError);
  }

  let row: RawBusiness;

  if (businessId) {
    const { data, error } = await supabase
      .from('businesses')
      .update(businessPayload(draft, ownerId))
      .eq('id', businessId)
      .eq('owner_profile_id', ownerId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    row = data as RawBusiness;
  } else {
    const { data, error } = await supabase
      .from('businesses')
      .insert(businessPayload(draft, ownerId))
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    row = data as RawBusiness;
  }

  if (draft.localLogoBase64 && draft.localLogoMimeType) {
    const logoUrl = await uploadBusinessLogo(
      ownerId,
      row.id,
      draft.localLogoBase64,
      draft.localLogoMimeType,
    );
    const { data, error } = await supabase
      .from('businesses')
      .update({ logo_url: logoUrl })
      .eq('id', row.id)
      .eq('owner_profile_id', ownerId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    row = data as RawBusiness;
  }

  return mapBusiness(row);
}

export async function loadMyBusinesses(ownerId: string, includeArchived = false) {
  let query = supabase
    .from('businesses')
    .select('*, profiles!businesses_owner_profile_id_fkey(display_name)')
    .eq('owner_profile_id', ownerId)
    .order('updated_at', { ascending: false });

  if (!includeArchived) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const businesses = (data ?? []).map((row) => mapBusiness(row as RawBusiness));

  if (businesses.length === 0) {
    return businesses;
  }

  const { data: opportunities, error: opportunityError } = await supabase
    .from('opportunities')
    .select('business_id, status')
    .in(
      'business_id',
      businesses.map((business) => business.id),
    );

  if (opportunityError) {
    throw opportunityError;
  }

  return businesses.map((business) => ({
    ...business,
    activeOpportunityCount: (opportunities ?? []).filter(
      (opportunity) =>
        opportunity.business_id === business.id && opportunity.status === 'published',
    ).length,
    draftOpportunityCount: (opportunities ?? []).filter(
      (opportunity) =>
        opportunity.business_id === business.id && opportunity.status === 'draft',
    ).length,
  }));
}

export async function loadBusiness(businessId: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*, profiles!businesses_owner_profile_id_fkey(display_name)')
    .eq('id', businessId)
    .single();

  if (error) {
    throw error;
  }

  const [business] = await addBusinessCounts([mapBusiness(data as RawBusiness)]);
  return business;
}

async function addBusinessCounts(businesses: BusinessRecord[]) {
  if (businesses.length === 0) {
    return businesses;
  }

  const { data, error } = await supabase
    .from('opportunities')
    .select('business_id, status')
    .in(
      'business_id',
      businesses.map((business) => business.id),
    );

  if (error) {
    throw error;
  }

  return businesses.map((business) => ({
    ...business,
    activeOpportunityCount: (data ?? []).filter(
      (opportunity) =>
        opportunity.business_id === business.id && opportunity.status === 'published',
    ).length,
    draftOpportunityCount: (data ?? []).filter(
      (opportunity) =>
        opportunity.business_id === business.id && opportunity.status === 'draft',
    ).length,
  }));
}

export async function archiveBusiness(businessId: string, ownerId: string) {
  const { error } = await supabase
    .from('businesses')
    .update({ status: 'archived' })
    .eq('id', businessId)
    .eq('owner_profile_id', ownerId);

  if (error) {
    throw error;
  }
}

export function businessToDraft(business: BusinessRecord): BusinessDraft {
  return {
    name: business.name,
    slug: business.slug,
    businessType: business.businessType,
    shortDescription: business.shortDescription,
    fullDescription: business.fullDescription,
    industry: business.industry,
    businessSize: business.businessSize,
    location: business.location,
    remoteStatus: business.remoteStatus,
    foundingYear: business.foundingYear?.toString() ?? '',
    logoUrl: business.logoUrl,
    localLogoUri: null,
    localLogoBase64: null,
    localLogoMimeType: null,
    websiteUrl: business.websiteUrl,
    instagramUrl: business.instagramUrl,
    tiktokUrl: business.tiktokUrl,
    xUrl: business.xUrl,
    linkedinUrl: business.linkedinUrl,
    githubUrl: business.githubUrl,
    contactEmail: business.contactEmail,
  };
}

export function formatBusinessError(error: unknown) {
  if (error && typeof error === 'object') {
    const possibleError = error as { code?: string; message?: string; name?: string };

    if (possibleError.code === '23505') {
      return 'That business slug is already in use. Try another one.';
    }

    if (possibleError.code === '42501') {
      return 'You do not have permission to change this business.';
    }

    if (possibleError.message) {
      return `${possibleError.name ?? 'Business error'}: ${possibleError.message}`;
    }
  }

  return 'The business could not be saved. Check your connection and try again.';
}

function mapBusiness(row: RawBusiness): BusinessRecord {
  const profileRelation = row.profiles;
  const ownerProfile = Array.isArray(profileRelation) ? profileRelation[0] : profileRelation;

  return {
    id: row.id,
    ownerProfileId: row.owner_profile_id,
    name: row.name,
    slug: row.slug ?? '',
    logoUrl: row.logo_url,
    shortDescription: row.short_description ?? '',
    fullDescription: row.full_description ?? '',
    businessType: row.business_type ?? 'other',
    industry: row.industry ?? 'Other',
    businessSize: row.business_size ?? 'one_person',
    location: row.location ?? '',
    remoteStatus: row.remote_status ?? 'flexible',
    foundingYear: row.founding_year,
    websiteUrl: row.website ?? '',
    instagramUrl: row.instagram_url ?? '',
    tiktokUrl: row.tiktok_url ?? '',
    xUrl: row.x_url ?? '',
    linkedinUrl: row.linkedin_url ?? '',
    githubUrl: row.github_url ?? '',
    contactEmail: row.contact_email ?? '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    activeOpportunityCount: 0,
    draftOpportunityCount: 0,
    managedByName: ownerProfile?.display_name ?? 'Lance member',
  };
}
