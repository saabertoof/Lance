import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useMessaging } from '@/context/MessagingContext';

export default function TabLayout() {
  const { isLoading, onboardingStatus, session } = useAuth();
  const { unreadCount } = useMessaging();

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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 84,
          paddingBottom: 18,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.tiny,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="compass-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="search-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={focused ? theme.colors.accent : color}
              name={focused ? 'add-circle' : 'add-circle-outline'}
              size={size + 4}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? Math.min(unreadCount, 99) : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="chatbubble-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="person-outline" size={size} />,
        }}
      />
    </Tabs>
  );
}
