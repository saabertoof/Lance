import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { Geist_800ExtraBold } from '@expo-google-fonts/geist/800ExtraBold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';

export const fontFamilies = {
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  sansSemiBold: 'Geist_600SemiBold',
  sansBold: 'Geist_700Bold',
  sansExtraBold: 'Geist_800ExtraBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoSemiBold: 'JetBrainsMono_600SemiBold',
} as const;

export const lanceFonts = {
  [fontFamilies.sans]: Geist_400Regular,
  [fontFamilies.sansMedium]: Geist_500Medium,
  [fontFamilies.sansSemiBold]: Geist_600SemiBold,
  [fontFamilies.sansBold]: Geist_700Bold,
  [fontFamilies.sansExtraBold]: Geist_800ExtraBold,
  [fontFamilies.mono]: JetBrainsMono_400Regular,
  [fontFamilies.monoMedium]: JetBrainsMono_500Medium,
  [fontFamilies.monoSemiBold]: JetBrainsMono_600SemiBold,
};
