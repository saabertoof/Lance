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
  const preferences = await readFile('src/lib/settingsPreferences.ts', 'utf8');

  assert.doesNotMatch(source, /SegmentedSetting|segmentSoon|Staged|Coming soon|Not available yet/);
  assert.match(source, /value="Dark"/);
  assert.doesNotMatch(source, /value="Light"/);
  assert.match(preferences, /SUPPORTED_APPEARANCE_MODES: AppearanceMode\[\] = \['dark'\]/);
  assert.match(preferences, /appearanceMode: 'dark'/);
});

test('auth success messages only appear after successful requests', async () => {
  const signup = await readFile('app/(auth)/signup.tsx', 'utf8');
  const reset = await readFile('app/(auth)/reset-password.tsx', 'utf8');

  assert.doesNotMatch(signup, /isSubmitSuccessful/);
  assert.match(signup, /setConfirmationSent\(true\)/);
  assert.doesNotMatch(reset, /isSubmitSuccessful/);
  assert.match(reset, /setResetSent\(true\)/);
});

test('profile gate distinguishes a network failure from incomplete onboarding', async () => {
  const authContext = await readFile('src/context/AuthContext.tsx', 'utf8');

  assert.match(authContext, /OnboardingStatus = 'complete' \| 'error' \| 'incomplete' \| 'loading'/);
  assert.match(authContext, /setOnboardingStatus\('error'\)/);
});

test('request sheets clear drafts when their target changes or closes', async () => {
  const connectSheet = await readFile('src/components/communication/ConnectSheet.tsx', 'utf8');
  const applySheet = await readFile('src/components/communication/ExpressInterestSheet.tsx', 'utf8');
  const safetySheet = await readFile('src/components/communication/SafetySheet.tsx', 'utf8');

  assert.match(connectSheet, /\[profile\?\.id, visible\]/);
  assert.match(connectSheet, /setNote\(''\)/);
  assert.match(applySheet, /\[opportunity\?\.id, visible\]/);
  assert.match(applySheet, /setSelectedSkillIds\(\[\]\)/);
  assert.match(applySheet, /setAcknowledged\(false\)/);
  assert.match(safetySheet, /\[targetId, targetKind, visible\]/);
  assert.match(safetySheet, /setDetails\(''\)/);
});

test('relationship actions verify current server state before opening a request sheet', async () => {
  const relationshipAction = await readFile('src/components/communication/RelationshipAction.tsx', 'utf8');
  const opportunityAction = await readFile('src/components/communication/OpportunityInterestAction.tsx', 'utf8');

  assert.match(relationshipAction, /useState\(false\)/);
  assert.match(relationshipAction, /setHasLoaded\(false\)/);
  assert.match(opportunityAction, /useState\(false\)/);
  assert.match(opportunityAction, /setHasLoaded\(false\)/);
});

test('conversation drafts cannot carry into a different recipient', async () => {
  const conversation = await readFile('app/messages/[id].tsx', 'utf8');

  assert.match(conversation, /setDraft\(''\)/);
  assert.match(conversation, /setMessages\(\[\]\)/);
  assert.match(conversation, /\}, \[id\]\);/);
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
