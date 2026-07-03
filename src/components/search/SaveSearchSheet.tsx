import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui';
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
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
              <Text style={styles.kicker}>Saved lane</Text>
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
              <Ionicons color={v.text} name="close" size={21} />
            </Pressable>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Search name</Text>
            <TextInput
              accessibilityLabel="Search name"
              autoCapitalize="sentences"
              maxLength={80}
              onChangeText={setName}
              placeholder="Growth marketers in Chicago"
              placeholderTextColor={v.muted}
              style={styles.input}
              value={name}
            />
            <Text style={styles.counter}>{name.length}/80</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          {canAlert ? (
            <View style={styles.alerts}>
              <Text style={styles.label}>Opportunity alerts</Text>
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
                  Opportunity alerts can be enabled after the scheduler is configured.
                </Text>
              ) : (
                <Text style={styles.note}>
                  Alerts include only newly published matching opportunities.
                </Text>
              )}
            </View>
          ) : null}

          <Button
            labelStyle={styles.buttonLabel}
            label="Save search"
            loading={loading}
            onPress={() => void submit()}
            style={styles.saveButton}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.58)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: v.surface,
    borderColor: v.borderStrong,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    gap: 18,
    padding: 18,
    paddingBottom: 34,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  title: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 20,
    fontWeight: '600',
  },
  kicker: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
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
  field: {
    gap: 7,
  },
  label: {
    color: v.textSoft,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0E0E16',
    borderColor: v.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    color: v.text,
    fontFamily: operatorFonts.sans,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  counter: {
    alignSelf: 'flex-end',
    color: v.muted,
    fontFamily: operatorFonts.monoMedium,
    fontSize: 10,
    fontWeight: '500',
  },
  error: {
    color: v.danger,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  frequency: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: v.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
  },
  frequencySelected: {
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
  },
  frequencyText: {
    color: v.textSoft,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  frequencyTextSelected: {
    color: v.purpleStrong,
  },
  disabled: {
    opacity: 0.42,
  },
  note: {
    color: v.muted,
    fontFamily: operatorFonts.sans,
    fontSize: 11,
    lineHeight: 17,
  },
  saveButton: {
    backgroundColor: v.purple,
    minHeight: 44,
  },
  buttonLabel: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
});
