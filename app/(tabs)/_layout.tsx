import { Redirect, Tabs, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { AuthStatusError } from '@/components/auth/AuthStatusError';
import { AdaptiveTabBar } from '@/components/navigation';
import { LoadingState } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { AdaptiveTabBarProvider } from '@/context/AdaptiveTabBarContext';
import { useMessaging } from '@/context/MessagingContext';
import { useSearchAlerts } from '@/context/SearchAlertsContext';
import { authRoute, normalizeInternalNext } from '@/lib/authNavigation';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
  const pathname = usePathname();
  const { isLoading, onboardingStatus, session, user } = useAuth();
  const { unreadCount } = useMessaging();
  const { unreadCount: searchAlertCount } = useSearchAlerts();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarSubscriptionNonce = useRef(0);
  const userId = user?.id ?? null;

  useEffect(() => {
    let active = true;
    if (!userId) {
      setAvatarUrl(null);
      return;
    }
    const profileId = userId;
    async function loadAvatar() {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', profileId)
        .maybeSingle();
      if (active) setAvatarUrl(data?.avatar_url ?? null);
    }
    void loadAvatar().catch(() => undefined);
    avatarSubscriptionNonce.current += 1;
    const channel = supabase
      .channel(`tab-avatar:${profileId}:${avatarSubscriptionNonce.current}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          filter: `id=eq.${profileId}`,
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const next = payload.new as { avatar_url?: string | null };
          if (active) setAvatarUrl(next.avatar_url ?? null);
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if (isLoading) {
    return <LoadingState message="Loading your space" />;
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
    <AdaptiveTabBarProvider>
      <Tabs
        tabBar={(props) => (
          <AdaptiveTabBar
            {...props}
            avatarUrl={avatarUrl}
            searchAlertCount={searchAlertCount}
            unreadCount={unreadCount}
          />
        )}
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: theme.colors.canvas,
          },
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            position: 'absolute',
          },
        }}>
        <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
        <Tabs.Screen name="search" options={{ title: 'Search' }} />
        <Tabs.Screen name="create" options={{ title: 'Create' }} />
        <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </AdaptiveTabBarProvider>
  );
}
