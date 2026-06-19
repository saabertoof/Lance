import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { lanceNavigationTheme } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { FeedbackProvider } from '@/context/FeedbackContext';
import { SavedProvider } from '@/context/SavedContext';
import { MessagingProvider } from '@/context/MessagingContext';

export default function RootLayout() {
  return (
    <FeedbackProvider>
      <AuthProvider>
        <SavedProvider>
          <MessagingProvider>
            <ThemeProvider value={lanceNavigationTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="business" />
              <Stack.Screen name="opportunity" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="messages" />
              <Stack.Screen name="request" />
            </Stack>
            <StatusBar style="dark" />
            </ThemeProvider>
          </MessagingProvider>
        </SavedProvider>
      </AuthProvider>
    </FeedbackProvider>
  );
}
