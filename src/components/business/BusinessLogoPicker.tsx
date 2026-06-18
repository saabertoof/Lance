import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { validateBusinessLogo } from '@/lib/business';

type BusinessLogoPickerProps = {
  imageUri: string | null;
  name: string;
  onChange: (asset: ImagePicker.ImagePickerAsset) => void;
  onError: (message: string) => void;
};

export function BusinessLogoPicker({
  imageUri,
  name,
  onChange,
  onError,
}: BusinessLogoPickerProps) {
  async function chooseLogo() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset.base64) {
        throw new Error('The selected logo could not be prepared for upload.');
      }

      validateBusinessLogo(asset.base64, asset.mimeType ?? null);
      onChange(asset);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The logo could not be selected.');
    }
  }

  const mark = name.trim().charAt(0).toUpperCase() || 'B';

  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        {imageUri ? (
          <Image contentFit="cover" source={imageUri} style={styles.image} />
        ) : (
          <Text style={styles.mark}>{mark}</Text>
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Logo</Text>
        <Text style={styles.body}>Optional. JPEG, PNG, or WebP up to 5 MB.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={chooseLogo}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Ionicons color={theme.colors.accentStrong} name="image-outline" size={18} />
          <Text style={styles.actionLabel}>{imageUri ? 'Change logo' : 'Choose logo'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    height: 84,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 84,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  mark: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.title,
    fontWeight: '900',
  },
  copy: {
    alignItems: 'flex-start',
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  body: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  action: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.minTouchTarget,
  },
  actionLabel: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.65,
  },
});
