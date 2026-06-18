import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type FeedbackTone = 'success' | 'warning';

type FeedbackMessage = {
  id: number;
  message: string;
  tone: FeedbackTone;
};

type FeedbackContextValue = {
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const show = useCallback((message: string, tone: FeedbackTone) => {
    setFeedback({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = setTimeout(() => setFeedback(null), 4200);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const value = useMemo(
    () => ({
      showSuccess: (message: string) => show(message, 'success'),
      showWarning: (message: string) => show(message, 'warning'),
    }),
    [show],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {feedback ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.banner,
            feedback.tone === 'warning' ? styles.warningBanner : styles.successBanner,
          ]}>
          <Ionicons
            color={feedback.tone === 'warning' ? '#7D4B00' : theme.colors.success}
            name={feedback.tone === 'warning' ? 'warning-outline' : 'checkmark-circle'}
            size={21}
          />
          <Text
            style={[
              styles.message,
              feedback.tone === 'warning' ? styles.warningText : styles.successText,
            ]}>
            {feedback.message}
          </Text>
        </View>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error('useFeedback must be used inside FeedbackProvider.');
  }

  return context;
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    left: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    position: 'absolute',
    right: theme.spacing.lg,
    top: 54,
    zIndex: 1000,
    ...theme.shadows.card,
  },
  successBanner: {
    backgroundColor: '#EFFBF3',
    borderColor: '#CDEFD9',
  },
  warningBanner: {
    backgroundColor: '#FFF5E8',
    borderColor: '#F2D7AA',
  },
  message: {
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '700',
    lineHeight: 20,
  },
  successText: {
    color: '#15733A',
  },
  warningText: {
    color: '#7D4B00',
  },
});
