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
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  accent: {
    backgroundColor: theme.colors.accentSoft,
  },
  warning: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.22)',
  },
  live: {
    backgroundColor: 'rgba(52,216,112,0.12)',
    borderColor: 'rgba(52,216,112,0.22)',
  },
  label: {
    color: theme.colors.textSoft,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.tiny,
  },
  accentLabel: {
    color: theme.colors.accentStrong,
  },
  warningLabel: {
    color: '#F4BE65',
  },
  liveLabel: {
    color: theme.colors.success,
  },
});
