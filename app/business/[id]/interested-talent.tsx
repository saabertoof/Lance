import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { formatBusinessError, loadBusiness } from '@/lib/business';
import type { BusinessRecord } from '@/types/business';

export default function InterestedTalentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadBusiness(id)
      .then((result) => {
        if (active) setBusiness(result);
      })
      .catch((loadError) => {
        if (active) setError(formatBusinessError(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (isLoading) {
    return <LoadingState message="Opening interested talent" />;
  }

  const isOwner = business?.ownerProfileId === user?.id;

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Interested talent</Text>
        <View style={styles.placeholder} />
      </View>

      {isOwner ? (
        <EmptyState
          body="People who express interest in your opportunities will appear here."
          title="No interested talent yet"
        />
      ) : (
        <EmptyState
          body="This owner-only area is not available for this business."
          title="Owner access only"
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xxl,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  placeholder: {
    height: 44,
    width: 44,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    textAlign: 'center',
  },
});
