import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createEmptyOpportunityDraft,
  type OpportunityDraft,
} from '@/types/opportunity';
import { hasMeaningfulChanges } from '@/lib/reliability';

const STORAGE_PREFIX = 'lance.local-opportunity-draft.v1';
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

type StoredOpportunityDraft = {
  draft: OpportunityDraft;
  savedAt: number;
};

export async function loadLocalOpportunityDraft(userId: string) {
  try {
    const value = await AsyncStorage.getItem(storageKey(userId));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<StoredOpportunityDraft>;
    if (
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > MAX_AGE_MS ||
      !parsed.draft ||
      typeof parsed.draft !== 'object'
    ) {
      await clearLocalOpportunityDraft(userId);
      return null;
    }

    return {
      ...createEmptyOpportunityDraft(),
      ...parsed.draft,
      businessId: parsed.draft.businessId ?? null,
      id: null,
      status: 'draft',
    } satisfies OpportunityDraft;
  } catch {
    return null;
  }
}

export async function saveLocalOpportunityDraft(
  userId: string,
  draft: OpportunityDraft,
) {
  try {
    if (!isMeaningfulOpportunityDraft(draft)) {
      await AsyncStorage.removeItem(storageKey(userId));
      return;
    }

    const payload: StoredOpportunityDraft = {
      draft: {
        ...draft,
        id: null,
        status: 'draft',
      },
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(payload));
  } catch {
    // Local recovery should never interrupt editing.
  }
}

export async function clearLocalOpportunityDraft(userId: string) {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch {
    // A stale recovery draft is harmless and remains scoped to this account.
  }
}

function isMeaningfulOpportunityDraft(draft: OpportunityDraft) {
  return hasMeaningfulChanges(draft, createEmptyOpportunityDraft(), [
    'id',
    'status',
  ]);
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}
