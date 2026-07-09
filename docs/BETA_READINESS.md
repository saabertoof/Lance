# Lance Beta Readiness

This pass hardens the creator opportunity-link loop:

1. A creator drafts and publishes an opportunity.
2. A visitor opens the public link without signing in.
3. Signup, login, and onboarding preserve the opportunity destination.
4. The applicant reviews a reusable profile before sending.
5. Duplicate and rapid submissions remain server-controlled.
6. The creator reviews applicants and can begin a linked conversation.
7. Private owner analytics show views, application starts, and real applications.

## Apply Migration 0012

Apply `0012_beta_reliability_observability.sql` once after `0011`.

1. Open the Supabase dashboard.
2. Open **SQL Editor**.
3. Open `supabase/migrations/0012_beta_reliability_observability.sql`.
4. Paste the complete file into a new query.
5. Run the query once.
6. Do not rerun migrations `0001` through `0011`.

Migration `0012` adds:

- Privacy-safe opportunity view and application-start events.
- Hourly view deduplication and ten-minute start deduplication.
- Owner-only aggregate opportunity funnel summaries.
- Authenticated, sanitized, rate-limited client error reports.
- RLS with no direct client access to either raw telemetry table.

It does not store IP addresses, emails, application notes, profile content,
search history, device fingerprints, or Supabase credentials.

## Supabase Auth Redirects

Signup confirmation now preserves the intended opportunity route.

In **Authentication > URL Configuration > Redirect URLs**, add:

```text
lance://onboarding
```

When testing confirmation inside Expo Go, also add the exact Expo development
redirect printed for the app. It normally resembles:

```text
exp://YOUR-LAN-IP:8081/--/onboarding
```

Do not use a wildcard broader than your own development host. Preview and
production builds should use the `lance://onboarding` scheme.

## Two-Account Core-Loop Test

Use Account A as the creator and Account B as the applicant.

1. Account A starts a new opportunity, enters a title, then exits before saving.
2. Reopen Create and confirm the local recovery card appears.
3. Continue the draft, publish it, and copy the public link.
4. Open the link in a signed-out browser and confirm it renders.
5. Tap Apply and create or sign into Account B.
6. Confirm login/onboarding returns to the original opportunity.
7. Open Apply and wait for the reusable profile to reach the ready state.
8. Submit once and confirm the button changes to **Application sent**.
9. Attempt the same application again and confirm no duplicate row appears.
10. Account A opens Applicants and sees exactly one applicant.
11. Account A starts a discussion and confirms one linked conversation exists.
12. Exchange messages and verify unread state clears after opening the chat.
13. Open the opportunity as Account A and verify Link performance is visible.

## Failure Tests

1. Open an opportunity, then enable airplane mode.
2. Confirm the global offline banner appears.
3. Confirm Apply, signup, login, publish, and message sending cannot transmit.
4. Confirm typed message and unfinished opportunity content remain visible.
5. Reconnect and use Retry where shown.
6. Force-close during a new opportunity, reopen Create, and confirm recovery.
7. Rapidly tap Send application and verify only one response exists.
8. Rapidly tap Send message and verify the client nonce prevents duplicates.
9. Pause, close, expire, and archive opportunities; verify public links fail closed.

## RLS and Abuse Checks

With Account B's authenticated session:

- Directly selecting `opportunity_funnel_events` must fail.
- Directly selecting `client_error_reports` must fail.
- Requesting Account A's funnel summary must fail.
- Recording a funnel event for a draft, paused, closed, expired, or deleted
  opportunity must create no event.
- Recording unsupported event names must fail.
- Applying to Account B's own opportunity must fail.
- Applying to the same opportunity twice must fail.
- Applying after a block must fail.

The Supabase dashboard may inspect telemetry as an administrator. The mobile
client cannot read raw telemetry.

## Internal Preview Build

No remote build was started by this pass.

Before the first preview build:

1. Choose permanent identifiers and add them to `app.json`:

```json
{
  "ios": {
    "bundleIdentifier": "com.yourcompany.lance"
  },
  "android": {
    "package": "com.yourcompany.lance"
  }
}
```

Replace `yourcompany` with a permanent domain-style identifier you control.

2. Install and authenticate EAS CLI.
3. Link the project with `eas init`.
4. Store environment values in EAS, not in Git.
5. Build with:

```powershell
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

The preview profile uses internal distribution. Android produces an installable
APK. iOS requires Apple signing and registered test devices.

## Monitoring

Authenticated JavaScript failures are sanitized and written through
`record_client_error`. The global error boundary provides an in-app recovery
screen for render failures.

This does not capture native fatal crashes. Add Sentry only when Lance moves
from Expo Go to preview builds, then store `SENTRY_AUTH_TOKEN` as a protected
EAS secret. Never place that token in `.env`, `app.json`, SQL, or client code.
