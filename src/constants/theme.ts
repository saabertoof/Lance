import type { Theme } from '@react-navigation/native';

const palette = {
  white: '#FFFFFF',
  ink: '#080A12',
  inkSoft: '#232633',
  gray900: '#171923',
  gray700: '#4B5161',
  gray600: '#626879',
  gray500: '#7A8091',
  gray200: '#E7E8EE',
  gray100: '#F4F5F8',
  gray50: '#FAFAFC',
  purple: '#7C5CFF',
  purpleStrong: '#6843F4',
  purpleSoft: '#F0ECFF',
  green: '#24C064',
  red: '#D83A3A',
};

export const theme = {
  colors: {
    background: palette.white,
    surface: palette.white,
    surfaceMuted: palette.gray50,
    text: palette.ink,
    textSoft: palette.inkSoft,
    muted: palette.gray600,
    mutedLight: palette.gray500,
    border: palette.gray200,
    chip: palette.gray100,
    accent: palette.purple,
    accentStrong: palette.purpleStrong,
    accentSoft: palette.purpleSoft,
    success: palette.green,
    danger: palette.red,
    white: palette.white,
  },
  typography: {
    family: undefined,
    display: 34,
    title: 28,
    heading: 22,
    subheading: 18,
    body: 16,
    small: 14,
    tiny: 12,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    pill: 999,
  },
  shadows: {
    card: {
      shadowColor: palette.ink,
      shadowOpacity: 0.06,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
  },
  layout: {
    screenPadding: 24,
    inputHeight: 52,
    minTouchTarget: 44,
  },
};

export const lanceNavigationTheme: Theme = {
  dark: false,
  colors: {
    primary: theme.colors.accent,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.accent,
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '800',
    },
  },
};

export const Colors = {
  light: {
    text: theme.colors.text,
    background: theme.colors.background,
    tint: theme.colors.accent,
    icon: theme.colors.muted,
    tabIconDefault: theme.colors.muted,
    tabIconSelected: theme.colors.accent,
  },
  dark: {
    text: theme.colors.white,
    background: theme.colors.text,
    tint: theme.colors.accent,
    icon: theme.colors.mutedLight,
    tabIconDefault: theme.colors.mutedLight,
    tabIconSelected: theme.colors.accent,
  },
};
