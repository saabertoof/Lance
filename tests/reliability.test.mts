import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  calculateFunnelConversion,
  hasMeaningfulChanges,
  isNetworkFailure,
  sanitizeErrorArea,
  sanitizeErrorMessage,
  stableErrorFingerprint,
} from '../src/lib/reliability.ts';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('error reports strip common secrets and personal identifiers', () => {
  const fakeSecret = `sk-${'test_12345678901234567890'}`;
  const fakeJwt = [
    'eyJabcdefghijk',
    'abcdefghijklmnop',
    'qrstuvwxyzabcdefghij',
  ].join('.');
  const value = sanitizeErrorMessage(
    'Failed for ben@example.com at https://example.com/private ' +
      `apikey=super-secret-value ${fakeSecret} ${fakeJwt}`,
  );

  assert.equal(value.includes('ben@example.com'), false);
  assert.equal(value.includes('https://example.com/private'), false);
  assert.equal(value.includes('super-secret-value'), false);
  assert.equal(value.includes('sk-test'), false);
  assert.equal(value.includes('eyJabcdefghijk'), false);
  assert.match(value, /\[email\]/);
  assert.match(value, /\[url\]/);
});

test('error areas and fingerprints are stable and bounded', () => {
  assert.equal(
    sanitizeErrorArea(' Opportunity Application / Submit '),
    'opportunity_application_submit',
  );
  const first = stableErrorFingerprint('same-error');
  const second = stableErrorFingerprint('same-error');
  assert.equal(first, second);
  assert.match(first, /^lance-[0-9a-f]{8}$/);
});

test('network failures receive a distinct retry classification', () => {
  assert.equal(
    isNetworkFailure(new Error('Network request failed')),
    true,
  );
  assert.equal(isNetworkFailure(new Error('Permission denied')), false);
});

test('funnel conversion handles empty and malformed counts safely', () => {
  assert.equal(calculateFunnelConversion(0, 3), 0);
  assert.equal(calculateFunnelConversion(10, 3), 30);
  assert.equal(calculateFunnelConversion(2, 5), 100);
  assert.equal(calculateFunnelConversion(Number.NaN, 1), 0);
});

test('public opportunity funnel preserves signed-out return paths', async () => {
  const [publicRoute, signup] = await Promise.all([
    read('app/o/[slug].tsx'),
    read('app/(auth)/signup.tsx'),
  ]);

  assert.match(publicRoute, /trackOpportunityFunnelEvent\(opportunity\.slug, 'view'\)/);
  assert.match(publicRoute, /'apply_started'/);
  assert.match(publicRoute, /authRoute\('\/signup', nextPath\)/);
  assert.match(signup, /emailRedirectTo/);
  assert.match(signup, /Linking\.createURL\('\/onboarding'/);
  assert.match(signup, /next: String\(nextPath\)/);
});

test('application submission waits for profile readiness and blocks duplicates', async () => {
  const [sheet, action, communication] = await Promise.all([
    read('src/components/communication/ExpressInterestSheet.tsx'),
    read('src/components/communication/OpportunityInterestAction.tsx'),
    read('src/lib/communication.ts'),
  ]);

  assert.match(sheet, /profileState !== 'ready'/);
  assert.match(sheet, /submitting\.current/);
  assert.match(sheet, /Reconnect to send/);
  assert.match(sheet, /already responded/i);
  assert.match(sheet, /loadOpportunityResponseState/);
  assert.match(action, /loadOpportunityResponseState/);
  assert.match(action, /onApplicationStart/);
  assert.match(communication, /phase5_send_opportunity_response/);
});

test('message retry keeps one client nonce from app through database', async () => {
  const [conversation, migration] = await Promise.all([
    read('app/messages/[id].tsx'),
    read('supabase/migrations/0008_phase_5_connections_messaging.sql'),
  ]);

  assert.match(
    conversation,
    /existing\?\.clientNonce \?\? createClientNonce\(\)/,
  );
  assert.match(
    migration,
    /create unique index messages_sender_nonce_idx/i,
  );
  assert.match(
    migration,
    /where message\.sender_profile_id = current_profile_id[\s\S]*message\.client_nonce = target_client_nonce/i,
  );
  assert.match(
    migration,
    /on conflict \(sender_profile_id, client_nonce\)/i,
  );
});

test('direct message entry points can repair missing connection conversations', async () => {
  const [communication, compose, connections, request, relationship, migration] =
    await Promise.all([
      read('src/lib/communication.ts'),
      read('src/components/communication/ComposeMessageSheet.tsx'),
      read('app/profile/connections.tsx'),
      read('app/request/connect/[id].tsx'),
      read('src/components/communication/RelationshipAction.tsx'),
      read('supabase/migrations/0013_message_connection_repair.sql'),
    ]);

  assert.match(communication, /phase5_open_direct_conversation/);
  assert.match(compose, /openDirectConversation\(connection\.id\)/);
  assert.doesNotMatch(compose, /does not have an available conversation yet/);
  assert.match(connections, /openDirectConversation\(connection\.id\)/);
  assert.match(request, /openDirectConversation\(relationship\.connectionId\)/);
  assert.match(relationship, /openDirectConversation\(nextStatus\.connectionId\)/);
  assert.match(migration, /current_profile_id not in/i);
  assert.match(migration, /on conflict \(match_id\)/i);
  assert.match(
    migration,
    /grant execute on function public\.phase5_open_direct_conversation\(uuid\)\s+to authenticated/i,
  );
});

test('conversation composer attempts send even when device network status is stale', async () => {
  const conversation = await read('app/messages/[id].tsx');

  assert.doesNotMatch(conversation, /const \{ connectionState, isOffline \}/);
  assert.doesNotMatch(conversation, /disabled=\{!draft\.trim\(\) \|\| sending\.current \|\| isOffline\}/);
  assert.doesNotMatch(conversation, /You are offline\. Your message is still here/);
});

test('public opportunity links fail closed for unavailable lifecycle states', async () => {
  const migration = await read(
    'supabase/migrations/0010_creator_opportunity_links.sql',
  );

  assert.match(migration, /opportunity\.status = 'published'/);
  assert.match(migration, /opportunity\.deleted_at is null/);
  assert.match(migration, /opportunity\.expires_at > now\(\)/);
  assert.match(migration, /business\.status = 'active'/);
  assert.match(migration, /profile\.deleted_at is null/);
});

test('opportunity share cards export at social-ready resolution', async () => {
  const shareSheet = await read('src/components/opportunity/OpportunityShareSheet.tsx');

  assert.match(shareSheet, /height: 1350/);
  assert.match(shareSheet, /width: 1080/);
  assert.doesNotMatch(shareSheet, /PixelRatio\.get\(\)/);
});

test('new opportunity drafts recover locally and clear after server save', async () => {
  const [screen, storage] = await Promise.all([
    read('app/opportunity/new.tsx'),
    read('src/lib/localOpportunityDraft.ts'),
  ]);

  assert.match(screen, /loadLocalOpportunityDraft/);
  assert.match(screen, /saveLocalOpportunityDraft/);
  assert.match(screen, /clearLocalOpportunityDraft/);
  assert.match(storage, /MAX_AGE_MS = 14 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(storage, /id: null/);
  assert.match(storage, /status: 'draft'/);
});

test('local recovery ignores untouched editors but keeps real changes', async () => {
  const empty = { id: null, skills: [] as string[], status: 'draft', title: '' };
  assert.equal(hasMeaningfulChanges(empty, empty, ['id', 'status']), false);
  assert.equal(
    hasMeaningfulChanges({
      ...empty,
      title: 'Short-form editor',
    }, empty, ['id', 'status']),
    true,
  );
  assert.equal(
    hasMeaningfulChanges({
      ...empty,
      skills: ['Video editing'],
    }, empty, ['id', 'status']),
    true,
  );
  assert.match(
    await read('src/lib/localOpportunityDraft.ts'),
    /hasMeaningfulChanges\(draft, createEmptyOpportunityDraft\(\),/,
  );
});

test('migration 0012 keeps raw telemetry private and aggregated', async () => {
  const migration = await read(
    'supabase/migrations/0012_beta_reliability_observability.sql',
  );

  assert.match(
    migration,
    /alter table public\.opportunity_funnel_events enable row level security/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.opportunity_funnel_events from anon, authenticated/i,
  );
  assert.match(
    migration,
    /get_opportunity_funnel_summary/,
  );
  assert.match(
    migration,
    /target_owner_id <> current_profile_id/,
  );
  assert.match(
    migration,
    /record_client_error/,
  );
  assert.equal(/\bip_address\b|\bemail\b|\buser_agent\b/i.test(migration), false);
});

test('preview builds remain local and use internal distribution', async () => {
  const eas = JSON.parse(await read('eas.json')) as {
    build?: {
      preview?: { android?: { buildType?: string }; distribution?: string };
    };
  };

  assert.equal(eas.build?.preview?.distribution, 'internal');
  assert.equal(eas.build?.preview?.android?.buildType, 'apk');
});
