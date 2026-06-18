import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const useReactNativeFetch = process.env.EXPO_PUBLIC_USE_RN_FETCH === '1';

if (typeof supabaseUrl !== 'string' || supabaseUrl.trim() === '') {
  throw new Error(
    'Supabase configuration is missing EXPO_PUBLIC_SUPABASE_URL. Add it to the root .env file beside package.json, then restart Expo with a cleared cache.',
  );
}

if (typeof supabasePublishableKey !== 'string' || supabasePublishableKey.trim() === '') {
  throw new Error(
    'Supabase configuration is missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add it to the root .env file beside package.json, then restart Expo with a cleared cache.',
  );
}

if (
  supabaseUrl !== supabaseUrl.trim() ||
  supabasePublishableKey !== supabasePublishableKey.trim() ||
  /^['"]|['"]$/.test(supabaseUrl) ||
  /^['"]|['"]$/.test(supabasePublishableKey)
) {
  throw new Error(
    'Supabase configuration values must not include surrounding whitespace or quotation marks. Update the root .env file, then restart Expo with a cleared cache.',
  );
}

let supabaseHostname: string;

try {
  supabaseHostname = new URL(supabaseUrl).hostname;
} catch {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL is not a valid URL. Update it in the root .env file, then restart Expo with a cleared cache.',
  );
}

const reactNativeFetch = globalThis.fetch.bind(globalThis);
const supabaseAuthHealthUrl = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/health`;
const supabaseAuthHealthHeaders = {
  Accept: 'application/json',
  apikey: supabasePublishableKey,
};

export const supabaseDiagnostics = {
  hasSupabaseUrl: true,
  hasPublishableKey: true,
  hostname: supabaseHostname,
  urlLooksValid: true,
  useReactNativeFetch,
  fetchImplementation: 'globalThis.fetch',
};

if (__DEV__) {
  console.info('[supabase diagnostics]', supabaseDiagnostics);
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
  global: {
    fetch: reactNativeFetch,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  if (AppState.currentState === 'active') {
    supabase.auth.startAutoRefresh();
  }
}

type SupabaseConnectionDiagnostic = {
  completed: boolean;
  status?: number;
  name?: string;
  version?: string;
  errorName?: string;
  errorMessage?: string;
};

function getErrorName(error: unknown) {
  return error instanceof Error ? error.name : 'Error';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

export async function testSupabaseAuthHealth(): Promise<SupabaseConnectionDiagnostic> {
  try {
    const response = await reactNativeFetch(supabaseAuthHealthUrl, {
      method: 'GET',
      headers: supabaseAuthHealthHeaders,
    });
    const body = await response.text();
    let parsed: Record<string, unknown> | null = null;

    try {
      parsed = body ? (JSON.parse(body) as Record<string, unknown>) : null;
    } catch {
      parsed = null;
    }

    const name = typeof parsed?.name === 'string' ? parsed.name : undefined;
    const version = typeof parsed?.version === 'string' ? parsed.version : undefined;
    const message =
      typeof parsed?.message === 'string'
        ? parsed.message
        : typeof parsed?.error === 'string'
          ? parsed.error
          : response.ok
            ? undefined
            : response.statusText || 'The health request did not succeed.';

    return {
      completed: true,
      status: response.status,
      name,
      version,
      errorName: response.ok ? undefined : 'HttpError',
      errorMessage: response.ok ? undefined : message,
    };
  } catch (error) {
    return {
      completed: false,
      errorName: getErrorName(error),
      errorMessage: getErrorMessage(error),
    };
  }
}
