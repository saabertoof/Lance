import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BusinessCard } from '@/components/business';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { formatBusinessError, loadMyBusinesses } from '@/lib/business';
import { routes } from '@/lib/routes';
import type { BusinessRecord } from '@/types/business';

export default function MyBusinessesScreen() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        if (!user) {
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const result = await loadMyBusinesses(user.id, true);
          if (active) setBusinesses(result);
        } catch (loadError) {
          if (active) setError(formatBusinessError(loadError));
        } finally {
          if (active) setIsLoading(false);
        }
      }

      void load();
      return () => {
        active = false;
      };
    }, [user]),
  );

  if (isLoading) {
    return <LoadingState message="Loading your businesses" />;
  }

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>My businesses</Text>
        <View style={styles.placeholder} />
      </View>
      <Text style={styles.subtitle}>Manage businesses and projects you own.</Text>
      <Button
        label="Create business or project"
        onPress={() => router.push(routes.newBusiness)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {businesses.length === 0 ? (
        <EmptyState
          body="Create one to build a public identity and post opportunities under it."
          title="You have not created a business or project yet."
        />
      ) : (
        <View style={styles.list}>
          {businesses.map((business) => (
            <BusinessCard
              business={business}
              key={business.id}
              onPress={() => router.push(routes.business(business.id))}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  placeholder: {
    height: 44,
    width: 44,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
  list: {
    gap: theme.spacing.md,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    textAlign: 'center',
  },
});
