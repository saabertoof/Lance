import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

import { Button } from './Button';

type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyState({ actionLabel, body, onActionPress, title }: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.mark} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onActionPress ? (
        <Button label={actionLabel} onPress={onActionPress} variant="secondary" style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xxl,
  },
  mark: {
    width: 42,
    height: 7,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
    transform: [{ skewX: '-14deg' }],
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.sectionHeading,
    textAlign: 'center',
  },
  body: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 20,
    maxWidth: 310,
    textAlign: 'center',
  },
  button: {
    marginTop: theme.spacing.sm,
  },
});
