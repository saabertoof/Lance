import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function AuthLayout() {
  const { isLoading, onboardingStatus, session } = useAuth();

  if (isLoading) {
    return <LoadingState message="Checking your session" />;
  }

  if (session) {
    return <Redirect href={onboardingStatus === 'complete' ? '/discover' : '/onboarding'} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
