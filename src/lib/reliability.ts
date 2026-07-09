export function sanitizeErrorMessage(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[email]')
    .replace(/\beyJ[\w-]+\.[\w-]+(?:\.[\w-]+)?\b/g, '[token]')
    .replace(/\b(?:sk|sb_secret|service_role)[-_][\w-]{12,}\b/gi, '[secret]')
    .replace(/\bapikey\s*[:=]\s*\S+/gi, 'apikey=[redacted]')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeErrorArea(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return normalized || 'unknown';
}

export function stableErrorFingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `lance-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function isNetworkFailure(error: unknown) {
  const details =
    error && typeof error === 'object'
      ? (error as { message?: unknown; name?: unknown })
      : {};
  const signal = `${String(details.name ?? '')} ${String(details.message ?? '')}`;
  return /network request failed|failed to fetch|networkerror|fetcherror|timed? ?out|offline/i.test(
    signal,
  );
}

export function calculateFunnelConversion(views: number, applications: number) {
  if (!Number.isFinite(views) || views <= 0) return 0;
  const safeApplications = Number.isFinite(applications)
    ? Math.max(0, applications)
    : 0;
  return Math.min(100, Math.round((safeApplications / views) * 100));
}

export function hasMeaningfulChanges<T extends object>(
  current: T,
  baseline: T,
  ignoredKeys: readonly (keyof T)[] = [],
) {
  const ignored = new Set<keyof T>(ignoredKeys);
  return (Object.keys(baseline) as (keyof T)[]).some((key) => {
    if (ignored.has(key)) return false;
    const currentValue = current[key];
    const baselineValue = baseline[key];
    if (Array.isArray(currentValue) && Array.isArray(baselineValue)) {
      return (
        currentValue.length !== baselineValue.length ||
        currentValue.some((value, index) => value !== baselineValue[index])
      );
    }
    return currentValue !== baselineValue;
  });
}
