import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('package metadata does not include the accidental undefined dependency', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const packageLock = await readFile('package-lock.json', 'utf8');

  assert.equal(packageJson.dependencies?.undefined, undefined);
  assert.doesNotMatch(packageLock, /"node_modules\/undefined"|"undefined":\s*"\.npm-cache"/);
});

test('Settings exposes the current dark appearance truth without staged controls', async () => {
  const source = await readFile('app/profile/settings.tsx', 'utf8');

  assert.doesNotMatch(source, /SegmentedSetting|segmentSoon|Staged|Coming soon|Not available yet/);
  assert.match(source, /value="Dark"/);
  assert.doesNotMatch(source, /value="Light"/);
});

test('creator-facing create and profile code uses opportunity naming', async () => {
  const createStudio = await readFile('src/components/create/CreateStudio.tsx', 'utf8');
  const createTab = await readFile('app/(tabs)/create.tsx', 'utf8');
  const profileHub = await readFile('src/components/profile/ProfileOwnerHub.tsx', 'utf8');

  assert.match(createStudio, /Post an opportunity/);
  assert.match(createStudio, /New opportunity/);
  assert.doesNotMatch(createStudio, /onJob|onManageJobs|kind: 'job'|tone="job"/);
  assert.doesNotMatch(createStudio, /Project profile|onProject|tone="project"/);
  assert.doesNotMatch(createTab, /onJob|onManageJobs/);
  assert.doesNotMatch(createTab, /newBusinessFor\('project'\)/);
  assert.doesNotMatch(profileHub, /onJobs/);
});
