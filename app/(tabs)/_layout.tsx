import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';

import { AdaptiveTabBar } from '@/components/navigation';
import { LoadingState } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { AdaptiveTabBarProvider } from '@/context/AdaptiveTabBarContext';
import { useMessaging } from '@/context/MessagingContext';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
  const { isLoading, onboardingStatus, session, user } = useAuth();
  const { unreadCount } = useMessaging();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setAvatarUrl(null);
      return;
    }
    const profileId = user.id;
    async function loadAvatar() {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', profileId)
        .maybeSingle();
      if (active) setAvatarUrl(data?.avatar_url ?? null);
    }
    void loadAvatar().catch(() => undefined);
    const channel = supabase
      .channel(`tab-avatar:${profileId}`)
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
  }, [user]);

  if (isLoading) {
    return <LoadingState message="Loading your space" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (onboardingStatus !== 'complete') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <AdaptiveTabBarProvider>
      <Tabs
        tabBar={(props) => (
          <AdaptiveTabBar
            {...props}
            avatarUrl={avatarUrl}
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
