import type { ImagePickerAsset } from 'expo-image-picker';

import { normalizeCatalogValue } from '@/constants/catalogs';
import {
  getLocationCatalogId,
  getLocationCountryCode,
  locationOptionFromStored,
} from '@/lib/location';
import { supabase } from '@/lib/supabase';
import {
  createEmptyProfilePolish,
  defaultProfileTheme,
  PROFILE_INTENT_LIMIT,
  PROFILE_PORTFOLIO_LIMIT,
  PROFILE_PROMPT_LIMIT,
  type CustomProfileLink,
  type PortfolioItem,
  type ProfilePolish,
  type ProfilePrompt,
} from '@/types/profilePolish';

const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type RawPolishProfile = {
  banner_path: string | null;
  city: string | null;
  location_id: string | null;
  location_region: string | null;
  location_country: string | null;
  profile_template: ProfilePolish['theme']['template'] | null;
  profile_accent: ProfilePolish['theme']['accent'] | null;
  profile_header_alignment: ProfilePolish['theme']['headerAlignment'] | null;
  profile_card_shape: ProfilePolish['theme']['cardShape'] | null;
  profile_background: ProfilePolish['theme']['background'] | null;
};

export async function loadProfilePolish(profileId: string): Promise<ProfilePolish> {
  const [profileResult, intentResult, promptResult, portfolioResult, linkResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'banner_path, city, location_id, location_region, location_country, profile_template, profile_accent, profile_header_alignment, profile_card_shape, profile_background',
        )
        .eq('id', profileId)
        .maybeSingle(),
      supabase
        .from('profile_current_intents')
        .select('intent, visibility, display_order')
        .eq('profile_id', profileId)
        .eq('visibility', 'public')
        .order('display_order'),
      supabase
        .from('profile_prompts')
        .select('id, prompt_key, answer, display_order')
        .eq('profile_id', profileId)
        .order('display_order'),
      supabase
        .from('portfolio_items')
        .select(
          'id, item_type, title, description, media_url, storage_path, thumbnail_url, external_url, accessibility_description, display_order',
        )
        .eq('profile_id', profileId)
        .eq('visibility', 'public')
        .order('display_order'),
      supabase
        .from('user_links')
        .select('id, label, value, icon_key, display_order')
        .eq('profile_id', profileId)
        .eq('link_type', 'custom')
        .eq('visibility', 'public')
        .order('display_order'),
    ]);

  const firstError = [
    profileResult.error,
    intentResult.error,
    promptResult.error,
    portfolioResult.error,
    linkResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  const row = profileResult.data as RawPolishProfile | null;
  if (!row) return createEmptyProfilePolish();

  const storagePaths = [
    row.banner_path,
    ...(portfolioResult.data ?? []).flatMap((item) => [
      item.storage_path,
      item.thumbnail_url?.startsWith('profile-media:')
        ? item.thumbnail_url.slice('profile-media:'.length)
        : null,
    ]),
  ].filter((path): path is string => Boolean(path));
  const signedUrls = await signProfileMedia(storagePaths);
  const location = locationOptionFromStored({
    id: row.location_id,
    label: row.city,
    region: row.location_region,
    country: row.location_country,
  });

  return {
    bannerPath: row.banner_path,
    bannerUrl: row.banner_path ? signedUrls.get(row.banner_path) ?? null : null,
    legacyLocation: row.city ?? '',
    location,
    currentIntents: (intentResult.data ?? []).map(
      (item) => item.intent as ProfilePolish['currentIntents'][number],
    ),
    prompts: (promptResult.data ?? []).map(
      (item): ProfilePrompt => ({
        id: item.id,
        promptKey: item.prompt_key,
        answer: item.answer,
        displayOrder: item.display_order,
      }),
    ),
    theme: {
      template: row.profile_template ?? defaultProfileTheme.template,
      accent: row.profile_accent ?? defaultProfileTheme.accent,
      headerAlignment:
        row.profile_header_alignment ?? defaultProfileTheme.headerAlignment,
      cardShape: row.profile_card_shape ?? defaultProfileTheme.cardShape,
      background: row.profile_background ?? defaultProfileTheme.background,
    },
    portfolio: (portfolioResult.data ?? []).map(
      (item): PortfolioItem => ({
        id: item.id,
        itemType: item.item_type as PortfolioItem['itemType'],
        title: item.title,
        caption: item.description ?? '',
        mediaUrl:
          (item.storage_path ? signedUrls.get(item.storage_path) : item.media_url) ?? null,
        storagePath: item.storage_path,
        thumbnailUrl: item.thumbnail_url?.startsWith('profile-media:')
          ? signedUrls.get(item.thumbnail_url.slice('profile-media:'.length)) ?? null
          : item.thumbnail_url,
        externalUrl: item.external_url,
        accessibilityDescription: item.accessibility_description ?? '',
        displayOrder: item.display_order,
      }),
    ),
    customLinks: (linkResult.data ?? []).map(
      (item): CustomProfileLink => ({
        id: item.id,
        label: item.label,
        url: item.value,
        iconKey: item.icon_key,
        displayOrder: item.display_order,
      }),
    ),
  };
}

export async function saveProfilePolish(profileId: string, polish: ProfilePolish) {
  const location = polish.location;
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      banner_path: polish.bannerPath,
      location_id: getLocationCatalogId(location),
      location_region: location?.region ?? null,
      location_country: getLocationCountryCode(location) || null,
      city: location?.label ?? (polish.legacyLocation.trim() || null),
      profile_template: polish.theme.template,
      profile_accent: polish.theme.accent,
      profile_header_alignment: polish.theme.headerAlignment,
      profile_card_shape: polish.theme.cardShape,
      profile_background: polish.theme.background,
    })
    .eq('id', profileId);
  if (profileError) throw profileError;
  if (
    polish.obsoleteBannerPath &&
    polish.obsoleteBannerPath !== polish.bannerPath
  ) {
    const { error } = await supabase.storage
      .from('profile-media')
      .remove([polish.obsoleteBannerPath]);
    if (error) throw error;
  }

  const { error: deleteIntentError } = await supabase
    .from('profile_current_intents')
    .delete()
    .eq('profile_id', profileId);
  if (deleteIntentError) throw deleteIntentError;
  if (polish.currentIntents.length > 0) {
    const { error } = await supabase.from('profile_current_intents').insert(
      polish.currentIntents.slice(0, PROFILE_INTENT_LIMIT).map((intent, displayOrder) => ({
        profile_id: profileId,
        intent,
        visibility: 'public',
        display_order: displayOrder,
      })),
    );
    if (error) throw error;
  }

  const { error: deletePromptError } = await supabase
    .from('profile_prompts')
    .delete()
    .eq('profile_id', profileId);
  if (deletePromptError) throw deletePromptError;
  const prompts = polish.prompts
    .filter((prompt) => prompt.answer.trim())
    .slice(0, PROFILE_PROMPT_LIMIT);
  if (prompts.length > 0) {
    const { error } = await supabase.from('profile_prompts').insert(
      prompts.map((prompt, displayOrder) => ({
        profile_id: profileId,
        prompt_key: prompt.promptKey,
        answer: prompt.answer.trim(),
        display_order: displayOrder,
      })),
    );
    if (error) throw error;
  }

  await savePortfolio(profileId, polish.portfolio);
  await saveCustomLinks(profileId, polish.customLinks);
}

async function savePortfolio(profileId: string, items: PortfolioItem[]) {
  const { data: previous, error: previousError } = await supabase
    .from('portfolio_items')
    .select('id, storage_path')
    .eq('profile_id', profileId);
  if (previousError) throw previousError;
  const prepared: PortfolioItem[] = [];
  for (const item of items.slice(0, PROFILE_PORTFOLIO_LIMIT)) {
    if (!item.title.trim()) {
      throw new Error('Give each portfolio item a title or remove the unfinished item.');
    }
    if (item.itemType !== 'image' && !item.externalUrl?.trim()) {
      throw new Error('Add a valid link to each external portfolio item.');
    }
    let storagePath = item.storagePath;
    if (item.localBase64) {
      storagePath = await uploadProfileImage(
        profileId,
        item.localBase64,
        item.localMimeType ?? 'image/jpeg',
        `portfolio/${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      );
    }
    prepared.push({ ...item, storagePath });
  }

  const previousIds = new Set((previous ?? []).map((item) => item.id));
  const retainedIds = new Set(
    prepared.filter((item) => previousIds.has(item.id)).map((item) => item.id),
  );
  const rows = prepared.map((item, displayOrder) => ({
    item,
    payload: {
        profile_id: profileId,
        item_type: item.itemType,
        title: item.title.trim(),
        description: item.caption.trim() || null,
        media_url: item.storagePath ? null : item.mediaUrl,
        storage_path: item.storagePath,
        thumbnail_url: item.thumbnailUrl,
        external_url: normalizeSafeUrl(item.externalUrl ?? '', true),
        accessibility_description: item.accessibilityDescription.trim() || null,
        visibility: 'public',
        display_order: displayOrder,
      },
  }));
  for (const row of rows.filter(({ item }) => previousIds.has(item.id))) {
      const { error } = await supabase
        .from('portfolio_items')
        .update(row.payload)
        .eq('id', row.item.id)
        .eq('profile_id', profileId);
      if (error) throw error;
  }
  const removedIds = [...previousIds].filter((id) => !retainedIds.has(id));
  if (removedIds.length > 0) {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('profile_id', profileId)
      .in('id', removedIds);
    if (error) throw error;
  }
  for (const row of rows.filter(({ item }) => !previousIds.has(item.id))) {
    const { error } = await supabase.from('portfolio_items').insert(row.payload);
    if (error) throw error;
  }
  const retained = new Set(
    prepared.map((item) => item.storagePath).filter((path): path is string => Boolean(path)),
  );
  const obsolete = (previous ?? [])
    .map((item) => item.storage_path)
    .filter((path): path is string => Boolean(path) && !retained.has(path));
  if (obsolete.length > 0) {
    const { error: removeError } = await supabase.storage
      .from('profile-media')
      .remove(obsolete);
    if (removeError) throw removeError;
  }
}

async function saveCustomLinks(profileId: string, links: CustomProfileLink[]) {
  const { error: deleteError } = await supabase
    .from('user_links')
    .delete()
    .eq('profile_id', profileId)
    .eq('link_type', 'custom');
  if (deleteError) throw deleteError;

  const prepared = links
    .filter((link) => link.label.trim() && link.url.trim())
    .map((link, displayOrder) => ({
      profile_id: profileId,
      label: link.label.trim().slice(0, 60),
      link_type: 'custom',
      value: normalizeSafeUrl(link.url),
      visibility: 'public',
      icon_key: link.iconKey,
      display_order: displayOrder,
    }));
  if (prepared.length === 0) return;
  const { error } = await supabase.from('user_links').insert(prepared);
  if (error) throw error;
}

export function validateProfileImage(asset: ImagePickerAsset) {
  if (!asset.base64 || !IMAGE_TYPES.includes(asset.mimeType ?? '')) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }
  const bytes = asset.fileSize ?? Math.floor((asset.base64.length * 3) / 4);
  if (bytes > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error('Choose an image smaller than 10 MB.');
  }
}

export async function uploadBanner(
  profileId: string,
  base64: string,
  mimeType: string,
) {
  return uploadProfileImage(profileId, base64, mimeType, 'banner');
}

export function normalizeSafeUrl(value: string, optional = false) {
  const trimmed = value.trim();
  if (!trimmed && optional) return null;
  const candidate = /^https:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Enter a valid HTTPS link.');
  }
  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname.includes('.') ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error('Links must use a safe HTTPS address.');
  }
  return parsed.toString();
}

export function findExistingCatalogLabel(values: string[], candidate: string) {
  const normalized = normalizeCatalogValue(candidate);
  return values.find((value) => normalizeCatalogValue(value) === normalized) ?? null;
}

async function uploadProfileImage(
  profileId: string,
  base64: string,
  mimeType: string,
  stem: string,
) {
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${profileId}/${stem}.${extension}`;
  const { error } = await supabase.storage
    .from('profile-media')
    .upload(path, decodeBase64(base64), {
      cacheControl: '3600',
      contentType: mimeType,
      upsert: true,
    });
  if (error) throw error;
  return path;
}

export async function signProfileMedia(paths: string[]) {
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length === 0) return new Map<string, string>();
  const { data, error } = await supabase.storage
    .from('profile-media')
    .createSignedUrls(uniquePaths, 60 * 60);
  if (error) throw error;
  const signed = new Map<string, string>();
  (data ?? []).forEach((item) => {
    if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
  });
  return signed;
}

function decodeBase64(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}
