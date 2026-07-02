import type { Theme } from '@react-navigation/native';

import { fontFamilies } from './fonts';

const palette = {
  white: '#FFFFFF',
  canvas: '#F7F7FA',
  ink: '#080A12',
  inkSoft: '#232633',
  gray900: '#171923',
  gray700: '#4B5161',
  gray600: '#626879',
  gray500: '#7A8091',
  gray200: '#E2E4EA',
  gray100: '#F0F1F5',
  gray50: '#F4F5F8',
  purple: '#7C5CFF',
  purpleStrong: '#6843F4',
  purpleSoft: '#F0ECFF',
  green: '#24C064',
  red: '#D83A3A',
};

export const theme = {
  colors: {
    canvas: palette.canvas,
    background: palette.canvas,
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
    family: fontFamilies.sans,
    familyMedium: fontFamilies.sansMedium,
    familySemiBold: fontFamilies.sansSemiBold,
    familyBold: fontFamilies.sansBold,
    familyExtraBold: fontFamilies.sansExtraBold,
    familyMono: fontFamilies.mono,
    familyMonoMedium: fontFamilies.monoMedium,
    familyMonoSemiBold: fontFamilies.monoSemiBold,
    display: 34,
    title: 28,
    heading: 22,
    subheading: 18,
    body: 16,
    small: 14,
    tiny: 12,
    heroIdentity: 28,
    screenHeading: 24,
    sectionHeading: 18,
    cardTitle: 16,
    bodySmall: 14,
    label: 12,
    caption: 11,
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
    lg: 16,
    xl: 20,
    pill: 999,
  },
  shadows: {
    card: {
      shadowColor: palette.ink,
      shadowOpacity: 0.05,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
  },
  density: {
    hairlineGap: 2,
    compactGap: 6,
    controlGap: 8,
    contentGap: 12,
    sectionGap: 24,
    screenTop: 8,
  },
  icons: {
    small: 16,
    standard: 20,
    prominent: 24,
  },
  controls: {
    compact: 40,
    standard: 46,
    large: 52,
  },
  layout: {
    screenPadding: 20,
    inputHeight: 48,
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
      fontFamily: fontFamilies.sans,
      fontWeight: '400',
    },
    medium: {
      fontFamily: fontFamilies.sansMedium,
      fontWeight: '500',
    },
    bold: {
      fontFamily: fontFamilies.sansBold,
      fontWeight: '700',
    },
    heavy: {
      fontFamily: fontFamilies.sansExtraBold,
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
