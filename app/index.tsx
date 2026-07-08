import { Redirect } from 'expo-router';

import { AuthStatusError } from '@/components/auth/AuthStatusError';
import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function IndexRoute() {
  const { isLoading, onboardingStatus, session } = useAuth();

  if (isLoading) {
    return <LoadingState message="Opening Lance" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (onboardingStatus === 'error') {
    return <AuthStatusError />;
  }

  return <Redirect href={onboardingStatus === 'complete' ? '/discover' : '/onboarding'} />;
}
