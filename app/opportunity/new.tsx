import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OpportunityEditor } from '@/components/opportunity';
import { LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { loadMyBusinesses } from '@/lib/business';
import { formatOpportunityError, saveOpportunity } from '@/lib/opportunity';
import { loadPersonalProfile } from '@/lib/profile';
import { routes } from '@/lib/routes';
import type { BusinessRecord } from '@/types/business';
import {
  createEmptyOpportunityDraft,
  OpportunityDraft,
  OpportunityStatus,
} from '@/types/opportunity';

export default function NewOpportunityScreen() {
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [displayName, setDisplayName] = useState('My profile');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [initialDraft, setInitialDraft] = useState<OpportunityDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function prepare() {
      if (!user) return;

      try {
        const [businessResult, profile] = await Promise.all([
          loadMyBusinesses(user.id),
          loadPersonalProfile(user.id, user.email ?? null),
        ]);
        const draft = createEmptyOpportunityDraft();

        if (businessId && businessResult.some((business) => business.id === businessId)) {
          draft.postingIdentity = 'business';
          draft.businessId = businessId;
        }

        if (active) {
          setBusinesses(businessResult);
          setDisplayName(profile?.displayName ?? 'My profile');
          setProfileImageUrl(profile?.avatarUrl ?? null);
          setInitialDraft(draft);
        }
      } catch (loadError) {
        if (active) setError(formatOpportunityError(loadError));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void prepare();
    return () => {
      active = false;
    };
  }, [businessId, user]);

  async function save(draft: OpportunityDraft, status: OpportunityStatus) {
    if (!user) return;
    setIsSaving(true);
    setError(null);

    try {
      const id = await saveOpportunity(draft, user.id, status);
      router.replace(routes.opportunity(id));
    } catch (saveError) {
      setError(formatOpportunityError(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState message="Preparing opportunity" />;
  if (!initialDraft) {
    return (
      <Screen centered>
        <Text style={styles.error}>{error ?? 'The opportunity editor could not open.'}</Text>
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
        <Text style={styles.title}>Post opportunity</Text>
        <View style={styles.placeholder} />
      </View>
      <OpportunityEditor
        businesses={businesses}
        displayName={displayName}
        initialDraft={initialDraft}
        isSaving={isSaving}
        onCreateBusiness={() => router.push(routes.newBusiness)}
        onError={setError}
        onSave={save}
        profileImageUrl={profileImageUrl}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
});
