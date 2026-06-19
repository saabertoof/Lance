import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui';
import { theme } from '@/constants/theme';
import type {
  ConnectionRequestRecord,
  ConversationSummary,
  OpportunityResponseRecord,
  ProfileSummary,
} from '@/types/communication';

export function ProfileAvatar({
  profile,
  size = 48,
}: {
  profile: ProfileSummary;
  size?: number;
}) {
  const initials =
    profile.displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'L';

  return (
    <View
      style={[
        styles.avatar,
        { borderRadius: size / 2, height: size, width: size },
      ]}>
      {profile.avatarUrl ? (
        <Image contentFit="cover" source={profile.avatarUrl} style={styles.image} />
      ) : (
        <Text style={styles.initials}>{initials}</Text>
      )}
    </View>
  );
}

export function ChatRow({
  chat,
  onPress,
}: {
  chat: ConversationSummary;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ProfileAvatar profile={chat.otherProfile} />
      <View style={styles.copy}>
        <View style={styles.rowTitle}>
          <Text numberOfLines={1} style={styles.name}>
            {chat.otherProfile.displayName}
          </Text>
          <Text style={styles.time}>{formatRelativeTime(chat.lastMessageAt)}</Text>
        </View>
        {chat.type === 'opportunity' && chat.opportunityTitle ? (
          <Text numberOfLines={1} style={styles.context}>
            {chat.opportunityTitle}
          </Text>
        ) : null}
        <Text
          numberOfLines={1}
          style={[styles.preview, chat.unreadCount > 0 && styles.unreadPreview]}>
          {chat.lastMessageBody || 'Conversation started'}
        </Text>
        {chat.status !== 'active' ? (
          <Text style={styles.closed}>
            {chat.status === 'blocked' ? 'Messaging unavailable' : 'Read-only'}
          </Text>
        ) : null}
      </View>
      {chat.unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{Math.min(chat.unreadCount, 99)}</Text>
        </View>
      ) : (
        <Ionicons color={theme.colors.muted} name="chevron-forward" size={19} />
      )}
    </Pressable>
  );
}

export function ConnectionRequestRow({
  direction,
  onPress,
  request,
}: {
  direction: 'received' | 'sent';
  onPress: () => void;
  request: ConnectionRequestRecord;
}) {
  const profile = direction === 'received' ? request.requester : request.recipient;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ProfileAvatar profile={profile} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {profile.displayName}
        </Text>
        <Text numberOfLines={1} style={styles.preview}>
          {request.note || connectReasonLabel(request.reason)}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(request.createdAt)}</Text>
      </View>
      <Chip
        accent={request.status === 'pending'}
        label={request.status === 'pending' ? 'Pending' : sentenceCase(request.status)}
      />
    </Pressable>
  );
}

export function OpportunityResponseRow({
  direction,
  onPress,
  response,
}: {
  direction: 'received' | 'sent';
  onPress: () => void;
  response: OpportunityResponseRecord;
}) {
  const isNew = direction === 'received' && !response.ownerViewedAt;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ProfileAvatar profile={response.responder} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {direction === 'received'
            ? response.responder.displayName
            : response.opportunityTitle}
        </Text>
        <Text numberOfLines={1} style={styles.context}>
          {direction === 'received' ? response.opportunityTitle : response.posterName}
        </Text>
        <Text numberOfLines={1} style={styles.preview}>
          {response.note || 'Opportunity response'}
        </Text>
      </View>
      <Chip
        accent={isNew || response.status === 'submitted'}
        label={isNew ? 'New' : responseStatusLabel(response.status)}
      />
    </Pressable>
  );
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function sentenceCase(value: string) {
  return value.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

function connectReasonLabel(value: string) {
  return sentenceCase(value);
}

function responseStatusLabel(value: OpportunityResponseRecord['status']) {
  if (value === 'in_discussion') return 'In discussion';
  if (value === 'submitted') return 'Applied';
  return sentenceCase(value);
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 78,
    paddingVertical: theme.spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  initials: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  name: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  context: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.tiny,
    fontWeight: '700',
  },
  preview: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  unreadPreview: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  time: {
    color: theme.colors.mutedLight,
    fontSize: theme.typography.tiny,
  },
  closed: {
    color: theme.colors.danger,
    fontSize: theme.typography.tiny,
    fontWeight: '700',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    minHeight: 22,
    minWidth: 22,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.65,
  },
});
