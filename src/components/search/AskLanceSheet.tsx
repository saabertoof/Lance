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
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
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
    'Paid entry-level React opportunities',
    'Remote video editing opportunities',
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
              color={v.purpleStrong}
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
            <Ionicons color={v.text} name="close" size={24} />
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
              Describe who, what opportunity, or what business you&apos;re looking for.
            </Text>
            <TextInput
              accessibilityLabel="Ask Lance search request"
              autoFocus
              maxLength={500}
              multiline
              onChangeText={setQuery}
              placeholder="Example: Remote CapCut editor with crypto experience"
              placeholderTextColor={v.muted}
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
                placeholderTextColor={v.muted}
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
                    color={v.muted}
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
            from real Lance profiles, opportunities, and businesses.
          </Text>
          <Button
            disabled={Boolean(clarificationQuestion && !clarification.trim())}
            label={clarificationQuestion ? 'Apply answer' : 'Create filters'}
            labelStyle={styles.buttonLabel}
            loading={loading}
            onPress={() => void submit()}
            style={styles.button}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: v.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: v.background,
    borderBottomColor: v.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderWidth: 1,
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
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: theme.typography.subheading,
    fontWeight: '600',
  },
  subtitle: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
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
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  input: {
    backgroundColor: '#0E0E16',
    borderColor: v.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    color: v.text,
    fontFamily: operatorFonts.sans,
    fontSize: 14,
    minHeight: 128,
    padding: theme.spacing.lg,
  },
  counter: {
    alignSelf: 'flex-end',
    color: v.muted,
    fontFamily: operatorFonts.monoMedium,
    fontSize: 10,
    fontWeight: '500',
  },
  examples: {
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  example: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  exampleText: {
    color: v.text,
    flex: 1,
    fontFamily: operatorFonts.sansMedium,
    fontSize: theme.typography.small,
    fontWeight: '500',
  },
  clarification: {
    backgroundColor: v.purpleWash,
    borderColor: v.borderPurple,
    borderRadius: 18,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  question: {
    color: v.text,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  },
  answer: {
    backgroundColor: '#0E0E16',
    borderColor: v.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    color: v.text,
    fontFamily: operatorFonts.sans,
    fontSize: 14,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: theme.spacing.md,
  },
  error: {
    color: v.danger,
    fontFamily: operatorFonts.sans,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  privacy: {
    color: v.muted,
    fontFamily: operatorFonts.sans,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
  button: {
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
