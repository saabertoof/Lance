# Lance

Lance is a mobile-first platform for discovering people and opportunities, structured search, and direct communication. Lance does not employ users, process payments, hold escrow, manage contracts, or guarantee compensation.

## Phase 3

Phase 3 includes:

- Supabase authentication, onboarding, profiles, profile editing, and avatars.
- Optional business and project profiles.
- Business logo uploads.
- Business creation, viewing, editing, management, sharing, and archiving.
- A functional Create tab.
- Personal and business posting identities.
- Seven-step opportunity creation using React Hook Form and Zod validation.
- Draft, preview, publish, edit, pause, resume, close, archive, and draft-delete flows.
- My Businesses and My Opportunities management screens.
- Reusable native business and opportunity cards.
- Structured fields and indexes for future Discover, Search, filters, and AI-assisted search.

Discover, Search, and Messages remain placeholders. Phase 3 does not implement swiping, real search, filters, AI, applications, likes, matches, message requests, direct messages, payments, contracts, reviews, verification, or premium features.

## Requirements

- Node.js LTS
- npm
- Expo Go
- A Supabase project with migrations `0001`, `0002`, and `0003` already applied

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
6. Confirm insert, update, and delete policies require the first folder to match `auth.uid()`.
7. Confirm the second folder must be a business owned by that user.

No manual bucket creation is needed if the migration succeeds.

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
4. Complete all required fields.
5. Select a JPEG, PNG, or WebP logo under 5 MB.
6. Create the business.
7. Verify its detail screen, links, owner name, and placeholder share action.
8. Edit the description or location.
9. Return to **Profile > My businesses and projects**.
10. Confirm active and draft opportunity counts.
11. Archive the business and confirm it becomes read-only.

## Opportunity Phone Test

1. Open **Create > Post an opportunity**.
2. Select **My personal profile**.
3. Complete all seven steps.
4. Save as a draft.
5. Open **My Opportunities** and reopen the draft.
6. Add or change fields and preview it.
7. Accept the Lance disclaimer and publish.
8. Test the placeholder share action.
9. Repeat using an active business as the posting identity.
10. Confirm the business logo and name appear on the card and detail screen.

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

The final five denial checks are best performed with a second test client or Supabase API request using Account B's access token.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run expo:config
```

There is no automated test suite configured. Database-backed business, opportunity, Storage, sharing, and cross-user RLS flows require migration `0004` and phone testing.

## Checkpoints

- Phase 1: `629773a`
- Phase 2: `a5ef0f8`

No OpenAI API key or external search service is used.
