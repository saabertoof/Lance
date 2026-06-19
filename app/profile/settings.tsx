import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { routes } from '@/lib/routes';

export default function ProfileSettingsScreen() {
  const { signOut } = useAuth();

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Profile</Text>
        <SettingsRow
          icon="create-outline"
          label="Edit profile"
          onPress={() => router.push(routes.editProfile)}
        />
        <SettingsRow
          icon="chatbubbles-outline"
          label="Communication preferences"
          onPress={() => router.push(routes.communicationSettings)}
        />
      </View>

      <View style={styles.note}>
        <Ionicons
          color={theme.colors.accentStrong}
          name="shield-checkmark-outline"
          size={21}
        />
        <Text style={styles.noteText}>
          Your private saves, applications, requests, and management tools are
          visible only to you.
        </Text>
      </View>

      <Button label="Log out" onPress={signOut} variant="secondary" />
    </Screen>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowIcon}>
        <Ionicons color={theme.colors.accentStrong} name={icon} size={20} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons color={theme.colors.muted} name="chevron-forward" size={19} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  group: {
    gap: theme.spacing.sm,
  },
  groupTitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 62,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowLabel: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  note: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  noteText: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.65,
  },
});
