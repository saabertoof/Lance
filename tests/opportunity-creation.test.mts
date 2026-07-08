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
