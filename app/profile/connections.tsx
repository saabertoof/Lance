import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileAvatar } from '@/components/communication';
import { Button, EmptyState, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import {
  COMMUNICATION_PAGE_SIZE,
  formatCommunicationError,
  loadConnections,
} from '@/lib/communication';
import { routes } from '@/lib/routes';
import type { ConnectionRecord } from '@/types/communication';

export default function ConnectionsScreen() {
  const [connections, setConnections] = useState<ConnectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadConnections();
      setConnections(result);
      setHasMore(result.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await loadConnections(connections.length);
      setConnections((current) => [...current, ...result]);
      setHasMore(result.length === COMMUNICATION_PAGE_SIZE);
    } catch (loadError) {
      setError(formatCommunicationError(loadError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading connections" />;

  return (
    <Screen
      onRefresh={() => void load()}
      refreshing={isLoading}
      scroll
      contentStyle={styles.screen}>
      <Header title="Connections" />
      <Text style={styles.subtitle}>
        Accepted connections can message each other directly.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {connections.length > 0 ? (
        <View>
          {connections.map((connection) => (
            <View key={connection.id} style={styles.row}>
              <Pressable
                onPress={() =>
                  router.push(routes.profile(connection.otherProfile.id))
                }
                style={styles.person}>
                <ProfileAvatar profile={connection.otherProfile} />
                <View style={styles.copy}>
                  <Text style={styles.name}>
                    {connection.otherProfile.displayName}
                  </Text>
                  <Text numberOfLines={1} style={styles.meta}>
                    {[
                      connection.otherProfile.primaryRole,
                      connection.otherProfile.city,
                    ]
                      .filter(Boolean)
                      .join(' | ')}
                  </Text>
                </View>
              </Pressable>
              {connection.conversationId ? (
                <Pressable
                  accessibilityLabel={`Message ${connection.otherProfile.displayName}`}
                  onPress={() =>
                    router.push(routes.conversation(connection.conversationId!))
                  }
                  style={styles.messageButton}>
                  <Ionicons
                    color={theme.colors.accentStrong}
                    name="chatbubble-outline"
                    size={20}
                  />
                </Pressable>
              ) : null}
            </View>
          ))}
          {hasMore ? (
            <Button
              label="Load more"
              loading={isLoadingMore}
              onPress={() => void loadMore()}
              variant="ghost"
            />
          ) : null}
        </View>
      ) : (
        <EmptyState
          title="No connections yet"
          body="When a Connect request is accepted, the connection will appear here."
        />
      )}
    </Screen>
  );
}

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={styles.iconButton}>
        <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.iconButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  title: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, fontSize: theme.typography.small, lineHeight: 21 },
  row: { alignItems: 'center', borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: theme.spacing.md, minHeight: 76, paddingVertical: theme.spacing.md },
  person: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: theme.spacing.md, minWidth: 0 },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  name: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '800' },
  meta: { color: theme.colors.muted, fontSize: theme.typography.small },
  messageButton: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.md, height: 44, justifyContent: 'center', width: 44 },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20 },
});
