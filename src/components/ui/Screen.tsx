import { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  centered?: boolean;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onRefresh?: () => void;
  refreshing?: boolean;
}>;

export function Screen({
  centered,
  children,
  contentStyle,
  onRefresh,
  refreshing,
  scroll,
  style,
}: ScreenProps) {
  const content = (
    <View style={[styles.content, centered && styles.centered, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  onRefresh={onRefresh}
                  refreshing={Boolean(refreshing)}
                  tintColor={theme.colors.accent}
                />
              ) : undefined
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.xl,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
