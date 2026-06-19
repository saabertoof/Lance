# Lance Phase 6 Manual Setup

Phase 6 code is local only until these steps are completed. Do not place any
secret in Expo, `.env`, `app.json`, SQL migration files, Git, screenshots, or
chat.

## 1. Apply migration 0009

Confirm migrations `0001` through `0008` have already been applied. In the
Supabase Dashboard, open **SQL Editor**, create a new query, paste the complete
contents of:

`supabase/migrations/0009_phase_6_ask_lance_search_alerts.sql`

Run it once. Do not rerun it after a successful application.

## 2. Install and link the Supabase CLI

From the Lance project root:

```powershell
supabase login
supabase projects list
supabase link --project-ref <YOUR_PROJECT_REF>
```

The CLI was not installed on this computer during implementation.

## 3. Create Edge Function secrets

Create a temporary local file outside the repository containing:

```dotenv
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
OPENAI_SEARCH_MODEL=<A_SUPPORTED_LOW_LATENCY_STRUCTURED_OUTPUT_MODEL>
ALERT_WORKER_SECRET=<A_LONG_RANDOM_SECRET>
```

Then upload it and remove the temporary file:

```powershell
supabase secrets set --env-file <ABSOLUTE_PATH_TO_TEMP_SECRET_FILE>
supabase secrets list
```

Use the Dashboard's Edge Function Secrets page instead if preferred. Never add
these values to the Expo `.env` file.

## 4. Deploy the functions

```powershell
supabase functions deploy ask-lance
supabase functions deploy process-search-alerts
```

`ask-lance` keeps gateway JWT verification enabled and also verifies the user
inside the function. `process-search-alerts` disables gateway JWT verification
because it verifies the dedicated `ALERT_WORKER_SECRET` itself.

## 5. Test Ask Lance

The safest normal test is through the signed-in Expo app. For a direct test,
replace every placeholder locally:

```powershell
curl.exe -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/ask-lance" `
  -H "apikey: <PUBLISHABLE_KEY>" `
  -H "Authorization: Bearer <SIGNED_IN_USER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d '{\"query\":\"Paid beginner React jobs\"}'
```

The response should contain `plan` and `requestId`, never records or secrets.

## 6. Test the alert worker safely

Before scheduling it, create a due test Job alert, then invoke:

```powershell
curl.exe -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/process-search-alerts" `
  -H "x-alert-worker-secret: <ALERT_WORKER_SECRET>" `
  -H "Content-Type: application/json" `
  -d '{}'
```

Run it twice. The second run must not create a duplicate event. A request with
the secret omitted or changed must return HTTP 401.

## 7. Configure hourly Cron with Vault

Enable the `pg_cron`, `pg_net`, and Vault integrations in Supabase if they are
not already enabled. In SQL Editor, store the URL and the same dedicated worker
secret:

```sql
select vault.create_secret(
  'https://<PROJECT_REF>.supabase.co',
  'lance_project_url'
);

select vault.create_secret(
  '<ALERT_WORKER_SECRET>',
  'lance_alert_worker_secret'
);
```

Create the hourly worker:

```sql
select cron.schedule(
  'process-lance-search-alerts',
  '0 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'lance_project_url'
    ) || '/functions/v1/process-search-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alert-worker-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'lance_alert_worker_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);
```

Only after the Cron job exists and a manual invocation succeeds:

```sql
update public.phase6_runtime_config
set enabled = true, updated_at = now()
where key = 'search_alert_scheduler';
```

This makes the app accurately offer Daily and Weekly alert activation. Phase 6
uses UTC-based daily and weekly intervals.

## 8. Verify scheduler health

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'process-lance-search-alerts';

select status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (
  select jobid from cron.job
  where jobname = 'process-lance-search-alerts'
)
order by start_time desc
limit 20;

select *
from public.phase6_runtime_config
where key = 'search_alert_scheduler';
```

The app's saved-search screen also reads the runtime flag. It never claims an
alert is active while this flag is false.

## 9. Disable alerts

```sql
select cron.unschedule('process-lance-search-alerts');

update public.phase6_runtime_config
set enabled = false, updated_at = now()
where key = 'search_alert_scheduler';

update public.saved_searches
set
  alert_enabled = false,
  alert_frequency = 'paused',
  next_run_at = null
where alert_enabled = true;
```

## 10. Roll back function code

Disable Cron first. Check out the last known-good function files from Git and
redeploy the two function names. Do not edit or rewrite migration `0009` after
it has been applied. If Ask Lance must be temporarily unavailable, remove its
OpenAI secrets or redeploy a known-good unavailable response; normal Search
continues to work.
