import { Redirect, Stack, useLocalSearchParams } from 'expo-router';

import { AuthStatusError } from '@/components/auth/AuthStatusError';
import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { authRoute, normalizeInternalNext } from '@/lib/authNavigation';

export default function AuthLayout() {
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const { isLoading, onboardingStatus, session } = useAuth();
  const nextPath = normalizeInternalNext(next);

  if (isLoading) {
    return <LoadingState message="Checking your session" />;
  }

  if (session) {
    if (onboardingStatus === 'error') {
      return <AuthStatusError />;
    }

    return (
      <Redirect
        href={
          onboardingStatus === 'complete'
            ? nextPath ?? '/discover'
            : authRoute('/onboarding', nextPath)
        }
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
