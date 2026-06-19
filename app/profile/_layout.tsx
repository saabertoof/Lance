import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function ProfileLayout() {
  const { isLoading, onboardingStatus, session } = useAuth();

  if (isLoading) {
    return <LoadingState message="Opening profile editor" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (onboardingStatus !== 'complete') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" />
      <Stack.Screen name="connections" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="communication" />
      <Stack.Screen name="interested-talent" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
