import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
import { theme } from '@/constants/theme';
import {
  COMMUNICATION_PAGE_SIZE,
  formatCommunicationError,
  loadConnections,
} from '@/lib/communication';
import type { ConnectionRecord } from '@/types/communication';

import { ProfileAvatar } from './CommunicationRows';

export function ComposeMessageSheet({
  onClose,
  onSelect,
  visible,
}: {
  onClose: () => void;
  onSelect: (conversationId: string) => void;
  visible: boolean;
}) {
  const [connections, setConnections] = useState<ConnectionRecord[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    loadConnections()
      .then((result) => {
        if (!active) return;
        setConnections(result);
        setHasMore(result.length === COMMUNICATION_PAGE_SIZE);
      })
      .catch((loadError) => {
        if (active) setError(formatCommunicationError(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [visible]);

  const filtered = useMemo(() => {
    const normalized = debouncedQuery.toLowerCase();
    if (!normalized) return connections;
    return connections.filter((connection) =>
      [
        connection.otherProfile.displayName,
        connection.otherProfile.username,
        connection.otherProfile.primaryRole,
        connection.otherProfile.city,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [connections, debouncedQuery]);

  async function loadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const result = await loadConnections(connections.length);
      setConnections((current) => mergeById(current, result));
      setHasMore(result.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  function close() {
    setQuery('');
    setDebouncedQuery('');
    setError(null);
    onClose();
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      transparent
      visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" onPress={close} style={styles.backdrop} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>New message</Text>
            <Text style={styles.title}>Start a chat</Text>
          </View>
          <Pressable
            accessibilityLabel="Close new message"
            accessibilityRole="button"
            onPress={close}
            style={styles.close}>
            <Ionicons color={v.text} name="close" size={18} />
          </Pressable>
        </View>

        <View style={styles.search}>
          <Ionicons color={v.textSoft} name="search-outline" size={18} />
          <TextInput
            accessibilityLabel="Search connections"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search connections"
            placeholderTextColor={v.muted}
            style={styles.input}
            value={query}
          />
          {query ? (
            <Pressable
              accessibilityLabel="Clear connection search"
              onPress={() => setQuery('')}
              style={styles.clear}>
              <Ionicons color={v.textSoft} name="close" size={18} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {isLoading ? <ConnectionSkeletons /> : null}
          {!isLoading && error ? (
            <View style={styles.errorState}>
              <SheetState body={error} icon="warning-outline" title="Connections unavailable" />
              <Button
                label="Retry"
                labelStyle={styles.secondaryButtonLabel}
                onPress={() => {
                  setConnections([]);
                  setIsLoading(true);
                  loadConnections()
                    .then((result) => {
                      setConnections(result);
                      setHasMore(result.length === COMMUNICATION_PAGE_SIZE);
                      setError(null);
                    })
                    .catch((loadError) =>
                      setError(formatCommunicationError(loadError)),
                    )
                    .finally(() => setIsLoading(false));
                }}
                style={styles.secondaryButton}
                variant="secondary"
              />
            </View>
          ) : null}
          {!isLoading && !error && filtered.length > 0
            ? filtered.map((connection) => (
                <Pressable
                  accessibilityLabel={`Message ${connection.otherProfile.displayName}`}
                  accessibilityRole="button"
                  key={connection.id}
                  onPress={() => {
                    if (!connection.conversationId) {
                      setError(
                        'This connection does not have an available conversation yet.',
                      );
                      return;
                    }
                    close();
                    onSelect(connection.conversationId);
                  }}
                  style={({ pressed }) => [
                    styles.connection,
                    pressed && styles.pressed,
                  ]}>
                  <ProfileAvatar profile={connection.otherProfile} size={56} />
                  <View style={styles.connectionCopy}>
                    <Text numberOfLines={1} style={styles.name}>
                      {connection.otherProfile.displayName}
                    </Text>
                    <Text numberOfLines={1} style={styles.meta}>
                      {[
                        connection.otherProfile.username
                          ? `@${connection.otherProfile.username}`
                          : '',
                        connection.otherProfile.primaryRole,
                        connection.otherProfile.city,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Ionicons
                    color={v.purpleStrong}
                    name="paper-plane-outline"
                    size={21}
                  />
                </Pressable>
              ))
            : null}
          {!isLoading && !error && filtered.length === 0 ? (
            <SheetState
              body={
                debouncedQuery
                  ? 'Try another connection name or username.'
                  : 'Accepted Connections will appear here when you can message them.'
              }
              title={
                debouncedQuery
                  ? 'No connections found'
                  : 'No connections yet'
              }
              icon="people-outline"
            />
          ) : null}
          {!isLoading && !error && hasMore ? (
            <Button
              label={
                debouncedQuery
                  ? 'Search more connections'
                  : 'Load more connections'
              }
              labelStyle={styles.ghostButtonLabel}
              loading={isLoadingMore}
              onPress={() => void loadMore()}
              style={styles.ghostButton}
              variant="ghost"
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
      </View>
    </Modal>
  );
}

function SheetState({
  body,
  icon,
  title,
}: {
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sheetState}>
      <View style={styles.sheetStateIcon}>
        <Ionicons color={v.purpleStrong} name={icon} size={20} />
      </View>
      <Text style={styles.sheetStateTitle}>{title}</Text>
      <Text style={styles.sheetStateBody}>{body}</Text>
    </View>
  );
}

function ConnectionSkeletons() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, { width: '58%' }]} />
            <View style={[styles.skeletonLine, { width: '82%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function mergeById(current: ConnectionRecord[], next: ConnectionRecord[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  safe: {
    backgroundColor: v.surface,
    borderColor: v.borderStrong,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    maxHeight: '86%',
    paddingTop: 9,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: v.borderStrong,
    borderRadius: 2,
    height: 4,
    marginBottom: 10,
    width: 42,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  kicker: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  title: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 20,
    fontWeight: '600',
  },
  close: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: v.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  search: {
    alignItems: 'center',
    backgroundColor: '#0E0E16',
    borderColor: v.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  input: {
    color: v.text,
    flex: 1,
    fontFamily: operatorFonts.sans,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 0,
  },
  clear: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: {
    flexGrow: 1,
    gap: 8,
    paddingBottom: 34,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  connection: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: v.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  connectionCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  name: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
  },
  errorState: {
    gap: 10,
  },
  error: {
    color: v.danger,
    fontFamily: operatorFonts.sans,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  skeletonList: {
    gap: 8,
  },
  skeletonRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: v.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 12,
  },
  skeletonAvatar: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 23,
    height: 46,
    width: 46,
  },
  skeletonCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  skeletonLine: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 5,
    height: 10,
  },
  sheetState: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: v.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  sheetStateIcon: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: 18,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sheetStateTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sheetStateBody: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: v.surfaceStrong,
    borderColor: v.borderPurple,
    borderWidth: 1,
    minHeight: 42,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderColor: v.border,
    borderWidth: 1,
    minHeight: 40,
  },
  secondaryButtonLabel: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  ghostButtonLabel: {
    color: v.textSoft,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.65,
  },
});
