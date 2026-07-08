import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

export type OnboardingStatus = 'complete' | 'error' | 'incomplete' | 'loading';

type AuthContextValue = {
  isLoading: boolean;
  onboardingStatus: OnboardingStatus;
  refreshProfileStatus: () => Promise<OnboardingStatus>;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('loading');

  const refreshProfileStatus = useCallback(async () => {
    if (!session?.user.id) {
      setOnboardingStatus('incomplete');
      return 'incomplete' as const;
    }

    setOnboardingStatus('loading');

    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      setOnboardingStatus('error');
      return 'error' as const;
    }

    const nextStatus = data?.onboarding_completed_at ? 'complete' : 'incomplete';
    setOnboardingStatus(nextStatus);
    return nextStatus;
  }, [session?.user.id]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) {
          return;
        }

        setSession(data.session);
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setOnboardingStatus(nextSession ? 'loading' : 'incomplete');
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!session) {
      setOnboardingStatus('incomplete');
      return;
    }

    void refreshProfileStatus();
  }, [isLoading, refreshProfileStatus, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: isLoading || Boolean(session && onboardingStatus === 'loading'),
      onboardingStatus,
      refreshProfileStatus,
      session,
      user: session?.user ?? null,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [isLoading, onboardingStatus, refreshProfileStatus, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
