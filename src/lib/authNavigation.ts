import type { Href } from 'expo-router';

const authOnlyPaths = new Set([
  '/login',
  '/signup',
  '/reset-password',
  '/onboarding',
]);

export function normalizeInternalNext(value?: string | string[] | null) {
  const candidate = (Array.isArray(value) ? value[0] : value)?.trim();

  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return null;
  }

  try {
    const parsed = new URL(candidate, 'https://lance.local');
    if (parsed.origin !== 'https://lance.local' || authOnlyPaths.has(parsed.pathname)) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}` as Href;
  } catch {
    return null;
  }
}

export function authRoute(
  pathname: '/login' | '/signup' | '/reset-password' | '/onboarding',
  next?: Href | null,
) {
  return next
    ? ({
        pathname,
        params: { next: String(next) },
      } as Href)
    : (pathname as Href);
}
