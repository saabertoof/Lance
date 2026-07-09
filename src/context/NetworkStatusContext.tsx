import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

type ConnectionState = 'offline' | 'online' | 'unknown';

type NetworkStatusContextValue = {
  connectionState: ConnectionState;
  isOffline: boolean;
  refresh: () => Promise<void>;
};

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(
  null,
);

export function NetworkStatusProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('unknown');

  const update = useCallback((state: Network.NetworkState) => {
    const offline =
      state.isConnected === false || state.isInternetReachable === false;
    const online =
      state.isConnected === true && state.isInternetReachable !== false;
    setConnectionState(offline ? 'offline' : online ? 'online' : 'unknown');
  }, []);

  const refresh = useCallback(async () => {
    try {
      update(await Network.getNetworkStateAsync());
    } catch {
      setConnectionState('unknown');
    }
  }, [update]);

  useEffect(() => {
    void refresh();
    const subscription = Network.addNetworkStateListener(update);
    return () => subscription.remove();
  }, [refresh, update]);

  const value = useMemo(
    () => ({
      connectionState,
      isOffline: connectionState === 'offline',
      refresh,
    }),
    [connectionState, refresh],
  );

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
      {connectionState === 'offline' ? (
        <View
          accessibilityLiveRegion="assertive"
          style={[styles.banner, { top: insets.top + 8 }]}>
          <Ionicons
            color={theme.colors.danger}
            name="cloud-offline-outline"
            size={16}
          />
          <View style={styles.copy}>
            <Text style={styles.title}>You are offline</Text>
            <Text style={styles.body}>Viewing works, but actions need a connection.</Text>
          </View>
          <Pressable
            accessibilityLabel="Check connection again"
            accessibilityRole="button"
            onPress={() => void refresh()}
            style={({ pressed }) => [
              styles.retry,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within NetworkStatusProvider.');
  }
  return context;
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: '#171116',
    borderColor: 'rgba(255,107,107,0.28)',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    left: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
    position: 'absolute',
    right: theme.spacing.lg,
    zIndex: 1100,
    ...theme.shadows.card,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.caption,
  },
  body: {
    color: theme.colors.muted,
    fontSize: 10,
  },
  retry: {
    alignItems: 'center',
    borderColor: 'rgba(255,107,107,0.25)',
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
  },
  retryLabel: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.caption,
  },
  pressed: {
    opacity: 0.68,
  },
});
