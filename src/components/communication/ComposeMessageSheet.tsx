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

import { Button, EmptyState } from '@/components/ui';
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
      presentationStyle="pageSheet"
      visible={visible}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>New message</Text>
          <Pressable
            accessibilityLabel="Close new message"
            accessibilityRole="button"
            onPress={close}
            style={styles.close}>
            <Ionicons color={theme.colors.text} name="close" size={24} />
          </Pressable>
        </View>

        <View style={styles.search}>
          <Ionicons color={theme.colors.muted} name="search-outline" size={20} />
          <TextInput
            accessibilityLabel="Search connections"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search connections"
            placeholderTextColor={theme.colors.mutedLight}
            style={styles.input}
            value={query}
          />
          {query ? (
            <Pressable
              accessibilityLabel="Clear connection search"
              onPress={() => setQuery('')}
              style={styles.clear}>
              <Ionicons color={theme.colors.muted} name="close-circle" size={20} />
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
              <Text style={styles.error}>{error}</Text>
              <Button
                label="Retry"
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
                        .join(' | ')}
                    </Text>
                  </View>
                  <Ionicons
                    color={theme.colors.accentStrong}
                    name="chatbubble-outline"
                    size={21}
                  />
                </Pressable>
              ))
            : null}
          {!isLoading && !error && filtered.length === 0 ? (
            <EmptyState
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
            />
          ) : null}
          {!isLoading && !error && hasMore ? (
            <Button
              label={
                debouncedQuery
                  ? 'Search more connections'
                  : 'Load more connections'
              }
              loading={isLoadingMore}
              onPress={() => void loadMore()}
              variant="ghost"
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  safe: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: theme.layout.screenPadding,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  close: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  search: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.lg,
    flexDirection: 'row',
    marginHorizontal: theme.layout.screenPadding,
    minHeight: 50,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.body,
    minHeight: 50,
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
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: theme.spacing.lg,
  },
  connection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 76,
    paddingVertical: theme.spacing.sm,
  },
  connectionCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  errorState: {
    gap: theme.spacing.md,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  skeletonList: {
    gap: theme.spacing.md,
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 72,
  },
  skeletonAvatar: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  skeletonCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  skeletonLine: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 5,
    height: 12,
  },
  pressed: {
    opacity: 0.65,
  },
});
