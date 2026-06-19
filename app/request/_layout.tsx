import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function RequestLayout() {
  const { isLoading, onboardingStatus, session } = useAuth();

  if (isLoading) return <LoadingState message="Opening request" />;
  if (!session) return <Redirect href="/login" />;
  if (onboardingStatus !== 'complete') return <Redirect href="/onboarding" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
