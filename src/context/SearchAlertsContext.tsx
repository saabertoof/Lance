import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { loadUnreadSearchAlertCount } from '@/lib/searchPhase6';
import { supabase } from '@/lib/supabase';

type SearchAlertsContextValue = {
  refreshUnread: () => Promise<void>;
  unreadCount: number;
};

const SearchAlertsContext = createContext<SearchAlertsContextValue | null>(
  null,
);

export function SearchAlertsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const userId = user?.id ?? null;

  const refreshUnread = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    try {
      setUnreadCount(await loadUnreadSearchAlertCount());
    } catch {
      // Keep the last known badge and retry when realtime reconnects or the app resumes.
    }
  }, [userId]);

  useEffect(() => {
    void refreshUnread();
    if (!userId) return;
    const channel = supabase
      .channel(`search-alerts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `user_id=eq.${userId}`,
          schema: 'public',
          table: 'search_alert_events',
        },
        () => void refreshUnread(),
      )
      .subscribe();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshUnread();
    });
    return () => {
      appStateSubscription.remove();
      void supabase.removeChannel(channel);
    };
  }, [refreshUnread, userId]);

  const value = useMemo(
    () => ({ refreshUnread, unreadCount }),
    [refreshUnread, unreadCount],
  );

  return (
    <SearchAlertsContext.Provider value={value}>
      {children}
    </SearchAlertsContext.Provider>
  );
}

export function useSearchAlerts() {
  const context = useContext(SearchAlertsContext);
  if (!context) {
    throw new Error(
      'useSearchAlerts must be used inside SearchAlertsProvider.',
    );
  }
  return context;
}
