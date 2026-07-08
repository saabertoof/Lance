import assert from 'node:assert/strict';
import test from 'node:test';

import { formatAuthError } from '../src/lib/authErrors.ts';
import {
  authRoute,
  normalizeInternalNext,
} from '../src/lib/authNavigation.ts';

test('keeps valid post-auth destinations inside Lance', () => {
  assert.equal(normalizeInternalNext('/o/creator-editor?source=share'), '/o/creator-editor?source=share');
  assert.equal(normalizeInternalNext(['/profile/member-id']), '/profile/member-id');
  assert.equal(normalizeInternalNext('/login'), null);
  assert.equal(normalizeInternalNext('//example.com/steal-session'), null);
  assert.equal(normalizeInternalNext('https://example.com'), null);
});

test('builds auth routes that preserve a safe destination', () => {
  assert.deepEqual(authRoute('/signup', '/o/creator-editor'), {
    pathname: '/signup',
    params: { next: '/o/creator-editor' },
  });
  assert.equal(authRoute('/login'), '/login');
});

test('turns common auth failures into useful product copy', () => {
  assert.equal(
    formatAuthError({
      name: 'AuthApiError',
      message: 'Invalid login credentials',
    }),
    'Email or password is incorrect.',
  );
  assert.equal(
    formatAuthError({
      name: 'AuthRetryableFetchError',
      message: 'Network request failed',
    }),
    'AuthRetryableFetchError: Network request failed',
  );
});
