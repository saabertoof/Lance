import type {
  SearchPlanSort,
  SearchPlanTarget,
  SearchPlanV1,
} from '../../supabase/functions/_shared/search-plan';

export type AskLanceResponse = {
  plan: SearchPlanV1;
  requestId: string;
  safetyNotice?: string | null;
};

export type SavedSearchAlertFrequency = 'paused' | 'daily' | 'weekly';

export type SavedSearchRecord = {
  id: string;
  userId: string;
  name: string;
  targetType: SearchPlanTarget;
  originalQuery: string | null;
  normalizedTextQuery: string;
  filterPlan: SearchPlanV1;
  schemaVersion: number;
  sort: SearchPlanSort;
  alertFrequency: SavedSearchAlertFrequency;
  alertEnabled: boolean;
  alertBaselineAt: string | null;
  lastOpenedAt: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  nextRunAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SearchAlertEventRecord = {
  id: string;
  userId: string;
  savedSearchId: string;
  savedSearchName: string;
  opportunityId: string | null;
  opportunityTitle: string;
  posterName: string;
  matchSummary: string[];
  matchedAt: string;
  publishedAt: string | null;
  readAt: string | null;
};
