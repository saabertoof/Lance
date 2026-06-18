# Lance

Lance is a mobile-first discovery, search, and messaging platform for adults who want to find people, freelance work, collaborators, businesses, services, and opportunities.

Lance helps users discover, search, connect, and communicate. It does not employ users, process payments, run payroll, hold escrow, manage contracts, or guarantee compensation.

## Phase 2

Phase 2 includes:

- Email/password authentication with persisted Supabase sessions.
- Protected routing based on authentication and onboarding completion.
- Six-step personal onboarding.
- Structured personal profiles with normalized skills and opportunity interests.
- Optional avatar selection and Supabase Storage upload.
- Personal profile viewing and editing.
- Discover, Search, Create, and Messages placeholders.
- Bottom navigation: Discover, Search, Create, Messages, Profile.

Phase 2 does not include real search, businesses, opportunity posting, swiping, likes, matches, messaging, payments, subscriptions, or AI features.

## Requirements

- Node.js LTS
- npm
- Expo Go on an iOS or Android phone
- A Supabase project

On this Windows machine, use `npm.cmd` if PowerShell blocks `npm`.

## Environment

The root `.env` file must sit beside `package.json` and contain:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
EXPO_PUBLIC_USE_RN_FETCH=1
```

Use only the public publishable key. Never put a service-role or secret key in the mobile app.

Restart Expo with a cleared cache after changing `.env`:

```bash
npm.cmd run start -- --clear
```

## Database Migration

The Phase 1 migrations must already be applied:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_rls_policies.sql`

For Phase 2:

1. Open the Supabase dashboard.
2. Select the Lance project.
3. Open **SQL Editor**.
4. Open `supabase/migrations/0003_onboarding_and_profiles.sql` locally.
5. Paste the full migration into a new SQL query.
6. Run it once.
7. Confirm it finishes without errors.

Do not rerun or edit the already-applied `0001` and `0002` files.

## What Migration 0003 Adds

- Revised intent, experience, availability, and opportunity-interest enum values.
- Structured `industry_experience` on profiles.
- `user_preferences` for the primary onboarding intent.
- `profile_opportunity_interests` for multi-select work preferences.
- Search-oriented indexes for names, locations, industries, and interests.
- A transactional `save_my_profile` function.
- An `avatars` Storage bucket limited to JPEG, PNG, or WebP files up to 5 MB.

### Important RLS Protections

- Users can manage only their own preferences and opportunity interests.
- Profile opportunity interests are readable by authenticated users for future discovery.
- Users may add normalized skill names, but cannot edit or delete the shared skill catalog.
- The profile save function still runs through the signed-in user's RLS permissions.
- Avatar files are publicly readable, but authenticated users can upload, replace, or delete files only inside their own user-ID folder.
- Existing profile, link, and profile-skill ownership policies from `0002` remain unchanged.

## Storage Verification

Migration `0003` creates the bucket and policies. In Supabase, verify:

1. Open **Storage**.
2. Confirm the `avatars` bucket exists.
3. Confirm it is public.
4. Confirm the file-size limit is 5 MB.
5. Confirm allowed MIME types are JPEG, PNG, and WebP.
6. In **Policies**, confirm avatar upload, update, and delete operations require the first folder name to equal the authenticated user's ID.

No manual bucket creation is needed if the migration succeeds.

## Run

```bash
npm.cmd install
npm.cmd run start -- --clear
```

Scan the QR code with Expo Go while the phone and computer are on the same network.

## Reset Onboarding

To send one existing account through onboarding again:

1. Open Supabase **Table Editor**.
2. Open `profiles`.
3. Find the profile by username or user ID.
4. Set `onboarding_completed_at` to `NULL`.
5. Fully reload Lance in Expo Go.

The existing profile data remains and will prefill onboarding.

The equivalent SQL is:

```sql
update public.profiles
set onboarding_completed_at = null
where id = 'USER_UUID_HERE';
```

## Checks

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run expo:config
```

There is no automated test suite configured yet. The onboarding, profile editing, storage policies, session persistence, and cross-user RLS behavior require phone and Supabase testing after migration `0003` is applied.

## Project Notes

- `.env` and local Expo/npm caches are ignored by Git.
- `_codex_inspect/` contains supplied reference material and is ignored.
- The Phase 1 checkpoint commit is `629773a`.
- No OpenAI API key or external search service is used.
