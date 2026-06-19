import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';

import { Button, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import type { SavedSearchAlertFrequency } from '@/types/searchPhase6';

const frequencies: {
  label: string;
  value: SavedSearchAlertFrequency;
}[] = [
  { label: 'Paused', value: 'paused' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
];

export function SaveSearchSheet({
  canAlert,
  initialName,
  onClose,
  onSave,
  schedulerEnabled,
  visible,
}: {
  canAlert: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (name: string, frequency: SavedSearchAlertFrequency) => Promise<void>;
  schedulerEnabled: boolean;
  visible: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [frequency, setFrequency] =
    useState<SavedSearchAlertFrequency>('paused');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setFrequency('paused');
      setError(null);
    }
  }, [initialName, visible]);

  async function submit() {
    if (!name.trim()) {
      setError('Add a name for this search.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(name.trim(), frequency);
      onClose();
    } catch {
      setError('This search could not be saved. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Save search</Text>
              <Text style={styles.subtitle}>
                Return to these exact filters anytime.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close save search"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.close}>
              <Ionicons color={theme.colors.text} name="close" size={22} />
            </Pressable>
          </View>
          <TextField
            autoCapitalize="sentences"
            error={error ?? undefined}
            label="Search name"
            maxLength={80}
            onChangeText={setName}
            value={name}
          />

          {canAlert ? (
            <View style={styles.alerts}>
              <Text style={styles.label}>New Job alerts</Text>
              <View style={styles.frequencyRow}>
                {frequencies.map((option) => {
                  const unavailable =
                    option.value !== 'paused' && !schedulerEnabled;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: frequency === option.value,
                        disabled: unavailable,
                      }}
                      disabled={unavailable}
                      key={option.value}
                      onPress={() => setFrequency(option.value)}
                      style={[
                        styles.frequency,
                        frequency === option.value && styles.frequencySelected,
                        unavailable && styles.disabled,
                      ]}>
                      <Text
                        style={[
                          styles.frequencyText,
                          frequency === option.value &&
                            styles.frequencyTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {!schedulerEnabled ? (
                <Text style={styles.note}>
                  Job alerts can be enabled after the scheduler is configured.
                </Text>
              ) : (
                <Text style={styles.note}>
                  Alerts include only newly published matching Jobs.
                </Text>
              )}
            </View>
          ) : null}

          <Button
            label="Save search"
            loading={loading}
            onPress={() => void submit()}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(8,10,18,0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.canvas,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
  close: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    marginLeft: 'auto',
    width: 44,
  },
  alerts: {
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  frequency: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
  },
  frequencySelected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: '#D8CEFF',
  },
  frequencyText: {
    color: theme.colors.text,
    fontSize: theme.typography.label,
    fontWeight: '700',
  },
  frequencyTextSelected: {
    color: theme.colors.accentStrong,
  },
  disabled: {
    opacity: 0.42,
  },
  note: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 17,
  },
});
