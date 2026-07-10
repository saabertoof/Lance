import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { applyMagicOpportunityDraft } from '../src/lib/opportunityMagicDraft.ts';
import { createEmptyOpportunityDraft } from '../src/types/opportunity.ts';

test('Magic Draft extracts common per-deliverable compensation ranges', () => {
  const draft = applyMagicOpportunityDraft(
    'Need a short-form editor, paid $50-$100 per video, remote, CapCut preferred.',
    createEmptyOpportunityDraft(),
  );

  assert.equal(draft.compensationType, 'fixed_project');
  assert.equal(draft.compensationMin, '50');
  assert.equal(draft.compensationMax, '100');
  assert.equal(draft.currency, 'USD');
  assert.equal(draft.ratePeriod, 'per_project');
});

test('Magic Draft produces concise non-duplicated creator copy', () => {
  const prompt =
    'Need a hungry short-form editor for Instagram Reels and TikTok, starting next week.';
  const draft = applyMagicOpportunityDraft(prompt, createEmptyOpportunityDraft());

  assert.equal(draft.shortSummary, prompt);
  assert.ok(draft.fullDescription.startsWith('Need a hungry short-form editor'));
  assert.ok(!draft.fullDescription.includes('Help with Need'));
  assert.ok(!draft.fullDescription.includes('..'));
});

test('Magic Draft uses a server-side strict structured output function', async () => {
  const [edgeFunction, schema, config, client, envExample] = await Promise.all([
    readFile(
      new URL(
        '../supabase/functions/magic-opportunity-draft/index.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../supabase/functions/_shared/opportunity-draft.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(new URL('../supabase/config.toml', import.meta.url), 'utf8'),
    readFile(
      new URL('../src/lib/opportunityMagicDraftApi.ts', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../.env.example', import.meta.url), 'utf8'),
  ]);

  assert.match(config, /\[functions\.magic-opportunity-draft\][\s\S]*verify_jwt = true/);
  assert.match(edgeFunction, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(edgeFunction, /OPENAI_API_KEY/);
  assert.match(edgeFunction, /OPENAI_MAGIC_DRAFT_MODEL/);
  assert.match(edgeFunction, /type: 'json_schema'/);
  assert.match(edgeFunction, /strict: true/);
  assert.match(edgeFunction, /lance_magic_opportunity_draft_v1/);
  assert.match(schema, /additionalProperties: false/);
  assert.match(schema, /share_caption/);
  assert.match(client, /supabase\.functions\.invoke<MagicDraftResponse>/);
  assert.match(client, /'magic-opportunity-draft'/);
  assert.doesNotMatch(client, /OPENAI_API_KEY/);
  assert.doesNotMatch(envExample, /^OPENAI_API_KEY=/m);
});

test('Opportunity editor falls back locally when Magic Draft API is unavailable', async () => {
  const editor = await readFile(
    new URL('../src/components/opportunity/OpportunityEditor.tsx', import.meta.url),
    'utf8',
  );

  assert.match(editor, /generateMagicOpportunityDraft\(prompt, getValues\(\)\)/);
  assert.match(editor, /buildMagicOpportunityDraft\(prompt, getValues\(\)\)/);
  assert.match(editor, /Used a local starter draft instead/);
  assert.match(editor, /Draft with Lance/);
});

test('industry catalog migration removes stale hard-coded posting constraints', async () => {
  const migration = await readFile(
    new URL(
      '../supabase/migrations/0011_opportunity_industry_catalog_fix.sql',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    migration,
    /drop constraint if exists opportunities_phase3_industry_check/i,
  );
  assert.match(
    migration,
    /drop constraint if exists businesses_phase3_industry_check/i,
  );
  assert.match(migration, /char_length\(trim\(industry\)\) between 1 and 80/i);
});
