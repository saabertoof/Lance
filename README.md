# Lance

Lance is a mobile-first matching app for people and opportunities to build with. Phase 1 contains only the foundation: Expo, routing, theme, auth screens, Supabase setup, protected tabs, reusable UI, and database migrations.

Lance does not manage hiring, employment, contracts, payroll, escrow, or payments.

## What Is Built In Phase 1

- Expo React Native app with TypeScript and Expo Router.
- Lance logo assets in `assets/images`.
- Central theme in `src/constants/theme.ts`.
- Reusable UI components in `src/components/ui`.
- Login, signup, and reset password screens.
- Supabase client using public environment variables.
- Persisted Supabase auth session structure.
- Protected bottom tabs for Discover, Connections, Create, Messages, and Profile.
- Initial Supabase SQL migrations with Row Level Security.
- Placeholder screens only. Onboarding, swiping, matching, opportunity creation, and messaging are intentionally not built yet.

## Requirements

- Node.js LTS.
- npm.
- Expo Go on your phone if you want to preview on a device.
- A Supabase project when you are ready to test real authentication.

This Windows machine can run npm through `npm.cmd`. If PowerShell blocks `npm`, use `npm.cmd` in the commands below.

## Install

Dependencies are already installed by Codex. If you need to reinstall later:

```bash
npm.cmd install
```

## Environment Variables

Create a local `.env` file by copying `.env.example`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

Use only the public publishable key. Do not use the Supabase service-role key in this app.

The app includes placeholder Supabase values so it can scaffold and start without your real project. Login, signup, and password reset require real Supabase values.

## Run The App

```bash
npm.cmd run start
```

This opens the Expo development server. Press `a` for Android emulator, `i` for iOS simulator on macOS, or scan the QR code with Expo Go on your phone.

## Open On Your Phone With Expo Go

1. Install Expo Go from the iOS App Store or Google Play.
2. Run `npm.cmd run start`.
3. Make sure your phone and computer are on the same Wi-Fi network.
4. Scan the QR code shown in the terminal or browser.
5. The app should open to the Lance login screen.

## Supabase Setup

When you are ready to use real authentication:

1. Create a Supabase project.
2. Enable email/password auth in Supabase Authentication settings.
3. Run the migrations in order:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
4. Put your Supabase URL and public publishable key in `.env`.
5. Restart Expo after changing `.env`.

## Important RLS Protections

- Profiles: users can read visible profiles, but only create or edit their own profile.
- Links and portfolio items: public items are visible; matches-only items require an active match.
- Businesses: only the owner can create, update, or delete a business.
- Opportunities: published opportunities are readable; only the owner can manage drafts and postings.
- Swipes: users can only create swipes from their own account.
- Opportunity interest: interested users and opportunity owners can see the interest record.
- Matches: users can only read matches they participate in; creating matches requires mutual interest or accepted opportunity interest.
- Conversations and messages: only conversation members can read messages; active blocks prevent sending new messages.
- Saved items, blocks, notifications, and terms acceptances: users manage only their own records.
- Reports: users can submit reports and read their own submissions. Admin review can happen manually in Supabase.

## Checks

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run expo:config
```

There are no tests configured yet because Phase 1 has no business logic-heavy flows. Tests should be added as onboarding, discovery, matching, and messaging are implemented.

## Project Notes

- `_codex_inspect/` contains the original uploaded design/reference pack and is ignored by Git.
- `_expo_scaffold/` is an empty temporary scaffold folder left behind because the safety layer blocked deleting it. It is ignored by Git and can be removed manually later.
- `.npm-cache/` and `.expo-home/` are local tool caches and are ignored by Git.
