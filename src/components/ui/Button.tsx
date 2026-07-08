import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { theme } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  labelStyle?: StyleProp<TextStyle>;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
};

export function Button({
  accessibilityLabel,
  disabled,
  label,
  labelStyle,
  loading,
  onPress,
  style,
  variant = 'primary',
}: ButtonProps) {
  const isInactive = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{
        busy: Boolean(loading),
        disabled: Boolean(isInactive),
      }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isInactive && styles.pressed,
        isInactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? theme.colors.white : theme.colors.accentStrong}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`], labelStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.controls.standard,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  primary: {
    backgroundColor: theme.colors.accent,
    borderColor: 'rgba(167,139,250,0.55)',
    borderWidth: 1,
  },
  secondary: {
    backgroundColor: theme.colors.chip,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: 'rgba(255,107,107,0.09)',
    borderColor: 'rgba(255,107,107,0.22)',
    borderWidth: 1,
  },
  label: {
    fontFamily: theme.typography.familySemiBold,
    fontSize: 14,
  },
  primaryLabel: {
    color: theme.colors.white,
  },
  secondaryLabel: {
    color: theme.colors.text,
  },
  ghostLabel: {
    color: theme.colors.textSoft,
  },
  dangerLabel: {
    color: theme.colors.danger,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
