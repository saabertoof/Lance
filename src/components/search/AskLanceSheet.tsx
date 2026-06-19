import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { theme } from '@/constants/theme';
import { parseAskLance } from '@/lib/searchPhase6';
import type { SearchMode } from '@/types/discovery';
import type { SearchPlanV1 } from '../../../supabase/functions/_shared/search-plan';

const examples: Record<SearchMode, string[]> = {
  people: [
    'Remote CapCut editor with crypto experience',
    'Social media managers in Chicago',
    'Cofounders with fundraising experience',
  ],
  opportunities: [
    'Paid entry-level React jobs',
    'Remote video editing jobs',
    'Marketing internships',
  ],
  businesses: [
    'Small businesses hiring sales help',
    'Creator businesses in Chicago',
    'Agencies needing video editors',
  ],
};

export function AskLanceSheet({
  mode,
  onApply,
  onClose,
  visible,
}: {
  mode: SearchMode;
  onApply: (plan: SearchPlanV1, originalQuery: string) => void;
  onClose: () => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [clarification, setClarification] = useState('');
  const [clarificationQuestion, setClarificationQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const activeExamples = useMemo(() => examples[mode], [mode]);

  useEffect(() => {
    if (!visible) {
      setClarification('');
      setClarificationQuestion('');
      setError(null);
      setLoading(false);
    }
  }, [visible]);

  async function submit() {
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Describe what you are looking for.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await parseAskLance(trimmed, clarification);
      if (response.plan.needs_clarification && !clarificationQuestion) {
        setClarificationQuestion(
          response.plan.clarification_question ||
            'What matters most in this search?',
        );
        return;
      }
      onApply(response.plan, trimmed);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Ask Lance is temporarily unavailable.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.page}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.mark}>
            <Ionicons
              color={theme.colors.accentStrong}
              name="sparkles"
              size={20}
            />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Ask Lance</Text>
            <Text style={styles.subtitle}>
              Turn a request into editable search filters.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close Ask Lance"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.close}>
            <Ionicons color={theme.colors.text} name="close" size={24} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.promptBlock}>
            <Text style={styles.prompt}>
              Describe who, what job, or what business you&apos;re looking for.
            </Text>
            <TextInput
              accessibilityLabel="Ask Lance search request"
              autoFocus
              maxLength={500}
              multiline
              onChangeText={setQuery}
              placeholder="Example: Remote CapCut editor with crypto experience"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
              textAlignVertical="top"
              value={query}
            />
            <Text style={styles.counter}>{query.length}/500</Text>
          </View>

          {clarificationQuestion ? (
            <View accessibilityLiveRegion="polite" style={styles.clarification}>
              <Text style={styles.sectionLabel}>One quick detail</Text>
              <Text style={styles.question}>{clarificationQuestion}</Text>
              <TextInput
                accessibilityLabel="Clarification answer"
                maxLength={300}
                onChangeText={setClarification}
                placeholder="Your answer"
                placeholderTextColor={theme.colors.mutedLight}
                style={styles.answer}
                value={clarification}
              />
            </View>
          ) : (
            <View style={styles.examples}>
              <Text style={styles.sectionLabel}>Try an example</Text>
              {activeExamples.map((example) => (
                <Pressable
                  accessibilityLabel={`Use example: ${example}`}
                  accessibilityRole="button"
                  key={example}
                  onPress={() => setQuery(example)}
                  style={({ pressed }) => [
                    styles.example,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={styles.exampleText}>{example}</Text>
                  <Ionicons
                    color={theme.colors.muted}
                    name="arrow-up-outline"
                    size={17}
                  />
                </Pressable>
              ))}
            </View>
          )}

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Text style={styles.privacy}>
            Ask Lance turns your request into search filters. Results come
            from real Lance profiles, jobs, and businesses.
          </Text>
          <Button
            disabled={Boolean(clarificationQuestion && !clarification.trim())}
            label={clarificationQuestion ? 'Apply answer' : 'Create filters'}
            loading={loading}
            onPress={() => void submit()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: theme.colors.canvas,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: theme.colors.canvas,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
  },
  close: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: {
    gap: theme.spacing.xl,
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: theme.spacing.xl,
  },
  promptBlock: {
    gap: theme.spacing.sm,
  },
  prompt: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '800',
    lineHeight: 29,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    minHeight: 128,
    padding: theme.spacing.lg,
  },
  counter: {
    alignSelf: 'flex-end',
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
  },
  examples: {
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.label,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  example: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  exampleText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '600',
  },
  clarification: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: '#D8CEFF',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  question: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '700',
    lineHeight: 22,
  },
  answer: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: theme.spacing.md,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  privacy: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
