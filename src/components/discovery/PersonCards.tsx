import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SaveButton } from '@/components/saved';
import { Chip } from '@/components/ui';
import { theme } from '@/constants/theme';
import {
  availabilityOptions,
  experienceOptions,
  getOptionLabel,
  opportunityInterestOptions,
  remotePreferenceOptions,
  type PublicProfile,
} from '@/types/profile';

type PersonCardProps = {
  discover?: boolean;
  isSaved: boolean;
  onPress: () => void;
  onSave: () => void;
  profile: PublicProfile;
};

export function PersonCard({
  discover,
  isSaved,
  onPress,
  onSave,
  profile,
}: PersonCardProps) {
  const initials =
    profile.displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'L';

  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.avatar, discover && styles.discoverAvatar]}>
          {profile.avatarUrl ? (
            <Image contentFit="cover" source={profile.avatarUrl} style={styles.image} />
          ) : (
            <Text style={[styles.initials, discover && styles.discoverInitials]}>
              {initials}
            </Text>
          )}
        </View>
        <View style={styles.identity}>
          <Text numberOfLines={1} style={discover ? styles.discoverName : styles.name}>
            {profile.displayName}
          </Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
        {discover ? (
          <Ionicons
            color={isSaved ? theme.colors.accentStrong : theme.colors.muted}
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={24}
          />
        ) : (
          <SaveButton
            compact
            isSaved={isSaved}
            onPress={(event) => {
              event?.stopPropagation();
              onSave();
            }}
          />
        )}
      </View>

      <View style={styles.copy}>
        <Text style={styles.role}>{profile.primaryRole}</Text>
        <Text numberOfLines={discover ? 4 : 2} style={styles.headline}>
          {profile.headline}
        </Text>
        <Text style={styles.location}>
          {[profile.city, getOptionLabel(remotePreferenceOptions, profile.remotePreference)]
            .filter(Boolean)
            .join(' | ')}
        </Text>
      </View>

      <View style={styles.chips}>
        {profile.skills.slice(0, discover ? 5 : 3).map((skill) => (
          <Chip key={skill.toLowerCase()} label={skill} />
        ))}
      </View>

      {discover ? (
        <>
          <View style={styles.details}>
            <Detail
              label="Experience"
              value={getOptionLabel(experienceOptions, profile.experienceLevel)}
            />
            <Detail
              label="Availability"
              value={getOptionLabel(availabilityOptions, profile.availability)}
            />
          </View>
          <View style={styles.interests}>
            {profile.opportunityInterests.slice(0, 3).map((interest) => (
              <Chip
                accent
                key={interest}
                label={getOptionLabel(opportunityInterestOptions, interest)}
              />
            ))}
          </View>
        </>
      ) : null}
    </>
  );

  if (discover) {
    return <View style={[styles.card, styles.discoverCard]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  discoverCard: {
    gap: theme.spacing.lg,
    minHeight: 430,
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  discoverAvatar: {
    borderRadius: 42,
    height: 84,
    width: 84,
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
  discoverInitials: {
    fontSize: theme.typography.heading,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  discoverName: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  username: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  copy: {
    gap: theme.spacing.sm,
  },
  role: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  headline: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    fontWeight: '600',
    lineHeight: 24,
  },
  location: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  details: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  detail: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  detailValue: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '800',
    textAlign: 'right',
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
});
