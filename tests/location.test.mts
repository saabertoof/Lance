import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  countryFlag,
  normalizeCountryCode,
} from '../src/constants/countries.ts';

test('normalizes common country names, shorthands, and aliases', () => {
  assert.equal(normalizeCountryCode('United States'), 'US');
  assert.equal(normalizeCountryCode('usa'), 'US');
  assert.equal(normalizeCountryCode('UK'), 'GB');
  assert.equal(normalizeCountryCode('Great Britain'), 'GB');
  assert.equal(normalizeCountryCode('Canada'), 'CA');
});

test('derives flags from ISO country codes instead of storing them', () => {
  assert.equal(countryFlag('US'), '🇺🇸');
  assert.equal(countryFlag('gb'), '🇬🇧');
  assert.equal(countryFlag('not a country'), '');
});

test('keeps compact city, region, and country formatting guardrails', async () => {
  const source = await readFile('src/lib/location.ts', 'utf8');

  assert.ok(source.includes("const compactRegionCountries = new Set(['US', 'CA', 'AU']);"));
  assert.ok(source.includes('return `${city}, ${regionLabel} ${flag}`.trim();'));
  assert.ok(source.includes('return `${city} ${flag}`.trim();'));
  assert.ok(source.includes('const flag = countryFlag(countryCode);'));
});

test('keeps seeded location catalog entries separate from custom locations', async () => {
  const source = await readFile('src/lib/location.ts', 'utf8');

  assert.ok(source.includes('const id = parts.id || parts.catalogId || customLocationId(city, region, countryCode, label);'));
  assert.ok(source.includes('catalogId: parts.catalogId ?? null,'));
  assert.ok(source.includes('return location?.catalogId ?? null;'));
  assert.ok(source.includes('locationCatalog.find((option) => option.id === parts.id || option.catalogId === parts.id)'));
});

test('keeps opportunity location display remote-friendly and arrangement-aware', async () => {
  const source = await readFile('src/lib/location.ts', 'utf8');

  assert.ok(source.includes("if (workplace === 'remote')"));
  assert.ok(source.includes("return option?.label ? `Remote, ${option.label}` : 'Remote';"));
  assert.ok(source.includes('return `${arranged} · ${option.label}`;'));
  assert.ok(source.includes("workplace === 'in_person' ? 'In person'"));
});
