import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  CompactPageHeader,
  EliteCard,
  TextField,
  Screen,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useFeedback } from '@/context/FeedbackContext';
import {
  betaFeedbackTypeOptions,
  formatBetaFeedbackError,
  submitBetaFeedback,
  type BetaFeedbackType,
} from '@/lib/betaFeedback';

type IconName = keyof typeof Ionicons.glyphMap;

export default function BetaFeedbackScreen() {
  const { showSuccess } = useFeedback();
  const [type, setType] = useState<BetaFeedbackType>('bug');
  const [area, setArea] = useState('');
  const [message, setMessage] = useState('');
  const [contactAllowed, setContactAllowed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitBetaFeedback({
        area,
        contactAllowed,
        message,
        type,
      });
      showSuccess('Feedback sent. Thank you.');
      router.back();
    } catch (submitError) {
      setError(formatBetaFeedbackError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen compact scroll contentStyle={styles.screen}>
      <CompactPageHeader
        eyebrow="Private beta"
        subtitle="Tell us what broke, felt confusing, or should feel sharper."
        title="Send feedback"
      />

      <EliteCard compact style={styles.contextCard} tone="accent">
        <View style={styles.contextTop}>
          <View style={styles.contextIcon}>
            <Ionicons color={theme.colors.accentStrong} name="flask-outline" size={18} />
          </View>
          <View style={styles.contextCopy}>
            <Text style={styles.contextTitle}>Beta signal, not a public report</Text>
            <Text style={styles.contextBody}>
              This goes privately to the Lance team. Use safety menus for abuse,
              scams, or blocking another user.
            </Text>
          </View>
        </View>
      </EliteCard>

      <View style={styles.section}>
        <Text style={styles.label}>What kind of feedback?</Text>
        <View style={styles.typeGrid}>
          {betaFeedbackTypeOptions.map((option) => (
            <TypeOption
              active={type === option.value}
              icon={option.icon as IconName}
              key={option.value}
              label={option.label}
              onPress={() => setType(option.value)}
            />
          ))}
        </View>
      </View>

      <TextField
        label="Area"
        maxLength={80}
        onChangeText={setArea}
        placeholder="Create, messages, opportunity link, profile..."
        value={area}
      />

      <TextField
        label="What happened?"
        maxLength={1500}
        multiline
        onChangeText={setMessage}
        placeholder="Short but useful. What did you expect, what happened, and what device were you on?"
        style={styles.messageInput}
        textAlignVertical="top"
        value={message}
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: contactAllowed }}
        onPress={() => setContactAllowed((current) => !current)}
        style={({ pressed }) => [
          styles.contactRow,
          pressed && styles.pressed,
        ]}>
        <View style={[styles.checkbox, contactAllowed && styles.checkboxActive]}>
          {contactAllowed ? (
            <Ionicons color={theme.colors.white} name="checkmark" size={15} />
          ) : null}
        </View>
        <View style={styles.contactCopy}>
          <Text style={styles.contactTitle}>Okay to follow up</Text>
          <Text style={styles.contactBody}>
            Lets the team use your Lance account to ask for context. Your message
            still stays private.
          </Text>
        </View>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button label="Cancel" onPress={() => router.back()} variant="ghost" />
        <Button
          disabled={message.trim().length < 10}
          label="Send feedback"
          loading={isSubmitting}
          onPress={() => void submit()}
          style={styles.primaryAction}
        />
      </View>
    </Screen>
  );
}

function TypeOption({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.typeOption,
        active && styles.typeOptionActive,
        pressed && styles.pressed,
      ]}>
      <Ionicons
        color={active ? theme.colors.accentStrong : theme.colors.textSoft}
        name={icon}
        size={17}
      />
      <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.lg,
    paddingBottom: 120,
    paddingHorizontal: 16,
  },
  contextCard: {
    gap: theme.spacing.sm,
  },
  contextTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  contextIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderColor: 'rgba(167,139,250,0.24)',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  contextCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  contextTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
  },
  contextBody: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption,
    lineHeight: 17,
  },
  section: {
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textSoft,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typeOption: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
  },
  typeOptionActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: 'rgba(167,139,250,0.42)',
  },
  typeLabel: {
    color: theme.colors.textSoft,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.caption,
  },
  typeLabelActive: {
    color: theme.colors.accentStrong,
  },
  messageInput: {
    minHeight: 170,
    paddingTop: theme.spacing.md,
  },
  contactRow: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    marginTop: 1,
    width: 24,
  },
  checkboxActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  contactCopy: {
    flex: 1,
    gap: 3,
  },
  contactTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
  },
  contactBody: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    lineHeight: 17,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.caption,
    lineHeight: 17,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryAction: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
