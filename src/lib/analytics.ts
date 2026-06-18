type EventProperties = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(eventName: string, properties?: EventProperties) {
  if (__DEV__) {
    console.info('[analytics]', eventName, properties ?? {});
  }
}
