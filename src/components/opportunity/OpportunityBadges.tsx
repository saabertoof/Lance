import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { needsCompensationWarning } from '@/lib/opportunity';
import type { OpportunityRecord } from '@/types/opportunity';

export function OpportunityStatusBadge({ status }: Pick<OpportunityRecord, 'status'>) {
  return (
    <View style={[styles.badge, status === 'published' && styles.live]}>
      <Text style={[styles.label, status === 'published' && styles.liveLabel]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

export function CompensationBadge({
  compensationType,
  label,
}: {
  compensationType: OpportunityRecord['compensationType'];
  label: string;
}) {
  const warning = needsCompensationWarning(compensationType);

  return (
    <View style={[styles.badge, warning ? styles.warning : styles.accent]}>
      <Text style={[styles.label, warning ? styles.warningLabel : styles.accentLabel]}>
        {label}
      </Text>
    </View>
  );
}

export function WorkArrangementBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.chip,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  accent: {
    backgroundColor: theme.colors.accentSoft,
  },
  warning: {
    backgroundColor: '#FFF5E8',
  },
  live: {
    backgroundColor: '#EAF8EF',
  },
  label: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.tiny,
    fontWeight: '800',
  },
  accentLabel: {
    color: theme.colors.accentStrong,
  },
  warningLabel: {
    color: '#9A5B00',
  },
  liveLabel: {
    color: theme.colors.success,
  },
});
