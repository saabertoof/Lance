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
import { loadUnreadCount } from '@/lib/communication';
import { supabase } from '@/lib/supabase';

type MessagingContextValue = {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
};

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      setUnreadCount(await loadUnreadCount());
    } catch {
      // Screens show actionable errors; the badge quietly retries on resume/realtime.
    }
  }, [user]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`unread:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
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
  }, [refreshUnread, user]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnread }),
    [refreshUnread, unreadCount],
  );

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) throw new Error('useMessaging must be used inside MessagingProvider.');
  return context;
}
