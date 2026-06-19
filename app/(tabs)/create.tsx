import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { routes } from '@/lib/routes';

export default function CreateScreen() {
  return (
    <Screen compact scroll contentStyle={styles.screen}>
      <View style={styles.intro}>
        <Text style={styles.sectionLabel}>What are you creating?</Text>
        <Text style={styles.subtitle}>
          Choose a job to publish or a business identity to manage.
        </Text>
      </View>

      <ActionCard
        body="Post personally or as a business. Draft or publish when ready."
        icon="briefcase-outline"
        onPress={() => router.push(routes.newOpportunity())}
        title="Post an opportunity"
      />
      <ActionCard
        body="Create a home for a startup, agency, project, or community."
        icon="business-outline"
        onPress={() => router.push(routes.newBusiness)}
        title="Create a business or project"
      />

      <View style={styles.secondary}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(routes.opportunities)}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
          <Text style={styles.secondaryLabel}>Manage my opportunities</Text>
          <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(routes.businesses)}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
          <Text style={styles.secondaryLabel}>Manage my businesses</Text>
          <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
        </Pressable>
      </View>
    </Screen>
  );
}

function ActionCard({
  body,
  icon,
  onPress,
  title,
}: {
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <View style={styles.icon}>
          <Ionicons color={theme.colors.accentStrong} name={icon} size={25} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardBody}>{body}</Text>
        </View>
        <Ionicons color={theme.colors.muted} name="arrow-forward" size={21} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.density.contentGap,
  },
  intro: {
    gap: theme.spacing.xs,
  },
  sectionLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.sectionHeading,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.bodySmall,
    lineHeight: 20,
  },
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cardCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  cardBody: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 19,
  },
  secondary: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
  },
  secondaryAction: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: theme.controls.standard,
  },
  secondaryLabel: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
