import { Image, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { theme } from '@/constants/theme';

type AuthFormShellProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  subtitle: string;
  title: string;
};

export function AuthFormShell({ children, footer, subtitle, title }: AuthFormShellProps) {
  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.brand}>
        <Image
          accessibilityLabel="Lance"
          resizeMode="contain"
          source={require('../../../assets/images/lance_wordmark_transparent.png')}
          style={styles.wordmark}
        />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.form}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
    gap: theme.spacing.xl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  wordmark: {
    width: 170,
    height: 54,
  },
  copy: {
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 23,
    textAlign: 'center',
  },
  form: {
    gap: theme.spacing.lg,
  },
  footer: {
    alignItems: 'center',
  },
});
