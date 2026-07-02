import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { lanceFonts } from '@/constants/fonts';
import { lanceNavigationTheme } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { FeedbackProvider } from '@/context/FeedbackContext';
import { SavedProvider } from '@/context/SavedContext';
import { MessagingProvider } from '@/context/MessagingContext';
import { SearchAlertsProvider } from '@/context/SearchAlertsContext';
import { configureTypographyDefaults } from '@/lib/configureTypography';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(lanceFonts);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;
  if (fontsLoaded) configureTypographyDefaults();

  return (
    <FeedbackProvider>
      <AuthProvider>
        <SavedProvider>
          <MessagingProvider>
            <SearchAlertsProvider>
              <ThemeProvider value={lanceNavigationTheme}>
                <Stack
                  screenOptions={{
                    contentStyle: {
                      backgroundColor: lanceNavigationTheme.colors.background,
                    },
                    headerShown: false,
                  }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(onboarding)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="business" />
                  <Stack.Screen name="opportunity" />
                  <Stack.Screen name="profile" />
                  <Stack.Screen name="messages" />
                  <Stack.Screen name="o" />
                  <Stack.Screen name="request" />
                  <Stack.Screen name="search" />
                </Stack>
                <StatusBar
                  backgroundColor="transparent"
                  style="dark"
                  translucent
                />
              </ThemeProvider>
            </SearchAlertsProvider>
          </MessagingProvider>
        </SavedProvider>
      </AuthProvider>
    </FeedbackProvider>
  );
}
