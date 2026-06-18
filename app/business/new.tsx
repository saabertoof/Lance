import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BusinessForm } from '@/components/business';
import { Button, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { formatBusinessError, saveBusiness } from '@/lib/business';
import { routes } from '@/lib/routes';
import { createEmptyBusinessDraft } from '@/types/business';

export default function NewBusinessScreen() {
  const { user } = useAuth();
  const [draft, setDraft] = useState(createEmptyBusinessDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createBusiness() {
    if (!user) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const business = await saveBusiness(draft, user.id);
      router.replace(routes.business(business.id));
    } catch (saveError) {
      setError(formatBusinessError(saveError));
    } finally {
      setIsSaving(false);
    }
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
        <Text style={styles.title}>Create business</Text>
        <View style={styles.placeholder} />
      </View>
      <BusinessForm draft={draft} onChange={setDraft} onError={setError} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isSaving && draft.localLogoBase64 ? (
        <Text style={styles.loading}>Saving business and uploading logo...</Text>
      ) : null}
      <Button label="Create business or project" loading={isSaving} onPress={createBusiness} />
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
  loading: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    textAlign: 'center',
  },
});
