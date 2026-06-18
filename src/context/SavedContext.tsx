import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import {
  loadSavedIds,
  logSavedError,
  saveOpportunity,
  saveProfile,
  unsaveOpportunity,
  unsaveProfile,
} from '@/lib/saved';

type SavedContextValue = {
  isLoading: boolean;
  isOpportunitySaved: (opportunityId: string) => boolean;
  isProfileSaved: (profileId: string) => boolean;
  refreshSaved: () => Promise<void>;
  setOpportunitySaved: (opportunityId: string, saved: boolean) => Promise<boolean>;
  setProfileSaved: (profileId: string, saved: boolean) => Promise<boolean>;
};

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { showSuccess, showWarning } = useFeedback();
  const [profileIds, setProfileIds] = useState<Set<string>>(new Set());
  const [opportunityIds, setOpportunityIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef(new Set<string>());

  const refreshSaved = useCallback(async () => {
    if (!user) {
      setProfileIds(new Set());
      setOpportunityIds(new Set());
      return;
    }

    setIsLoading(true);

    try {
      const saved = await loadSavedIds(user.id);
      setProfileIds(new Set(saved.profileIds));
      setOpportunityIds(new Set(saved.opportunityIds));
    } catch (error) {
      logSavedError('refresh', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved]);

  const setProfileSaved = useCallback(
    async (profileId: string, saved: boolean) => {
      if (!user) return false;
      const requestKey = `profile:${profileId}`;
      if (inFlight.current.has(requestKey)) return false;

      const previous = profileIds.has(profileId);
      if (previous === saved) return true;

      inFlight.current.add(requestKey);
      setProfileIds((current) => updateSet(current, profileId, saved));

      try {
        if (saved) {
          await saveProfile(user.id, profileId);
          showSuccess('Profile saved privately.');
        } else {
          await unsaveProfile(user.id, profileId);
          showSuccess('Profile removed from Saved.');
        }
        return true;
      } catch (error) {
        setProfileIds((current) => updateSet(current, profileId, previous));
        logSavedError(saved ? 'save-profile' : 'unsave-profile', error);
        showWarning('That profile could not be updated in Saved. Try again.');
        return false;
      } finally {
        inFlight.current.delete(requestKey);
      }
    },
    [profileIds, showSuccess, showWarning, user],
  );

  const setOpportunitySaved = useCallback(
    async (opportunityId: string, saved: boolean) => {
      if (!user) return false;
      const requestKey = `opportunity:${opportunityId}`;
      if (inFlight.current.has(requestKey)) return false;

      const previous = opportunityIds.has(opportunityId);
      if (previous === saved) return true;

      inFlight.current.add(requestKey);
      setOpportunityIds((current) => updateSet(current, opportunityId, saved));

      try {
        if (saved) {
          await saveOpportunity(user.id, opportunityId);
          showSuccess('Opportunity saved privately.');
        } else {
          await unsaveOpportunity(user.id, opportunityId);
          showSuccess('Opportunity removed from Saved.');
        }
        return true;
      } catch (error) {
        setOpportunityIds((current) => updateSet(current, opportunityId, previous));
        logSavedError(saved ? 'save-opportunity' : 'unsave-opportunity', error);
        showWarning('That opportunity could not be updated in Saved. Try again.');
        return false;
      } finally {
        inFlight.current.delete(requestKey);
      }
    },
    [opportunityIds, showSuccess, showWarning, user],
  );

  const value = useMemo<SavedContextValue>(
    () => ({
      isLoading,
      isOpportunitySaved: (opportunityId) => opportunityIds.has(opportunityId),
      isProfileSaved: (profileId) => profileIds.has(profileId),
      refreshSaved,
      setOpportunitySaved,
      setProfileSaved,
    }),
    [
      isLoading,
      opportunityIds,
      profileIds,
      refreshSaved,
      setOpportunitySaved,
      setProfileSaved,
    ],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const context = useContext(SavedContext);

  if (!context) {
    throw new Error('useSaved must be used inside SavedProvider.');
  }

  return context;
}

function updateSet(current: Set<string>, id: string, included: boolean) {
  const next = new Set(current);
  if (included) next.add(id);
  else next.delete(id);
  return next;
}
