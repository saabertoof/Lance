import { createClient } from 'npm:@supabase/supabase-js@2.108.2';

import { corsHeaders, jsonResponse } from '../_shared/http.ts';

type ClaimedSearch = {
  saved_search_id: string;
  user_id: string;
  filter_plan: Record<string, unknown>;
  since_at: string;
  alert_frequency: 'daily' | 'weekly';
};

type MatchedOpportunity = {
  opportunity_id: string;
  opportunity_title: string;
  poster_name: string;
  published_at: string;
  match_summary: string[];
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const requestId = crypto.randomUUID();
  const expectedSecret = Deno.env.get('ALERT_WORKER_SECRET');
  const suppliedSecret =
    request.headers.get('x-alert-worker-secret') ??
    request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!expectedSecret || !suppliedSecret || suppliedSecret !== expectedSecret) {
    return jsonResponse(
      { error: 'unauthorized', requestId },
      401,
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey =
    readDefaultProjectKey('SUPABASE_SECRET_KEYS') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !secretKey) {
    return jsonResponse(
      { error: 'server_configuration', requestId },
      503,
    );
  }

  const service = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });
  const batchSize = boundedInteger(
    Deno.env.get('ALERT_WORKER_BATCH_SIZE'),
    25,
    1,
    100,
  );
  const matchLimit = boundedInteger(
    Deno.env.get('ALERT_WORKER_MATCH_LIMIT'),
    100,
    1,
    250,
  );

  const { data: claimedData, error: claimError } = await service.rpc(
    'phase6_claim_due_job_alerts',
    { target_limit: batchSize },
  );
  if (claimError) {
    console.error(`[process-search-alerts:${requestId}] claim_failed`);
    return jsonResponse(
      { error: 'claim_failed', requestId },
      500,
    );
  }

  const claimed = (claimedData ?? []) as ClaimedSearch[];
  let failed = 0;
  let inserted = 0;
  let processed = 0;

  for (const search of claimed) {
    try {
      const { data: matchData, error: matchError } = await service.rpc(
        'phase6_match_job_alert_opportunities',
        {
          target_saved_search_id: search.saved_search_id,
          target_since: search.since_at,
          target_limit: matchLimit,
        },
      );
      if (matchError) throw matchError;

      const matches = (matchData ?? []) as MatchedOpportunity[];
      if (matches.length > 0) {
        const { data: eventData, error: eventError } = await service
          .from('search_alert_events')
          .upsert(
            matches.map((match) => ({
              user_id: search.user_id,
              saved_search_id: search.saved_search_id,
              opportunity_id: match.opportunity_id,
              opportunity_title_snapshot: match.opportunity_title,
              poster_name_snapshot: match.poster_name,
              match_summary: match.match_summary,
              published_at_snapshot: match.published_at,
            })),
            {
              onConflict: 'saved_search_id,opportunity_id',
              ignoreDuplicates: true,
            },
          )
          .select('id');
        if (eventError) throw eventError;
        inserted += eventData?.length ?? 0;
      }

      const completedAt = new Date();
      const nextRun = new Date(
        completedAt.getTime() +
          (search.alert_frequency === 'weekly' ? 7 : 1) * 86_400_000,
      );
      const { error: updateError } = await service
        .from('saved_searches')
        .update({
          last_success_at: completedAt.toISOString(),
          next_run_at: nextRun.toISOString(),
          last_error_code: null,
        })
        .eq('id', search.saved_search_id)
        .eq('alert_enabled', true);
      if (updateError) throw updateError;
      processed += 1;
    } catch {
      failed += 1;
      await service
        .from('saved_searches')
        .update({
          last_error_code: 'worker_failed',
          next_run_at: new Date(Date.now() + 3_600_000).toISOString(),
        })
        .eq('id', search.saved_search_id);
      console.error(
        `[process-search-alerts:${requestId}] search_failed:${search.saved_search_id}`,
      );
    }
  }

  return jsonResponse({
    requestId,
    claimed: claimed.length,
    processed,
    failed,
    inserted,
  });
});

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function readDefaultProjectKey(name: string) {
  const value = Deno.env.get(name);
  if (!value) return undefined;
  try {
    const keys = JSON.parse(value) as Record<string, unknown>;
    if (typeof keys.default === 'string') return keys.default;
    return Object.values(keys).find(
      (key): key is string => typeof key === 'string',
    );
  } catch {
    return undefined;
  }
}
