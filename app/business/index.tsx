import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BusinessCard } from '@/components/business';
import {
  CompactPageHeader,
  EmptyState,
  LoadingState,
  Screen,
} from '@/components/ui';
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
      <CompactPageHeader
        eyebrow="Your Lance"
        rightAction={
          <Pressable
            accessibilityLabel="Create business profile"
            accessibilityRole="button"
            onPress={() => router.push(routes.newBusiness)}
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.pressed,
            ]}>
            <Ionicons color={theme.colors.white} name="add" size={22} />
          </Pressable>
        }
        subtitle="Manage the identities you post opportunities from."
        title="Businesses"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {businesses.length === 0 ? (
        <View style={styles.emptyPanel}>
          <EmptyState
            actionLabel="Create a business"
            body="Build a clean public identity, then publish opportunity links under it."
            onActionPress={() => router.push(routes.newBusiness)}
            title="No business profiles yet"
          />
        </View>
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
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderColor: 'rgba(167,139,250,0.5)',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  emptyPanel: {
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    marginTop: theme.spacing.sm,
    overflow: 'hidden',
  },
  list: {
    gap: theme.spacing.sm,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
