import { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  RefreshControl,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import {
  useAdaptiveTabBarScroll,
  useOptionalAdaptiveTabBar,
} from '@/context/AdaptiveTabBarContext';

type ScreenProps = PropsWithChildren<{
  bottomInset?: boolean;
  centered?: boolean;
  compact?: boolean;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onRefresh?: () => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  refreshing?: boolean;
  topInset?: boolean;
}>;

export function Screen({
  bottomInset = true,
  centered,
  children,
  compact,
  contentStyle,
  onRefresh,
  onScroll,
  refreshing,
  scroll,
  style,
  topInset = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const adaptiveTabBar = useOptionalAdaptiveTabBar();
  const adaptiveScroll = useAdaptiveTabBarScroll();
  const topPadding = topInset
    ? insets.top + (compact ? theme.density.screenTop : theme.spacing.xl)
    : 0;
  const bottomPadding = bottomInset
    ? (adaptiveTabBar?.contentBottomInset ??
      insets.bottom + (compact ? theme.spacing.lg : theme.spacing.xl))
    : 0;
  const content = (
    <View
      style={[
        styles.content,
        centered && styles.centered,
        contentStyle,
        { paddingTop: topPadding },
        !scroll && { paddingBottom: bottomPadding },
      ]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.canvas, style]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              adaptiveScroll.onScroll(event);
              onScroll?.(event);
            }}
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
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomPadding },
            ]}>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
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
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
