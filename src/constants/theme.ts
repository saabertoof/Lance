import type { Theme } from '@react-navigation/native';

import { fontFamilies } from './fonts';
import { operatorVisual } from './operatorTheme';

const palette = {
  white: operatorVisual.white,
  canvas: operatorVisual.background,
  backgroundRaised: operatorVisual.backgroundRaised,
  surface: operatorVisual.surface,
  surfaceStrong: operatorVisual.surfaceStrong,
  surfaceSoft: operatorVisual.surfaceSoft,
  ink: operatorVisual.text,
  inkSoft: operatorVisual.textSoft,
  muted: operatorVisual.muted,
  mutedDim: operatorVisual.mutedDim,
  border: operatorVisual.border,
  borderStrong: operatorVisual.borderStrong,
  purple: operatorVisual.purple,
  purpleStrong: operatorVisual.purpleStrong,
  purpleSoft: operatorVisual.purpleSoft,
  purpleWash: operatorVisual.purpleWash,
  green: operatorVisual.green,
  red: operatorVisual.danger,
};

export const theme = {
  colors: {
    canvas: palette.canvas,
    background: palette.canvas,
    surface: palette.surface,
    surfaceMuted: palette.surfaceStrong,
    text: palette.ink,
    textSoft: palette.inkSoft,
    muted: palette.muted,
    mutedLight: palette.mutedDim,
    border: palette.border,
    chip: palette.surfaceSoft,
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
    title: 26,
    heading: 21,
    subheading: 17,
    body: 15,
    small: 13,
    tiny: 11,
    heroIdentity: 28,
    screenHeading: 22,
    sectionHeading: 16,
    cardTitle: 16,
    bodySmall: 13,
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
    md: 14,
    lg: 18,
    xl: 22,
    pill: 999,
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 0,
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
  dark: true,
  colors: {
    primary: theme.colors.accent,
    background: theme.colors.background,
    card: palette.backgroundRaised,
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
    text: theme.colors.text,
    background: theme.colors.background,
    tint: theme.colors.accent,
    icon: theme.colors.mutedLight,
    tabIconDefault: theme.colors.mutedLight,
    tabIconSelected: theme.colors.accent,
  },
};
