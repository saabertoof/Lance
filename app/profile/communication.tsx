import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useFeedback } from '@/context/FeedbackContext';
import {
  formatCommunicationError,
  loadCommunicationPreference,
  saveCommunicationPreference,
} from '@/lib/communication';
import type { CommunicationPreference } from '@/types/communication';

const options: {
  description: string;
  label: string;
  value: CommunicationPreference;
}[] = [
  {
    label: 'Everyone',
    description: 'Eligible Lance members can send you a Connect request.',
    value: 'everyone',
  },
  {
    label: 'No new requests',
    description:
      'New Connect requests are blocked. Existing connections and conversations remain available.',
    value: 'no_new_requests',
  },
];

export default function CommunicationSettingsScreen() {
  const { showSuccess } = useFeedback();
  const saving = useRef(false);
  const [setting, setSetting] = useState<CommunicationPreference>('everyone');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCommunicationPreference()
      .then(setSetting)
      .catch((loadError) => setError(formatCommunicationError(loadError)))
      .finally(() => setIsLoading(false));
  }, []);

  async function save() {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await saveCommunicationPreference(setting);
      showSuccess('Communication preferences saved.');
      router.back();
    } catch (saveError) {
      setError(formatCommunicationError(saveError));
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading communication preferences" />;

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Communication</Text>
        <View style={styles.iconButton} />
      </View>
      <View style={styles.intro}>
        <Text style={styles.heading}>Who can request to connect?</Text>
        <Text style={styles.subtitle}>
          Blocking always overrides this preference. Opportunity responses are
          controlled by each opportunity’s published status.
        </Text>
      </View>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = setting === option.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => setSetting(option.value)}
              style={[styles.option, selected && styles.optionSelected]}>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Save preference" loading={isSaving} onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  title: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '900' },
  intro: { gap: theme.spacing.sm },
  heading: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, fontSize: theme.typography.small, lineHeight: 21 },
  options: { gap: theme.spacing.md },
  option: { alignItems: 'flex-start', borderColor: theme.colors.border, borderRadius: theme.radii.md, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.lg },
  optionSelected: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
  radio: { alignItems: 'center', borderColor: theme.colors.mutedLight, borderRadius: 10, borderWidth: 2, height: 20, justifyContent: 'center', marginTop: 2, width: 20 },
  radioSelected: { borderColor: theme.colors.accent },
  radioDot: { backgroundColor: theme.colors.accent, borderRadius: 5, height: 10, width: 10 },
  optionCopy: { flex: 1, gap: theme.spacing.xs },
  optionLabel: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '800' },
  optionDescription: { color: theme.colors.muted, fontSize: theme.typography.small, lineHeight: 20 },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20 },
});
