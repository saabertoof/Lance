import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { formatBusinessError, loadBusinessBySlug } from '@/lib/business';
import { routes } from '@/lib/routes';

export default function PublicBusinessLinkScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isLoading: authLoading, onboardingStatus, session } = useAuth();
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveBusiness = useCallback(async () => {
    if (!session || onboardingStatus !== 'complete' || !slug) return;

    setIsResolving(true);
    setError(null);

    try {
      const business = await loadBusinessBySlug(slug);
      router.replace(routes.business(business.id));
    } catch (loadError) {
      setError(formatBusinessError(loadError));
    } finally {
      setIsResolving(false);
    }
  }, [onboardingStatus, session, slug]);

  useEffect(() => {
    void resolveBusiness();
  }, [resolveBusiness]);

  if (authLoading || isResolving) {
    return <LoadingState message="Opening business profile" />;
  }

  if (!session) {
    return (
      <Screen centered contentStyle={styles.centered}>
        <LinkMark />
        <Text style={styles.title}>Sign in to view this business profile.</Text>
        <Text style={styles.body}>
          Business profiles are visible inside Lance so creators and builders stay
          connected to real accounts.
        </Text>
        <View style={styles.actions}>
          <Button label="Sign up" onPress={() => router.push('/signup')} />
          <Button label="Log in" onPress={() => router.push('/login')} variant="secondary" />
        </View>
      </Screen>
    );
  }

  if (onboardingStatus !== 'complete') {
    return (
      <Screen centered contentStyle={styles.centered}>
        <LinkMark />
        <Text style={styles.title}>Finish your Lance profile.</Text>
        <Text style={styles.body}>
          Complete onboarding first, then this business profile will open.
        </Text>
        <Button label="Finish profile" onPress={() => router.push('/onboarding')} />
      </Screen>
    );
  }

  return (
    <Screen centered contentStyle={styles.centered}>
      <LinkMark />
      <Text style={styles.title}>This business profile is unavailable.</Text>
      <Text style={styles.body}>
        It may have been archived, moved, or shared with an old link.
      </Text>
      <Button label="Open Lance" onPress={() => router.replace('/')} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

function LinkMark() {
  return (
    <View style={styles.mark}>
      <Ionicons color={theme.colors.accentStrong} name="business-outline" size={28} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    gap: theme.spacing.md,
    maxWidth: 420,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.heading,
    textAlign: 'center',
  },
  body: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
});
