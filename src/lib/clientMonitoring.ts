import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  sanitizeErrorArea,
  sanitizeErrorMessage,
  stableErrorFingerprint,
} from '@/lib/reliability';
import { supabase } from '@/lib/supabase';

type SafeClientError = {
  area: string;
  errorName: string;
  fingerprint: string;
  message: string;
  platform: 'android' | 'ios' | 'unknown' | 'web';
  version: string | null;
};

export function buildSafeClientError(
  error: unknown,
  area: string,
): SafeClientError {
  const details =
    error && typeof error === 'object'
      ? (error as { message?: unknown; name?: unknown })
      : {};
  const errorName = boundedText(details.name, 'Error', 80);
  const message = sanitizeErrorMessage(
    boundedText(details.message, 'An unexpected app error occurred.', 900),
  ).slice(0, 300);
  const safeArea = sanitizeErrorArea(area);
  const platform =
    Platform.OS === 'android' || Platform.OS === 'ios' || Platform.OS === 'web'
      ? Platform.OS
      : 'unknown';

  return {
    area: safeArea,
    errorName,
    fingerprint: stableErrorFingerprint(`${safeArea}:${errorName}:${message}`),
    message,
    platform,
    version: Constants.expoConfig?.version ?? null,
  };
}

export function captureClientError(error: unknown, area: string) {
  const report = buildSafeClientError(error, area);

  if (__DEV__) {
    console.warn('[Client error]', {
      area: report.area,
      errorName: report.errorName,
      fingerprint: report.fingerprint,
    });
  }

  void supabase
    .rpc('record_client_error', {
      target_app_version: report.version,
      target_area: report.area,
      target_error_name: report.errorName,
      target_fingerprint: report.fingerprint,
      target_platform: report.platform,
      target_safe_message: report.message,
    })
    .then(({ error: reportError }) => {
      if (
        reportError &&
        reportError.code !== 'PGRST202' &&
        __DEV__
      ) {
        console.warn('[Client error reporting unavailable]', reportError.name);
      }
    }, () => undefined);
}

function boundedText(value: unknown, fallback: string, maxLength: number) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return (normalized || fallback).slice(0, maxLength);
}
