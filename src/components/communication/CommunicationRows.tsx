import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
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
              color={v.purpleStrong}
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
      <Ionicons color={v.muted} name="chevron-forward" size={17} />
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
            color={v.purpleStrong}
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
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  initials: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: theme.typography.small,
    fontWeight: '600',
  },
  chatRow: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 12,
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
    color: v.text,
    flex: 1,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
  },
  preview: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
  },
  opportunityContext: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
  time: {
    color: v.muted,
    fontFamily: operatorFonts.sans,
    fontSize: 11,
  },
  unreadTime: {
    color: v.purpleStrong,
    fontWeight: '600',
  },
  unreadText: {
    color: v.text,
    fontWeight: '600',
  },
  trailing: {
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    minWidth: 30,
  },
  opportunityThumb: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  unreadDot: {
    backgroundColor: v.purpleStrong,
    borderRadius: 5,
    height: 9,
    width: 9,
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: v.purple,
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: v.white,
    fontSize: 10,
    fontWeight: '600',
  },
  requestRow: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  requestCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  requestName: {
    color: v.text,
    flex: 1,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
  },
  requestContext: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
  statusText: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.62,
  },
});
