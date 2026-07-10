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

test('opportunity applications preview a reusable application packet', async () => {
  const sheet = await read('src/components/communication/ExpressInterestSheet.tsx');

  assert.match(sheet, /Application packet/);
  assert.match(sheet, /What the creator gets/);
  assert.match(sheet, /EliteCard/);
  assert.match(sheet, /EliteSignalPill/);
  assert.match(sheet, /Reusable profile/);
  assert.match(sheet, /Highlighted skills/);
  assert.match(sheet, /Proof of work/);
  assert.match(sheet, /Fit note/);
  assert.match(sheet, /Clipboard|sendOpportunityResponse/);
});

test('premium opportunity surfaces use the shared elite UI system', async () => {
  const [eliteSurface, publicOpportunity, launchCenter, responseDetail] =
    await Promise.all([
      read('src/components/ui/EliteSurface.tsx'),
      read('app/o/[slug].tsx'),
      read('src/components/opportunity/OpportunityLaunchCenter.tsx'),
      read('app/request/opportunity/[id].tsx'),
    ]);

  assert.match(eliteSurface, /EliteCard/);
  assert.match(eliteSurface, /EliteSectionHeader/);
  assert.match(eliteSurface, /EliteSignalPill/);
  assert.match(publicOpportunity, /<EliteCard style=\{styles\.hero\} tone="accent">/);
  assert.match(launchCenter, /EliteSectionHeader/);
  assert.match(responseDetail, /Creator review/);
  assert.match(responseDetail, /EliteSignalPill/);
});

test('public opportunity links present a premium application packet path', async () => {
  const publicOpportunity = await read('app/o/[slug].tsx');

  assert.match(publicOpportunity, /Profile apply/);
  assert.match(publicOpportunity, /Private review/);
  assert.match(publicOpportunity, /Application packet/);
  assert.match(publicOpportunity, /Reusable profile/);
  assert.match(publicOpportunity, /Proof friendly/);
  assert.match(publicOpportunity, /No messy DMs/);
  assert.match(publicOpportunity, /EliteHairline tone="cyan"/);
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

test('published opportunity owners get a creator launch center', async () => {
  const [detail, launchCenter, routes] = await Promise.all([
    read('app/opportunity/[id]/index.tsx'),
    read('src/components/opportunity/OpportunityLaunchCenter.tsx'),
    read('src/lib/routes.ts'),
  ]);

  assert.match(detail, /OpportunityLaunchCenter/);
  assert.doesNotMatch(detail, /Share this opportunity/);
  assert.match(launchCenter, /Launch center/);
  assert.match(launchCenter, /OpportunityLinkPreviewCard/);
  assert.match(launchCenter, /Live preview/);
  assert.match(launchCenter, /Review applicants/);
  assert.match(launchCenter, /Share kit/);
  assert.match(launchCenter, /Copy launch kit/);
  assert.match(launchCenter, /Preview link/);
  assert.match(launchCenter, /Clipboard\.setStringAsync\(publicUrl\)/);
  assert.match(launchCenter, /Clipboard\.setStringAsync\(launchKit\)/);
  assert.match(launchCenter, /OpportunityFunnelCard/);
  assert.match(routes, /publicOpportunity/);
});

test('creator launch center includes post-anywhere copy blocks', async () => {
  const launchCenter = await read('src/components/opportunity/OpportunityLaunchCenter.tsx');

  assert.match(launchCenter, /Post anywhere kit/);
  assert.match(launchCenter, /Bio \/ Linktree title/);
  assert.match(launchCenter, /Story line/);
  assert.match(launchCenter, /Community caption/);
  assert.match(launchCenter, /LaunchStatus/);
});

test('applicant review keeps creator-native packet actions', async () => {
  const responses = await read('app/opportunity/[id]/responses.tsx');

  assert.match(responses, /useSaved/);
  assert.match(responses, /toggleSaveApplicant/);
  assert.match(responses, /Skill signal/);
  assert.match(responses, /Proof/);
  assert.match(responses, /Application/);
  assert.match(responses, /Message/);
  assert.match(responses, /Pass/);
});

test('discover deck holds the mounted next card during promotion to prevent flashes', async () => {
  const deck = await read('src/components/discovery/DiscoverDeck.tsx');

  assert.match(deck, /CARD_PROMOTION_HOLD_MS/);
  assert.match(deck, /latestChildren/);
  assert.match(deck, /renderedCurrentCard/);
  assert.match(deck, /renderedNextCard/);
  assert.match(deck, /isPromotingNextCard/);
  assert.match(deck, /setRenderedCurrentCard\(latestChildren\.current\)/);
  assert.match(deck, /setRenderedNextCard\(nextCard\)/);
  assert.match(deck, /entryProgress\.setValue\(1\)/);
  assert.match(deck, /opacity: isPromotingNextCard \? 1 : nextCardOpacity/);
  assert.match(deck, /outputRange: \[0, 1\]/);
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
