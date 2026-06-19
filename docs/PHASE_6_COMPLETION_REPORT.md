# Lance Phase 6 Completion Report

## 1. Starting point

- Git root: `C:\Users\benhi\OneDrive - nd.edu\Documents\Lance`
- Phase 5.5 checkpoint: `2b157e9 complete Phase 5.5 DM and Create Studio redesign`
- Starting worktree: clean
- Migrations `0001` through `0008`: unchanged from the Phase 5.5 checkpoint

## 2. Phase 6 summary

Phase 6 adds:

- Ask Lance inside the live Search tab
- Natural-language parsing into a strict `SearchPlanV1`
- One optional clarification
- Editable interpreted filter chips
- Existing real People, Job, and Business search execution
- Deterministic match reasons
- Saved searches for People, Jobs, and Businesses
- Daily, Weekly, and Paused in-app Job alerts
- Saved-search and Job-alert management
- A paginated Job alert inbox
- A real unread Search-tab badge
- Server-enforced Ask Lance rate limits
- A secret-authenticated, idempotent alert worker
- Migration `0009`

No Phase 7 work was started.

## 3. Ask Lance architecture

### Stage A: parse

`supabase/functions/ask-lance/index.ts`:

- Requires a signed-in Supabase user.
- Enforces input length and database-backed rate limits.
- Applies deterministic protected-trait and prompt-injection checks.
- Calls `POST https://api.openai.com/v1/responses`.
- Uses strict Structured Outputs through `text.format`.
- Uses the model named by `OPENAI_SEARCH_MODEL`.
- Sets `store: false`.
- Validates and normalizes the returned plan.
- Returns only the plan, a request ID, and an optional safety notice.

It does not load or send Lance profiles, Jobs, businesses, messages, requests,
or other result records to OpenAI.

### Stage B: execute

The Expo app maps the validated plan into the existing Search state and calls:

- `searchPeople`
- `searchOpportunities`
- `searchBusinesses`

Those services retain the existing RLS-readable record loaders, public
eligibility checks, pagination, block exclusions, cards, Save, Connect, and
Apply behavior. The model never supplies SQL, RPC names, record IDs, or result
cards.

## 4. Responses API and Structured Outputs

The request uses:

- Configurable `OPENAI_SEARCH_MODEL`
- `text.format.type = json_schema`
- `strict = true`
- `additionalProperties = false` on every object
- Required properties at every object level
- Bounded strings and arrays
- Allow-listed enums
- `max_output_tokens = 1200`
- A 15-second timeout
- At most one safe retry
- `store = false`

If either OpenAI secret is absent, normal Search still works and the user sees
a friendly unavailable message.

## 5. SearchPlanV1

Common fields:

- Schema version
- Target type: People, Jobs, or Businesses
- Intent summary
- Bounded keywords
- Bounded location terms
- Sort
- Clarification state and question
- Ignored unsafe constraints
- Confidence

People filters:

- Primary role
- Skills
- Industries
- Experience
- Availability
- Remote preference
- Opportunity interests
- Future-facing current intents

Job filters:

- Category
- Required skills
- Industry
- Compensation type
- Clearly paid only
- Work type
- Work arrangement
- Time commitment
- Experience level
- Future-facing posting identity
- Newest only

Business filters:

- Business type
- Business size
- Industry
- Remote status
- Has active Jobs

`current_intents` and `posting_identity_types` remain versioned in the schema
for later search work, but Phase 6 normalization clears them because the
existing Phase 4 Search RPCs do not execute them. This prevents the UI from
claiming a filter was applied when it was not.

## 6. Catalog normalization

Normalization uses:

- Curated local skills
- Curated local industries
- The structured local location catalog
- RLS-readable custom rows from `skills`
- RLS-readable custom rows from `industry_catalog`
- A small bounded alias map

Unknown useful skill or industry terms become bounded keywords. Ask Lance does
not create new global catalog values. Catalog rows are used only by the Edge
Function for normalization and are not sent to OpenAI.

## 7. Safety

Deterministic checks reject or remove:

- Protected race or ethnicity constraints
- Religion constraints
- Sex, gender, or sexual-orientation constraints
- Disability, health, and pregnancy constraints
- Exact-age constraints
- Political and union constraints
- Prompt requests for system instructions
- Requests for API keys or private data
- SQL generation or RLS bypass requests
- URLs, UUIDs, SQL fragments, and unknown plan properties

The model instructions repeat these limits, but server validation is the
authoritative boundary.

## 8. Clarification and interpreted filters

- Clear requests make one parse call.
- Ambiguous requests can ask one short clarification.
- The answer makes one additional parse call.
- There is no chat thread or assistant conversation.
- The resulting filters appear under "Lance understood."
- Each interpreted chip can be removed.
- The normal filter sheet can edit the same search state.
- Chip and filter edits rerun normal Search without another model call.
- Ignored protected constraints display calm explanatory copy.

## 9. Real results and match reasons

Results reuse the existing:

- `PersonCard`
- `OpportunityCard`
- `BusinessCard`
- `RelationshipAction`
- `OpportunityInterestAction`

Match reasons come only from loaded record fields, such as:

- Matching selected skills
- Matching work arrangement
- Matching location
- Paid-only filter
- Active Jobs

No match percentages or "perfect match" claims are generated.

## 10. Privacy, limits, and cost controls

- Unsaved raw Ask Lance queries remain in screen state only.
- A raw query is stored only when the user explicitly saves the search.
- `ask_lance_usage` stores bounded operational metadata without the prompt.
- The function does not log raw queries, tokens, keys, or full OpenAI bodies.
- Each response includes a request ID for diagnostics.
- Limit: 20 parses per rolling 24 hours per user.
- Burst limit: 5 parses per minute per user.
- Clarification reparses count as another request.
- Maximum query length: 500 characters.
- Maximum clarification length: 300 characters.
- Recurring alerts never call OpenAI.

## 11. Saved searches

The Search tab can save the current normal or Ask Lance search. The management
screen supports:

- People, Job, and Business searches
- Suggested names
- Rename
- Run again
- Delete
- Summary chips
- Last opened date
- Job alert frequency
- New-match inbox access

Running a saved search restores its validated plan into the live Search tab.

## 12. Job alert scope

Automated alerts are Job-only. People and Business searches can be saved for
quick reuse but cannot enable recurring alerts. This avoids privacy problems
and gives Jobs a clear `published_at` baseline.

When an alert is enabled:

- The baseline is set to the current time.
- Existing Jobs do not flood the inbox.
- Only newly published eligible Jobs are considered.
- Pausing and resuming resets a safe current baseline.
- Delivery uses UTC-based daily or weekly intervals.

## 13. Alert matching and deduplication

The worker matches only Jobs that are:

- Published
- Unexpired
- Not deleted
- Not owned by the alert owner
- Posted by an active, onboarded, non-deleted profile
- Not tied to an inactive or deleted business
- Not blocked
- Published after the last successful baseline
- Deterministically matched by the stored plan

The unique `(saved_search_id, opportunity_id)` constraint prevents duplicates.
The worker is safe to retry.

## 14. Scheduling

`process-search-alerts`:

- Accepts no user ID, saved-search ID, or raw plan from the request.
- Requires `ALERT_WORKER_SECRET`.
- Loads due Job alerts through a service-only claim function.
- Processes bounded batches.
- Inserts deduplicated events.
- Stores success, next-run, and failure state.
- Uses one-hour retry backoff after a failed search.
- Makes no OpenAI request.

The app only presents Daily or Weekly as active when
`phase6_runtime_config.search_alert_scheduler` is enabled after manual Cron
configuration.

## 15. Alert inbox and badge

The alert inbox includes:

- Saved-search name
- Real Job card or an unavailable snapshot
- Posting identity snapshot
- Match summary
- Matched time
- Read/unread state
- Open Job
- Save Job
- Apply
- Dismiss
- Pull-to-refresh
- Pagination

Unread Job alerts have a separate Search-tab badge. Messages keep their own
independent unread badge.

## 16. Migration 0009

File:

`supabase/migrations/0009_phase_6_ask_lance_search_alerts.sql`

It was created locally and was not applied remotely.

### Tables

1. `saved_searches`
2. `search_alert_events`
3. `ask_lance_usage`
4. `phase6_runtime_config`

### Indexes and uniqueness

- `saved_searches_owner_updated_idx`
- `saved_searches_due_alerts_idx`
- `search_alert_events_owner_unread_idx`
- `search_alert_events_owner_history_idx`
- `ask_lance_usage_owner_requested_idx`
- Unique saved-search and opportunity event constraint

### Important constraints

- Name and query lengths
- Target type
- Schema version
- Sort
- Alert frequency
- Job-only automated alerts
- SearchPlan object, field, type, enum, and size validation
- No unknown plan properties
- No URL, UUID, or SQL fragments in stored plans
- Alert snapshot lengths
- Maximum three bounded match-summary items

### RLS policies

- Users read their own saved searches.
- Users create saved searches only for themselves.
- Users update only their own saved searches.
- Users delete only their own saved searches.
- Users read only their own alert events.
- Users update only their own alert events.
- Users delete only their own alert events.

The client has column-level update permission only for alert `read_at`. It has
no alert-event insert permission.

### Trigger

`saved_searches_prepare`:

- Trims and timestamps a search.
- Revalidates the plan.
- Forces People and Business alerts to Paused.
- Establishes the current baseline when a Job alert is enabled.
- Calculates the next UTC run.

### Functions

1. `phase6_jsonb_string_array_valid`
2. `phase6_valid_search_plan`
3. `phase6_prepare_saved_search`
4. `phase6_consume_ask_lance_limit`
5. `phase6_finish_ask_lance_request`
6. `phase6_alert_scheduler_status`
7. `phase6_claim_due_job_alerts`
8. `phase6_match_job_alert_opportunities`

### SECURITY DEFINER justification

- Rate-limit consume/finish functions protect the usage table and derive the
  caller from `auth.uid()`.
- Scheduler status reveals only one boolean.
- Due-alert claim is service-role only and uses bounded, locked batches.
- Job matching is service-role only and manually applies public eligibility,
  ownership, blocking, status, expiry, and business checks.

Every definer function uses an empty search path, schema-qualified objects,
revoked public execution, and narrow grants.

## 17. Edge Functions

### `ask-lance`

Authentication:

- Gateway JWT verification enabled.
- Authorization bearer required.
- `auth.getUser()` verifies the signed-in user.
- Publishable project key only.
- No server secret or service role.

Secrets:

- `OPENAI_API_KEY`
- `OPENAI_SEARCH_MODEL`

### `process-search-alerts`

Authentication:

- Gateway JWT verification disabled in `supabase/config.toml`.
- Dedicated `ALERT_WORKER_SECRET` required.
- Current Supabase secret-key dictionary preferred.
- Legacy service-role environment name used only as a hosted compatibility
  fallback inside this function.

The secret/admin key never enters Expo or the client.

Optional worker configuration:

- `ALERT_WORKER_BATCH_SIZE`
- `ALERT_WORKER_MATCH_LIMIT`

## 18. Manual setup

The exact migration, secret, deployment, direct test, Vault, Cron, health,
disable, and function rollback steps are in:

`docs/PHASE_6_DEPLOYMENT.md`

No remote migration, function deployment, secret configuration, or Cron
schedule was performed.

## 19. Major files

Application:

- `app/(tabs)/search.tsx`
- `app/(tabs)/_layout.tsx`
- `app/_layout.tsx`
- `app/search/manage.tsx`
- `app/search/alerts.tsx`
- `src/components/search/AskLanceSheet.tsx`
- `src/components/search/SaveSearchSheet.tsx`
- `src/components/search/SearchPlanReview.tsx`
- `src/context/SearchAlertsContext.tsx`
- `src/components/navigation/AdaptiveTabBar.tsx`
- `src/lib/searchPlan.ts`
- `src/lib/searchPhase6.ts`
- `src/types/searchPhase6.ts`
- `src/lib/routes.ts`

Server and database:

- `supabase/config.toml`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/search-plan.ts`
- `supabase/functions/ask-lance/index.ts`
- `supabase/functions/process-search-alerts/index.ts`
- `supabase/migrations/0009_phase_6_ask_lance_search_alerts.sql`

Verification and handoff:

- `tests/search-plan.test.mts`
- `docs/PHASE_6_DEPLOYMENT.md`
- `docs/PHASE_6_COMPLETION_REPORT.md`
- `package.json`
- `tsconfig.json`

## 20. Checks actually run

Passed:

- TypeScript
- ESLint
- Expo public configuration
- Android route bundle/export
- Web export
- Metro startup to `Waiting on http://localhost:8091`
- Edge Function syntax checks
- Phase 6 contract/evaluation suite: 35 passed, 0 failed
- Git diff whitespace check
- Client secret-scope scan
- `.env` ignore check
- Migration `0001` through `0008` diff verification

Not run:

- Live OpenAI request
- Applied migration test
- Local Supabase database test
- Deno type check
- Supabase CLI function serve
- Remote function invocation
- Cron execution
- Physical phone test

Deno and the Supabase CLI were not installed. Metro was run in foreground CI
mode and stopped after reaching the waiting state.

## 21. Evaluation coverage

The 35 deterministic tests cover:

- People examples
- Job examples
- Business examples
- Ambiguous requests
- CapCut, clipping, socials, and coder normalization
- Protected race, religion, gender, disability, and age requests
- Prompt injection
- SQL, URL, UUID, and unknown-field rejection
- Missing nested properties
- Future-facing unsupported filter clearing
- Strict Responses API source contract
- Proof that the alert worker contains no OpenAI path

No paid API call is required by the suite.

## 22. Phone and manual testing

After completing `PHASE_6_DEPLOYMENT.md`:

1. Confirm normal Search works with Ask Lance secrets removed.
2. Open Ask Lance from the Search sparkle button.
3. Run one People request.
4. Run one Job request.
5. Run one Business request.
6. Confirm "Lance understood" chips match the plan.
7. Remove a chip and confirm results rerun without another AI call.
8. Edit the normal filter sheet and confirm results rerun.
9. Try "Find me someone good" and answer one clarification.
10. Try a protected-trait request and confirm the calm safety message.
11. Try a prompt-injection request and confirm safe rejection.
12. Save a normal People search.
13. Save an Ask Lance Job search.
14. Rename and rerun both.
15. Delete one saved search.
16. Confirm People and Business alerts cannot be enabled.
17. Enable Daily on a Job search after scheduler health is true.
18. Confirm existing Jobs do not flood the inbox.
19. Publish a matching Job from Account B.
20. Run the worker manually.
21. Confirm Account A receives one event.
22. Run the worker again and confirm no duplicate.
23. Confirm Account A's own Jobs are excluded.
24. Confirm blocked posters are excluded.
25. Confirm draft, paused, closed, archived, and expired Jobs are excluded.
26. Open the alert and confirm it becomes read.
27. Confirm the Search-tab badge clears.
28. Save and Apply from the alert inbox.
29. Close the Job and confirm the snapshot shows unavailable without crashing.
30. Pause the alert and confirm no new events.
31. Confirm Account B cannot read Account A's searches or events.
32. Confirm the client cannot insert an alert event.
33. Confirm a worker request without the dedicated secret returns 401.
34. Confirm no OpenAI key appears in Expo logs or client network traffic.
35. Regression-test Discover, Search filters, Create Studio, Profile Hub,
    Messages/realtime, blocking, reporting, and adaptive navigation.

## 23. Known limitations and deferred items

- Remote setup is intentionally incomplete until the manual steps are run.
- Alerts use UTC intervals, not exact local delivery times.
- Search uses the existing Phase 4 structured Search capabilities.
- Current-intent and posting-identity plan fields are reserved but not executed.
- There are no push, email, or SMS notifications.
- There is no general AI chat, embeddings, candidate scoring, or AI ranking.
- There is no premium, boost, verification, payment, Google Places, or later
  phase work.

## 24. Final security confirmations

- Migrations `0001` through `0008` are unchanged.
- Migration `0009` is the only new migration.
- No secret value was printed, logged, committed, or added to client code.
- There is no client-side OpenAI key.
- There is no client-side Supabase secret or service-role key.
- The OpenAI key exists only as an Edge Function secret name.
- The alert worker's server key exists only inside the worker runtime.
- Phase 7 was not started.
