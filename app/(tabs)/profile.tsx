import { Image, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { signOut, user } = useAuth();

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <Card style={styles.card}>
        <View style={styles.brandRow}>
          <Image
            accessibilityLabel="Lance icon"
            resizeMode="contain"
            source={require('../../assets/images/lance_icon_transparent.png')}
            style={styles.icon}
          />
          <View style={styles.copy}>
            <Text style={styles.name}>Lance account</Text>
            <Text style={styles.email}>{user?.email ?? 'Signed in user'}</Text>
          </View>
        </View>
        <Chip accent label="Phase 1" />
        <Text style={styles.body}>
          Profile editing begins in Phase 2. This screen confirms protected tabs and logout are wired.
        </Text>
        <Button label="Log out" onPress={signOut} variant="secondary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
    marginBottom: theme.spacing.xl,
  },
  card: {
    gap: theme.spacing.lg,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  icon: {
    height: 56,
    width: 56,
  },
  copy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
  },
  email: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  body: {
    color: theme.colors.muted,
    fontSize: theme.typography.body,
    lineHeight: 23,
  },
});
