# Lance

Lance is a mobile-first platform for discovering people and opportunities, structured search, and direct communication. Lance does not employ users, process payments, hold escrow, manage contracts, or guarantee compensation.

## Phase 4

Phase 4 preserves the Phase 1-3.5 product and adds:

- Supabase authentication, onboarding, profiles, profile editing, and avatars.
- Optional business and project profiles.
- Reliable business creation with business and logo outcomes handled separately.
- Live Lance URL normalization, preview, availability checks, and suggestions.
- Business logo uploads protected by owner-scoped Storage policies.
- Business creation, viewing, editing, management, sharing, and archiving.
- A functional Create tab.
- Personal and business posting identities.
- Seven-step opportunity creation with native Expo Go-compatible date pickers.
- Draft, preview, publish, edit, pause, resume, close, archive, and draft-delete flows.
- My Businesses and My Opportunities management screens.
- Clickable profile social icons and consistent success feedback.
- An owner-only Interested talent placeholder.
- Reusable native business and opportunity cards.
- Structured fields and indexes for future Discover, Search, filters, and AI-assisted search.
- Tinder-style Discover for real people and published opportunities.
- Left-swipe Pass behavior that lasts only for the current Discover session.
- Right-swipe private Save behavior with visible Pass and Save alternatives.
- Real paginated People, Opportunity, and Business search.
- Structured filters using normalized profile and opportunity data.
- Private saved People and Opportunities with a Saved screen under Profile.

Messages remains a placeholder. Phase 4 does not implement likes, expressions of interest,
matches, applications, interested-talent records, message requests, direct messages, AI,
payments, contracts, reviews, verification, notifications, or premium features.

## Requirements

- Node.js LTS
- npm
- Expo Go
- A Supabase project with migrations `0001` through `0005` already applied

On this Windows machine, use `npm.cmd` if PowerShell blocks `npm`.

## Environment

The root `.env` file belongs beside `package.json`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
EXPO_PUBLIC_USE_RN_FETCH=1
```

Use only the public publishable key. Never add a service-role or secret key to the mobile client.

## Apply Migration 0004

Do not edit or rerun the already-applied migrations.

1. Open your Supabase project.
2. Open **SQL Editor**.
3. Open `supabase/migrations/0004_businesses_and_opportunities.sql` locally.
4. Paste the entire file into a new SQL query.
5. Run it once.
6. Confirm the query completes without an error.

Migration `0004`:

- Extends the existing `businesses` and `opportunities` tables.
- Reuses `business_members`, `skills`, and `opportunity_skills`.
- Adds structured business type, size, industry, links, and archive fields.
- Adds structured opportunity work, compensation, arrangement, commitment, experience, date, and lifecycle fields.
- Adds case-insensitive slug indexes.
- Validates posting identity and ownership.
- Enforces allowed opportunity status transitions.
- Allows permanent deletion only for drafts.
- Requires at least one skill and disclaimer acceptance before publishing.
- Creates the `business-assets` Storage bucket and logo policies.

## Apply Migration 0005

Apply this migration after `0004`. Do not modify or rerun migrations `0001` through `0004`.

1. Open your Supabase project.
2. Open **SQL Editor**.
3. Open `supabase/migrations/0005_phase_3_5_business_creation_fix.sql` locally.
4. Paste the entire file into a new SQL query.
5. Run it once.
6. Confirm the query completes without an error.

Migration `0005`:

- Adds a safe URL-availability function that checks active and archived businesses.
- Keeps business URL uniqueness details private while returning only available or unavailable.
- Adds a security-definer ownership helper for business logo paths.
- Replaces only the three owner logo policies from `0004`.
- Keeps RLS enabled and does not grant client access to any service-role capability.

## Apply Migration 0006

Apply this migration once after `0005`. Do not modify or rerun migrations `0001` through `0005`.

1. Open your Supabase project.
2. Open **SQL Editor**.
3. Open `supabase/migrations/0006_phase_4_discover_search_saves.sql` locally.
4. Paste the entire file into a new SQL query.
5. Run it once.
6. Confirm it completes without an error.

Migration `0006`:

- Reuses the existing `saved_profiles` and `saved_opportunities` tables.
- Splits save RLS into private read, validated insert, and owner-only delete policies.
- Prevents saving yourself, owned opportunities, drafts, expired records, and unavailable targets.
- Adds owner/date, discovery, and text-search indexes.
- Adds parameterized `SECURITY INVOKER` search functions for People, Opportunities, and Businesses.
- Uses existing RLS inside every search function; no service-role or bypass access is granted.
- Centralizes clearly-paid filtering around guaranteed numeric compensation.

## Posting Identity Model

Every opportunity stores the signed-in creator in `owner_profile_id`.

- Personal post: `posted_as_business = false` and `business_id = NULL`.
- Business post: `posted_as_business = true` and `business_id` references a business owned by `owner_profile_id`.

RLS and a database trigger prevent users from posting as another person or another user's business.

## Important Security Policies

### Businesses

- Authenticated users may read active businesses.
- Owners may read their own archived businesses.
- Only the owner may insert, update, archive, or delete their business row.
- A business owner membership row is created automatically.

### Opportunities

- Authenticated users may read published opportunities.
- Owners may read all their own drafts, paused, closed, and archived opportunities.
- Inserts and updates must use the signed-in user's `owner_profile_id`.
- Business posts require ownership of the referenced active business.
- Only owners may update lifecycle status or delete drafts.
- Database triggers reject invalid posting identities and lifecycle transitions.

### Business Logos

- Logos are publicly readable.
- Uploads require authentication.
- The ownership helper reads only the signed-in user ID and path.
- Users may upload, replace, or delete only inside:

```text
business-assets/{owner_user_id}/{business_id}/
```

## Storage Verification

Migration `0004` creates the bucket automatically. In Supabase:

1. Open **Storage**.
2. Confirm `business-assets` exists.
3. Confirm it is public.
4. Confirm the file-size limit is 5 MB.
5. Confirm allowed MIME types are JPEG, PNG, and WebP.
6. Confirm insert, update, and delete policies call `can_manage_business_asset(name)`.
7. Confirm the first folder matches `auth.uid()` and the second folder is an owned business.

No manual bucket creation is needed if the migration succeeds.

### Saved Items

- Only the signed-in user can read their saved rows.
- Only the signed-in user can insert or delete their own saved rows.
- Saves are private and create no notifications, interest records, matches, or messages.
- A save never grants access to a target that RLS would otherwise hide.
- Database primary keys prevent duplicate saves.

## Run

```powershell
npm.cmd install
npm.cmd run start -- --clear
```

Scan the QR code using Expo Go while the phone and computer are on the same network.

## Business Phone Test

1. Log in and complete onboarding.
2. Open **Create**.
3. Tap **Create a business or project**.
4. Enter a Lance URL and wait for the available confirmation.
5. Select a JPEG, PNG, or WebP logo under 5 MB.
6. Create the business.
7. Verify only one business was created and that the detail screen opens.
8. Edit the description or location.
9. Change the Lance URL and confirm availability excludes the current business.
10. Open **Interested talent** and confirm the polished empty state.
11. Return to **Profile > My businesses and projects**.
12. Confirm active and draft opportunity counts.
13. Archive the business and confirm it becomes read-only.

To test the separated logo warning, temporarily make the logo upload fail while leaving
business inserts available. The app should navigate to the single created business and show:
`Business saved, but the logo upload failed. You can retry it from Edit Business.`

## Opportunity Phone Test

1. Open **Create > Post an opportunity**.
2. Select **My personal profile**.
3. Complete all seven steps.
4. Save as a draft.
5. Open **My Opportunities** and reopen the draft.
6. Choose expected-start and expiration dates using the system date picker.
7. Clear each optional date and choose it again.
8. Confirm an expiration date cannot be earlier than the expected start date.
9. Save, reopen, and confirm both dates persisted.
10. Accept the Lance disclaimer and publish.
11. Test the placeholder share action.
12. Repeat using an active business as the posting identity.
13. Confirm the business logo and name appear on the card and detail screen.

## Phase 4 Phone Test

1. Apply migration `0006`, restart Expo with a cleared cache, and sign in.
2. Open Discover and switch between People and Opportunities.
3. Swipe left and confirm the card passes without creating a saved item.
4. Swipe right and confirm the card is saved and advances.
5. Repeat with the visible Pass and Save buttons.
6. Tap a card and confirm the correct profile or opportunity detail opens.
7. Open Search and test People, Opportunities, and Businesses.
8. Apply and clear filters in each mode.
9. Confirm drafts, paused, closed, archived, deleted, and expired opportunities do not appear.
10. Confirm archived businesses do not appear.
11. Save and unsave profiles and opportunities from Search and detail screens.
12. Open **Profile > Saved people and opportunities**.
13. Confirm saved state persists after closing and reopening the app.
14. Pull down on Saved to refresh.

## Lifecycle Test

1. Publish an opportunity.
2. Pause it.
3. Resume it.
4. Close it.
5. Archive it.
6. Confirm archived opportunities remain visible to the owner.
7. Create another draft and permanently delete it.
8. Confirm published or closed records cannot be permanently deleted.

## Cross-User RLS Test

Use two real Supabase accounts:

1. Account A creates a business and both a draft and published opportunity.
2. Account B signs in.
3. Confirm B can read A's active business.
4. Confirm B can read A's published opportunity.
5. Confirm B cannot read A's draft.
6. Attempt to update A's business using B's session; Supabase should deny it.
7. Attempt to create an opportunity with B as creator and A's business ID; Supabase should deny it.
8. Attempt to update, pause, close, archive, or delete A's opportunity; Supabase should deny it.
9. Confirm B cannot upload a logo into A's owner/business folder.
10. Account A saves one profile and one opportunity.
11. Confirm Account B cannot read, insert, or delete Account A's saved rows.
12. Confirm saving creates no opportunity interest, match, message, or notification row.

The final five denial checks are best performed with a second test client or Supabase API request using Account B's access token.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run expo:config
```

There is no automated test suite configured. Database-backed Discover, Search, filters, saves,
Storage, and cross-user RLS flows require migrations `0004` through `0006` plus phone testing.

## Checkpoints

- Phase 1: `629773a`
- Phase 2: `a5ef0f8`
- Phase 3: `8d7639d`
- Phase 3.5: `1bfe862`

No OpenAI API key or external search service is used. Phase 5 has not started.
