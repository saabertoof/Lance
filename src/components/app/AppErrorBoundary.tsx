import { Ionicons } from '@expo/vector-icons';
import type { ErrorInfo, PropsWithChildren } from 'react';
import { Component } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { captureClientError } from '@/lib/clientMonitoring';

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureClientError(
      new Error(`${error.message} ${info.componentStack ?? ''}`.trim(), {
        cause: error,
      }),
      'root_render',
    );
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.panel}>
          <View style={styles.icon}>
            <Ionicons
              color={theme.colors.accentStrong}
              name="refresh-outline"
              size={22}
            />
          </View>
          <Text style={styles.eyebrow}>Recovery mode</Text>
          <Text style={styles.title}>Lance hit an unexpected snag.</Text>
          <Text style={styles.body}>
            Your account data is still safe. Try reopening this screen before
            restarting the app.
          </Text>
          <Pressable
            accessibilityLabel="Try loading Lance again"
            accessibilityRole="button"
            onPress={this.retry}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.buttonLabel}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: theme.layout.screenPadding,
  },
  panel: {
    alignItems: 'flex-start',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    maxWidth: 420,
    padding: theme.spacing.xl,
    width: '100%',
  },
  icon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 42,
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    width: 42,
  },
  eyebrow: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.tiny,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.heading,
  },
  body: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    minHeight: theme.layout.minTouchTarget,
  },
  buttonLabel: {
    color: theme.colors.white,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
  },
  pressed: {
    opacity: 0.72,
  },
});
