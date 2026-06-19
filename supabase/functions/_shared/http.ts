export const corsHeaders = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-alert-worker-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

export function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function safeErrorCategory(error: unknown) {
  if (!(error instanceof Error)) return 'unknown_error';
  const normalized = error.message.toLowerCase();
  if (normalized.includes('timeout')) return 'timeout';
  if (normalized.includes('structured')) return 'invalid_structured_output';
  if (normalized.includes('openai')) return 'openai_unavailable';
  if (normalized.includes('session') || normalized.includes('jwt')) {
    return 'authentication';
  }
  return 'internal_error';
}
