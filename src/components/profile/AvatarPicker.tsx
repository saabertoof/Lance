import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { validateAvatarAsset } from '@/lib/profile';

type AvatarPickerProps = {
  displayName: string;
  imageUri: string | null;
  onChange: (asset: ImagePicker.ImagePickerAsset) => void;
  onError: (message: string) => void;
};

export function AvatarPicker({
  displayName,
  imageUri,
  onChange,
  onError,
}: AvatarPickerProps) {
  async function selectImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      validateAvatarAsset(asset);
      onChange(asset);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The image could not be selected.');
    }
  }

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'L';

  return (
    <View style={styles.wrapper}>
      <View style={styles.avatar}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.initials}>{initials}</Text>
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Profile photo</Text>
        <Text style={styles.body}>Optional. JPEG, PNG, or WebP up to 5 MB.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={selectImage}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Ionicons color={theme.colors.accentStrong} name="image-outline" size={18} />
          <Text style={styles.actionLabel}>{imageUri ? 'Change photo' : 'Choose photo'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.border,
    borderRadius: 42,
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
  initials: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.heading,
  },
  copy: {
    alignItems: 'flex-start',
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
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
    fontFamily: theme.typography.familySemiBold,
  },
  pressed: {
    opacity: 0.65,
  },
});
