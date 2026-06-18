import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BusinessForm } from '@/components/business';
import { Button, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  businessToDraft,
  formatBusinessError,
  loadBusiness,
  saveBusiness,
} from '@/lib/business';
import { routes } from '@/lib/routes';
import type { BusinessDraft } from '@/types/business';

export default function EditBusinessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [draft, setDraft] = useState<BusinessDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadBusiness(id)
      .then((business) => {
        if (active) setDraft(businessToDraft(business));
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

  async function save() {
    if (!draft || !user) return;
    setIsSaving(true);
    setError(null);

    try {
      await saveBusiness(draft, user.id, id);
      router.replace(routes.business(id));
    } catch (saveError) {
      setError(formatBusinessError(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading business editor" />;
  if (!draft) {
    return (
      <Screen centered>
        <Text style={styles.error}>{error ?? 'The business could not be loaded.'}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="close" size={24} />
        </Pressable>
        <Text style={styles.title}>Edit business</Text>
        <View style={styles.placeholder} />
      </View>
      <BusinessForm draft={draft} onChange={setDraft} onError={setError} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Save changes" loading={isSaving} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xxl,
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
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
});
