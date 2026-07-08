import { Redirect, Stack, useLocalSearchParams } from 'expo-router';

import { AuthStatusError } from '@/components/auth/AuthStatusError';
import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { authRoute, normalizeInternalNext } from '@/lib/authNavigation';

export default function OnboardingLayout() {
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const { isLoading, onboardingStatus, session } = useAuth();
  const nextPath = normalizeInternalNext(next);

  if (isLoading) {
    return <LoadingState message="Preparing your profile" />;
  }

  if (!session) {
    return <Redirect href={authRoute('/login', nextPath)} />;
  }

  if (onboardingStatus === 'error') {
    return <AuthStatusError />;
  }

  if (onboardingStatus === 'complete') {
    return <Redirect href={nextPath ?? '/discover'} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
