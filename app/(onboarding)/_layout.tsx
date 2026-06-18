import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function OnboardingLayout() {
  const { isLoading, onboardingStatus, session } = useAuth();

  if (isLoading) {
    return <LoadingState message="Preparing your profile" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (onboardingStatus === 'complete') {
    return <Redirect href="/discover" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
