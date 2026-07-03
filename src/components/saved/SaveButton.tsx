import { Ionicons } from '@expo/vector-icons';
import {
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { theme } from '@/constants/theme';

type SaveButtonProps = {
  compact?: boolean;
  isSaved: boolean;
  onPress: (event?: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
};

export function SaveButton({ compact, isSaved, onPress, style }: SaveButtonProps) {
  return (
    <Pressable
      accessibilityLabel={isSaved ? 'Remove from Saved' : 'Save privately'}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        isSaved && styles.saved,
        pressed && styles.pressed,
        style,
      ]}>
      <Ionicons
        color={isSaved ? theme.colors.accentStrong : theme.colors.text}
        name={isSaved ? 'bookmark' : 'bookmark-outline'}
        size={compact ? 20 : 21}
      />
      {!compact ? <Text style={[styles.label, isSaved && styles.savedLabel]}>
        {isSaved ? 'Saved' : 'Save'}
      </Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.lg,
  },
  compact: {
    height: theme.layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    width: theme.layout.minTouchTarget,
  },
  saved: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontFamily: theme.typography.familySemiBold,
  },
  savedLabel: {
    color: theme.colors.accentStrong,
  },
  pressed: {
    opacity: 0.7,
  },
});
