import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type FormSectionProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export function FormSection({ children, description, title }: FormSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.caption,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  description: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 19,
  },
});
