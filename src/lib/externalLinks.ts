import { Linking } from 'react-native';

type OpenExternalUrlOptions = {
  allowMailto?: boolean;
  label?: string;
  onError?: (message: string) => void;
};

export function normalizeExternalUrl(
  value: string | null | undefined,
  allowMailto = false,
) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;

  if (allowMailto && /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(trimmed)) {
    return trimmed;
  }

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (allowMailto && parsed.protocol === 'mailto:') {
    return candidate;
  }

  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname.includes('.') ||
    parsed.username ||
    parsed.password
  ) {
    return null;
  }

  return parsed.toString();
}

export async function openExternalUrl(
  value: string | null | undefined,
  options: OpenExternalUrlOptions = {},
) {
  const normalized = normalizeExternalUrl(value, options.allowMailto);
  const label = options.label ?? 'Link';

  if (!normalized) {
    options.onError?.(`${label} could not be opened.`);
    return false;
  }

  try {
    const supported = await Linking.canOpenURL(normalized);
    if (!supported) throw new Error('Unsupported URL');
    await Linking.openURL(normalized);
    return true;
  } catch {
    options.onError?.(`${label} could not be opened on this device.`);
    return false;
  }
}

