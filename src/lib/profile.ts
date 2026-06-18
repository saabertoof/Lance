import type { ImagePickerAsset } from 'expo-image-picker';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';
import {
  availabilityOptions,
  experienceOptions,
  intentOptions,
  opportunityInterestOptions,
  PersonalProfile,
  ProfileDraft,
  ProfileLink,
  profileLinkOptions,
  remotePreferenceOptions,
} from '@/types/profile';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const supportedAvatarTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter your display name.').max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9_]{3,24}$/,
      'Use 3-24 lowercase letters, numbers, or underscores.',
    ),
  city: z.string().trim().min(2, 'Enter a city or general location.').max(80),
  primaryRole: z.string().trim().min(2, 'Choose your primary role.').max(60),
  headline: z.string().trim().min(3, 'Add a short headline.').max(120),
  bio: z.string().trim().min(10, 'Tell people a little more about you.').max(600),
  skills: z.array(z.string().trim().min(1).max(50)).min(1, 'Add at least one skill.').max(20),
  opportunityInterests: z
    .array(z.enum(opportunityInterestOptions.map((option) => option.value)))
    .min(1, 'Choose at least one opportunity interest.'),
  industryExperience: z.array(z.string().trim().min(1).max(60)).max(15),
  primaryIntent: z.enum(intentOptions.map((option) => option.value)),
  remotePreference: z.enum(remotePreferenceOptions.map((option) => option.value)),
  experienceLevel: z.enum(experienceOptions.map((option) => option.value)),
  availability: z.enum(availabilityOptions.map((option) => option.value)),
});

const emailSchema = z.string().trim().email();

export class ProfileConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileConfigurationError';
  }
}

export function validateProfileDraft(draft: ProfileDraft, requireAdultConfirmation: boolean) {
  const parsed = profileSchema.safeParse(draft);

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? 'Check the required profile fields.';
  }

  if (requireAdultConfirmation && !draft.confirmedAdult) {
    return 'Confirm that you are at least 18 to continue.';
  }

  return null;
}

export function normalizeListEntry(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function addUniqueListEntry(entries: string[], value: string, max = 20) {
  const normalized = normalizeListEntry(value);

  if (!normalized || entries.length >= max) {
    return entries;
  }

  const alreadyExists = entries.some(
    (entry) => entry.toLowerCase() === normalized.toLowerCase(),
  );

  return alreadyExists ? entries : [...entries, normalized];
}

export function normalizeProfileLink(linkType: string, rawValue: string): ProfileLink | null {
  const option = profileLinkOptions.find((item) => item.value === linkType);
  const value = rawValue.trim();

  if (!option || !value) {
    return null;
  }

  if (linkType === 'email') {
    const parsedEmail = emailSchema.safeParse(value);

    if (!parsedEmail.success) {
      throw new Error('Enter a valid email address.');
    }

    return {
      label: option.label,
      linkType: option.value,
      value: parsedEmail.data.toLowerCase(),
      displayOrder: 0,
    };
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(candidate);
  } catch {
    throw new Error(`Enter a valid ${option.label} URL.`);
  }

  if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.includes('.')) {
    throw new Error(`${option.label} must be a valid HTTPS URL.`);
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error(`${option.label} must not contain embedded credentials.`);
  }

  return {
    label: option.label,
    linkType: option.value,
    value: parsedUrl.toString(),
    displayOrder: 0,
  };
}

export function normalizeProfileLinks(links: ProfileLink[]) {
  return links
    .map((link) => normalizeProfileLink(link.linkType, link.value))
    .filter((link): link is ProfileLink => Boolean(link))
    .map((link, index) => ({ ...link, displayOrder: index }));
}

export function calculateProfileCompletion(profile: PersonalProfile | ProfileDraft) {
  const checks = [
    profile.displayName,
    profile.username,
    profile.city,
    profile.primaryRole,
    profile.headline,
    profile.bio,
    profile.skills.length > 0,
    profile.opportunityInterests.length > 0,
    profile.avatarUrl,
    profile.links.length > 0,
  ];
  const complete = checks.filter(Boolean).length;

  return Math.round((complete / checks.length) * 100);
}

export function formatProfileError(error: unknown) {
  if (error && typeof error === 'object') {
    const possibleError = error as { code?: string; message?: string; name?: string };

    if (possibleError.code === '23505') {
      return 'That username is already taken. Try another one.';
    }

    if (possibleError.code === '42501') {
      return 'Your session cannot update this profile. Sign in again and retry.';
    }

    if (possibleError.name === 'Error' && possibleError.message) {
      return possibleError.message;
    }

    if (__DEV__) {
      console.warn('[Profile operation]', {
        code: possibleError.code ?? null,
        message: possibleError.message ?? 'Unknown error',
        name: possibleError.name ?? 'UnknownError',
      });
    }
  }

  return 'The profile could not be saved. Check your connection and try again.';
}

function inferAvatarMimeType(asset: ImagePickerAsset) {
  if (asset.mimeType && supportedAvatarTypes.includes(asset.mimeType as (typeof supportedAvatarTypes)[number])) {
    return asset.mimeType;
  }

  const extension = asset.fileName?.split('.').pop()?.toLowerCase();

  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg';
  }

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return null;
}

function decodeBase64(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export function validateAvatarAsset(asset: ImagePickerAsset) {
  const mimeType = inferAvatarMimeType(asset);

  if (!mimeType) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }

  if (asset.fileSize && asset.fileSize > MAX_AVATAR_BYTES) {
    throw new Error('Choose an image smaller than 5 MB.');
  }

  if (!asset.base64) {
    throw new Error('The selected image could not be prepared for upload.');
  }

  const estimatedBytes = Math.floor((asset.base64.length * 3) / 4);

  if (estimatedBytes > MAX_AVATAR_BYTES) {
    throw new Error('Choose an image smaller than 5 MB.');
  }

  return mimeType;
}

export async function uploadAvatar(userId: string, base64: string) {
  const estimatedBytes = Math.floor((base64.length * 3) / 4);

  if (estimatedBytes > MAX_AVATAR_BYTES) {
    throw new Error('Choose an image smaller than 5 MB.');
  }

  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decodeBase64(base64), {
      cacheControl: '0',
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

type RawProfileRow = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  city: string | null;
  remote_preference: ProfileDraft['remotePreference'] | null;
  primary_role: string | null;
  experience_level: ProfileDraft['experienceLevel'] | null;
  availability: ProfileDraft['availability'] | null;
  industry_experience: string[] | null;
  is_18_or_older_confirmed_at: string | null;
  onboarding_completed_at: string | null;
};

export async function loadPersonalProfile(userId: string, email: string | null) {
  const [profileResult, preferenceResult, skillResult, interestResult, linkResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id, display_name, username, avatar_url, headline, bio, city, remote_preference, primary_role, experience_level, availability, industry_experience, is_18_or_older_confirmed_at, onboarding_completed_at',
        )
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('user_preferences')
        .select('primary_intent')
        .eq('profile_id', userId)
        .maybeSingle(),
      supabase
        .from('profile_skills')
        .select('skills(name)')
        .eq('profile_id', userId),
      supabase
        .from('profile_opportunity_interests')
        .select('interest')
        .eq('profile_id', userId),
      supabase
        .from('user_links')
        .select('label, link_type, value, display_order')
        .eq('profile_id', userId)
        .order('display_order'),
    ]);

  const firstError = [
    profileResult.error,
    preferenceResult.error,
    skillResult.error,
    interestResult.error,
    linkResult.error,
  ].find(Boolean);

  if (firstError) {
    throw firstError;
  }

  if (!profileResult.data) {
    return null;
  }

  const row = profileResult.data as RawProfileRow;
  const skills = (skillResult.data ?? [])
    .map((item) => {
      const relation = item.skills as unknown as { name?: string } | { name?: string }[] | null;
      return Array.isArray(relation) ? relation[0]?.name : relation?.name;
    })
    .filter((name): name is string => Boolean(name));
  const opportunityInterests = (interestResult.data ?? []).map(
    (item) => item.interest as ProfileDraft['opportunityInterests'][number],
  );
  const links = (linkResult.data ?? []).map((link) => ({
    label: link.label,
    linkType: link.link_type as ProfileLink['linkType'],
    value: link.value,
    displayOrder: link.display_order,
  }));

  const profile: PersonalProfile = {
    id: row.id,
    email,
    displayName: row.display_name,
    username: row.username ?? '',
    avatarUrl: row.avatar_url,
    city: row.city ?? '',
    remotePreference: isOptionValue(remotePreferenceOptions, row.remote_preference)
      ? row.remote_preference
      : 'flexible',
    primaryIntent:
      isOptionValue(intentOptions, preferenceResult.data?.primary_intent)
        ? preferenceResult.data.primary_intent
        : 'explore_everything',
    primaryRole: row.primary_role ?? '',
    headline: row.headline ?? '',
    bio: row.bio ?? '',
    experienceLevel: isOptionValue(experienceOptions, row.experience_level)
      ? row.experience_level
      : 'just_starting',
    availability: isOptionValue(availabilityOptions, row.availability)
      ? row.availability
      : 'flexible_hours',
    skills,
    opportunityInterests,
    industryExperience: row.industry_experience ?? [],
    links,
    confirmedAdultAt: row.is_18_or_older_confirmed_at,
    onboardingCompletedAt: row.onboarding_completed_at,
  };

  return profile;
}

function isOptionValue<T extends string>(
  options: readonly { value: T }[],
  value: unknown,
): value is T {
  return typeof value === 'string' && options.some((option) => option.value === value);
}

export function profileToDraft(profile: PersonalProfile): ProfileDraft {
  return {
    displayName: profile.displayName,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    localAvatarUri: null,
    localAvatarBase64: null,
    city: profile.city,
    remotePreference: profile.remotePreference,
    confirmedAdult: Boolean(profile.confirmedAdultAt),
    primaryIntent: profile.primaryIntent,
    primaryRole: profile.primaryRole,
    headline: profile.headline,
    bio: profile.bio,
    experienceLevel: profile.experienceLevel,
    availability: profile.availability,
    skills: profile.skills,
    opportunityInterests: profile.opportunityInterests,
    industryExperience: profile.industryExperience,
    links: profile.links,
  };
}

export async function savePersonalProfile(
  draft: ProfileDraft,
  completeOnboarding: boolean,
) {
  const validationError = validateProfileDraft(draft, completeOnboarding);

  if (validationError) {
    throw new Error(validationError);
  }

  const links = draft.links.map((link, index) => ({
    label: link.label,
    link_type: link.linkType,
    value: link.value,
    display_order: index,
  }));

  const { data, error } = await supabase.rpc('save_my_profile', {
    p_display_name: draft.displayName.trim(),
    p_username: draft.username.trim().toLowerCase(),
    p_avatar_url: draft.avatarUrl,
    p_headline: draft.headline.trim(),
    p_bio: draft.bio.trim(),
    p_city: draft.city.trim(),
    p_remote_preference: draft.remotePreference,
    p_primary_role: draft.primaryRole,
    p_experience_level: draft.experienceLevel,
    p_availability: draft.availability,
    p_industry_experience: draft.industryExperience,
    p_primary_intent: draft.primaryIntent,
    p_skill_names: draft.skills,
    p_opportunity_interests: draft.opportunityInterests,
    p_links: links,
    p_confirm_adult: draft.confirmedAdult,
    p_complete_onboarding: completeOnboarding,
  });

  if (error) {
    throw error;
  }

  return data;
}
