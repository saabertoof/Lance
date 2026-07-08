import { Redirect, Stack, usePathname } from 'expo-router';

import { AuthStatusError } from '@/components/auth/AuthStatusError';
import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { authRoute, normalizeInternalNext } from '@/lib/authNavigation';

export default function MessagesLayout() {
  const pathname = usePathname();
  const { isLoading, onboardingStatus, session } = useAuth();

  if (isLoading) return <LoadingState message="Opening conversation" />;
  if (!session) {
    return <Redirect href={authRoute('/login', normalizeInternalNext(pathname))} />;
  }
  if (onboardingStatus === 'error') return <AuthStatusError />;
  if (onboardingStatus !== 'complete') {
    return <Redirect href={authRoute('/onboarding', normalizeInternalNext(pathname))} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
