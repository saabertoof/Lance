import { Image, StyleSheet, Text, View } from 'react-native';

import { Card, Chip } from '@/components/ui';
import { theme } from '@/constants/theme';
import {
  availabilityOptions,
  getOptionLabel,
  opportunityInterestOptions,
  ProfileDraft,
} from '@/types/profile';

type ProfilePreviewCardProps = {
  profile: ProfileDraft;
};

export function ProfilePreviewCard({ profile }: ProfilePreviewCardProps) {
  const initials =
    profile.displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'L';
  const lookingFor = profile.opportunityInterests
    .slice(0, 3)
    .map((interest) => getOptionLabel(opportunityInterestOptions, interest));

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {profile.localAvatarUri || profile.avatarUrl ? (
            <Image
              source={{ uri: profile.localAvatarUri ?? profile.avatarUrl ?? undefined }}
              style={styles.image}
            />
          ) : (
            <Text style={styles.initials}>{initials}</Text>
          )}
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{profile.displayName || 'Your name'}</Text>
          <Text style={styles.meta}>
            {[profile.primaryRole, profile.city].filter(Boolean).join(' · ') ||
              'Role · Location'}
          </Text>
        </View>
      </View>

      <Text style={styles.headline}>{profile.headline || 'Your short headline'}</Text>

      <View style={styles.chips}>
        {profile.skills.slice(0, 4).map((skill) => (
          <Chip key={skill.toLowerCase()} label={skill} />
        ))}
      </View>

      <View style={styles.detail}>
        <Text style={styles.detailLabel}>Availability</Text>
        <Text style={styles.detailValue}>
          {getOptionLabel(availabilityOptions, profile.availability)}
        </Text>
      </View>

      <View style={styles.detail}>
        <Text style={styles.detailLabel}>Looking for</Text>
        <Text style={styles.detailValue}>{lookingFor.join(', ') || 'Not selected yet'}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 68,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  initials: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  headline: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    fontWeight: '600',
    lineHeight: 24,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  detail: {
    gap: theme.spacing.xs,
  },
  detailLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
});
