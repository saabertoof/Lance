import { Redirect } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function IndexRoute() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return <LoadingState message="Opening Lance" />;
  }

  return <Redirect href={session ? '/discover' : '/login'} />;
}
