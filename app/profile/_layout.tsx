import { Redirect, Stack, usePathname } from 'expo-router';

import { AuthStatusError } from '@/components/auth/AuthStatusError';
import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { authRoute, normalizeInternalNext } from '@/lib/authNavigation';

export default function ProfileLayout() {
  const pathname = usePathname();
  const { isLoading, onboardingStatus, session } = useAuth();

  if (isLoading) {
    return <LoadingState message="Opening profile editor" />;
  }

  if (!session) {
    return <Redirect href={authRoute('/login', normalizeInternalNext(pathname))} />;
  }

  if (onboardingStatus === 'error') {
    return <AuthStatusError />;
  }

  if (onboardingStatus !== 'complete') {
    return <Redirect href={authRoute('/onboarding', normalizeInternalNext(pathname))} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" />
      <Stack.Screen name="connections" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="communication" />
      <Stack.Screen name="feedback" />
      <Stack.Screen name="interested-talent" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
