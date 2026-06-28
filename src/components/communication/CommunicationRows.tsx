import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
        <Image
          accessibilityLabel={`${profile.displayName} profile photo`}
          contentFit="cover"
          recyclingKey={profile.avatarUrl}
          source={profile.avatarUrl}
          style={styles.image}
        />
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
  const unread = chat.unreadCount > 0;
  const preview = chat.lastMessageBody
    ? `${chat.lastMessageFromMe ? 'You: ' : ''}${chat.lastMessageBody}`
    : chat.type === 'opportunity'
      ? 'Application discussion'
      : 'New connection';

  return (
    <Pressable
      accessibilityLabel={`Conversation with ${chat.otherProfile.displayName}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chatRow, pressed && styles.pressed]}>
      <ProfileAvatar profile={chat.otherProfile} size={58} />
      <View style={styles.chatCopy}>
        <View style={styles.chatTitleRow}>
          <Text
            numberOfLines={1}
            style={[styles.chatName, unread && styles.unreadText]}>
            {chat.otherProfile.displayName}
          </Text>
          <Text style={[styles.time, unread && styles.unreadTime]}>
            {formatInboxTime(chat.lastMessageAt)}
          </Text>
        </View>
        {chat.type === 'opportunity' && chat.opportunityTitle ? (
          <Text numberOfLines={1} style={styles.opportunityContext}>
            {chat.businessName
              ? `${chat.businessName} | ${chat.opportunityTitle}`
              : chat.opportunityTitle}
          </Text>
        ) : null}
        <Text
          numberOfLines={1}
          style={[styles.preview, unread && styles.unreadText]}>
          {chat.status === 'active'
            ? preview
            : chat.status === 'blocked'
              ? 'Messaging unavailable'
              : 'Read-only conversation'}
        </Text>
      </View>
      <View style={styles.trailing}>
        {chat.type === 'opportunity' ? (
          <View style={styles.opportunityThumb}>
            <Ionicons
              color={theme.colors.accentStrong}
              name={chat.businessName ? 'business-outline' : 'briefcase-outline'}
              size={20}
            />
          </View>
        ) : null}
        {unread ? (
          <View style={chat.unreadCount > 1 ? styles.unreadBadge : styles.unreadDot}>
            {chat.unreadCount > 1 ? (
              <Text style={styles.unreadBadgeText}>
                {Math.min(chat.unreadCount, 99)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
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
  const profile =
    direction === 'received' ? request.requester : request.recipient;
  return (
    <Pressable
      accessibilityLabel={`Connect request with ${profile.displayName}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.requestRow, pressed && styles.pressed]}>
      <ProfileAvatar profile={profile} size={56} />
      <View style={styles.requestCopy}>
        <View style={styles.chatTitleRow}>
          <Text numberOfLines={1} style={styles.requestName}>
            {profile.displayName}
          </Text>
          <Text style={styles.time}>{formatInboxTime(request.createdAt)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.requestContext}>
          {request.note || connectReasonLabel(request.reason)}
        </Text>
        <Text style={styles.statusText}>
          {request.status === 'pending'
            ? direction === 'received'
              ? 'Awaiting your response'
              : 'Pending'
            : sentenceCase(request.status)}
        </Text>
      </View>
      <Ionicons color={theme.colors.muted} name="chevron-forward" size={18} />
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
      accessibilityLabel={`Application for ${response.opportunityTitle}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.requestRow, pressed && styles.pressed]}>
      <ProfileAvatar profile={response.responder} size={56} />
      <View style={styles.requestCopy}>
        <View style={styles.chatTitleRow}>
          <Text
            numberOfLines={1}
            style={[styles.requestName, isNew && styles.unreadText]}>
            {direction === 'received'
              ? response.responder.displayName
              : response.opportunityTitle}
          </Text>
          <Text style={[styles.time, isNew && styles.unreadTime]}>
            {formatInboxTime(response.createdAt)}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.requestContext}>
          {direction === 'received'
            ? response.opportunityTitle
            : response.posterName}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.preview, isNew && styles.unreadText]}>
          {response.note || 'Application submitted'}
        </Text>
      </View>
      <View style={styles.trailing}>
        <View style={styles.opportunityThumb}>
          <Ionicons
            color={theme.colors.accentStrong}
            name="briefcase-outline"
            size={20}
          />
        </View>
        {isNew ? <View style={styles.unreadDot} /> : null}
      </View>
    </Pressable>
  );
}

export function formatInboxTime(value: string) {
  const timestamp = new Date(value);
  const time = timestamp.getTime();
  if (!Number.isFinite(time)) return '';

  const now = new Date();
  const minutes = Math.max(0, Math.floor((now.getTime() - time) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && timestamp.getDate() === now.getDate()) return `${hours}h`;

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfMessageDay = new Date(
    timestamp.getFullYear(),
    timestamp.getMonth(),
    timestamp.getDate(),
  ).getTime();
  const dayDifference = Math.round(
    (startOfToday - startOfMessageDay) / 86400000,
  );
  if (dayDifference === 1) return 'Yesterday';
  if (dayDifference > 1 && dayDifference < 7) {
    return timestamp.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return timestamp.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function sentenceCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function connectReasonLabel(value: string) {
  return sentenceCase(value);
}

const styles = StyleSheet.create({
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
  chatRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 80,
    paddingVertical: 10,
  },
  chatCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  chatTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  chatName: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  preview: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  opportunityContext: {
    color: theme.colors.accentStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  time: {
    color: theme.colors.mutedLight,
    fontSize: 12,
  },
  unreadTime: {
    color: theme.colors.accentStrong,
    fontWeight: '800',
  },
  unreadText: {
    color: theme.colors.text,
    fontWeight: '900',
  },
  trailing: {
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    minWidth: 30,
  },
  opportunityThumb: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  unreadDot: {
    backgroundColor: theme.colors.accent,
    borderRadius: 5,
    height: 9,
    width: 9,
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  requestRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 82,
    paddingVertical: 11,
  },
  requestCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  requestName: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  requestContext: {
    color: theme.colors.accentStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  statusText: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.62,
  },
});
