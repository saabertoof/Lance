-- Lance beta reliability: privacy-safe opportunity funnels and client error reports.
-- Apply once after 0011. Raw telemetry is never directly readable by app clients.

create table public.opportunity_funnel_events (
  id bigint generated always as identity primary key,
  opportunity_id uuid not null
    references public.opportunities(id) on delete cascade,
  event_type text not null
    check (event_type in ('view', 'apply_started')),
  actor_profile_id uuid
    references public.profiles(id) on delete set null,
  anonymous_session_id uuid,
  created_at timestamptz not null default now(),
  constraint opportunity_funnel_actor_check check (
    actor_profile_id is not null or anonymous_session_id is not null
  )
);

create index opportunity_funnel_owner_summary_idx
on public.opportunity_funnel_events
  (opportunity_id, event_type, created_at desc);

create index opportunity_funnel_actor_dedupe_idx
on public.opportunity_funnel_events
  (opportunity_id, actor_profile_id, event_type, created_at desc)
where actor_profile_id is not null;

create index opportunity_funnel_session_dedupe_idx
on public.opportunity_funnel_events
  (opportunity_id, anonymous_session_id, event_type, created_at desc)
where anonymous_session_id is not null;

alter table public.opportunity_funnel_events enable row level security;

revoke all on table public.opportunity_funnel_events from anon, authenticated;
revoke all on sequence public.opportunity_funnel_events_id_seq from anon, authenticated;

create table public.client_error_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null
    references public.profiles(id) on delete cascade,
  area text not null check (char_length(area) between 1 and 80),
  error_name text not null check (char_length(error_name) between 1 and 80),
  safe_message text not null check (char_length(safe_message) between 1 and 300),
  fingerprint text not null check (char_length(fingerprint) between 8 and 64),
  platform text not null check (platform in ('android', 'ios', 'web', 'unknown')),
  app_version text check (
    app_version is null or char_length(app_version) <= 40
  ),
  created_at timestamptz not null default now()
);

create index client_error_reports_recent_idx
on public.client_error_reports (created_at desc);

create index client_error_reports_fingerprint_idx
on public.client_error_reports (fingerprint, created_at desc);

alter table public.client_error_reports enable row level security;

revoke all on table public.client_error_reports from anon, authenticated;

create or replace function public.record_opportunity_funnel_event(
  target_slug text,
  target_event text,
  target_session_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  target_opportunity_id uuid;
  target_owner_id uuid;
  dedupe_since timestamptz;
  dedupe_key text;
begin
  if target_event not in ('view', 'apply_started') then
    raise exception 'Unsupported funnel event.';
  end if;

  if current_profile_id is not null and not exists (
    select 1
    from public.profiles profile
    where profile.id = current_profile_id
      and profile.deleted_at is null
  ) then
    current_profile_id := null;
  end if;

  if current_profile_id is null and target_session_id is null then
    return;
  end if;

  select opportunity.id, opportunity.owner_profile_id
  into target_opportunity_id, target_owner_id
  from public.opportunities opportunity
  join public.profiles profile
    on profile.id = opportunity.owner_profile_id
  left join public.businesses business
    on business.id = opportunity.business_id
  where opportunity.slug = lower(trim(target_slug))
    and opportunity.deleted_at is null
    and profile.deleted_at is null
    and opportunity.status = 'published'
    and (
      not opportunity.posted_as_business
      or (
        business.status = 'active'
        and business.deleted_at is null
      )
    )
    and (
      opportunity.expires_at is null
      or opportunity.expires_at > now()
    )
  limit 1;

  if target_opportunity_id is null or target_owner_id = current_profile_id then
    return;
  end if;

  dedupe_since :=
    case
      when target_event = 'view' then now() - interval '1 hour'
      else now() - interval '10 minutes'
    end;
  dedupe_key :=
    coalesce(current_profile_id::text, target_session_id::text);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'opportunity-funnel:' ||
      target_opportunity_id::text || ':' ||
      target_event || ':' ||
      dedupe_key,
      0
    )
  );

  if (
    select count(*)
    from public.opportunity_funnel_events event
    where event.opportunity_id = target_opportunity_id
      and event.created_at >= now() - interval '1 hour'
  ) >= 1000 then
    return;
  end if;

  if exists (
    select 1
    from public.opportunity_funnel_events event
    where event.opportunity_id = target_opportunity_id
      and event.event_type = target_event
      and event.created_at >= dedupe_since
      and (
        (
          current_profile_id is not null
          and event.actor_profile_id = current_profile_id
        )
        or (
          current_profile_id is null
          and event.actor_profile_id is null
          and event.anonymous_session_id = target_session_id
        )
      )
  ) then
    return;
  end if;

  insert into public.opportunity_funnel_events (
    opportunity_id,
    event_type,
    actor_profile_id,
    anonymous_session_id
  )
  values (
    target_opportunity_id,
    target_event,
    current_profile_id,
    case when current_profile_id is null then target_session_id else null end
  );
end;
$$;

create or replace function public.get_opportunity_funnel_summary(
  target_opportunity_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  target_owner_id uuid;
  view_count bigint;
  start_count bigint;
  application_count bigint;
  tracking_started_at timestamptz;
begin
  if current_profile_id is null then
    raise exception 'Sign in again to continue.';
  end if;

  select opportunity.owner_profile_id
  into target_owner_id
  from public.opportunities opportunity
  where opportunity.id = target_opportunity_id
    and opportunity.deleted_at is null;

  if target_owner_id is null or target_owner_id <> current_profile_id then
    raise exception 'This opportunity performance summary is not available.';
  end if;

  select
    count(*) filter (where event.event_type = 'view'),
    count(*) filter (where event.event_type = 'apply_started'),
    min(event.created_at)
  into view_count, start_count, tracking_started_at
  from public.opportunity_funnel_events event
  where event.opportunity_id = target_opportunity_id;

  select count(*)
  into application_count
  from public.opportunity_interests interest
  where interest.opportunity_id = target_opportunity_id
    and tracking_started_at is not null
    and interest.created_at >= tracking_started_at;

  return jsonb_build_object(
    'views', coalesce(view_count, 0),
    'application_starts', coalesce(start_count, 0),
    'applications', coalesce(application_count, 0)
  );
end;
$$;

create or replace function public.record_client_error(
  target_area text,
  target_error_name text,
  target_safe_message text,
  target_fingerprint text,
  target_platform text,
  target_app_version text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  normalized_area text := left(trim(coalesce(target_area, '')), 80);
  normalized_name text := left(trim(coalesce(target_error_name, '')), 80);
  normalized_message text := left(trim(coalesce(target_safe_message, '')), 300);
  normalized_fingerprint text := left(trim(coalesce(target_fingerprint, '')), 64);
  normalized_platform text := lower(trim(coalesce(target_platform, 'unknown')));
begin
  if current_profile_id is null then
    return;
  end if;

  if normalized_area = ''
    or normalized_name = ''
    or normalized_message = ''
    or char_length(normalized_fingerprint) < 8
  then
    return;
  end if;

  if normalized_platform not in ('android', 'ios', 'web') then
    normalized_platform := 'unknown';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'client-error-rate:' || current_profile_id::text,
      0
    )
  );

  if (
    select count(*)
    from public.client_error_reports report
    where report.reporter_profile_id = current_profile_id
      and report.created_at > now() - interval '24 hours'
  ) >= 20 then
    return;
  end if;

  insert into public.client_error_reports (
    reporter_profile_id,
    area,
    error_name,
    safe_message,
    fingerprint,
    platform,
    app_version
  )
  values (
    current_profile_id,
    normalized_area,
    normalized_name,
    normalized_message,
    normalized_fingerprint,
    normalized_platform,
    nullif(left(trim(coalesce(target_app_version, '')), 40), '')
  );
end;
$$;

revoke all on function public.record_opportunity_funnel_event(
  text,
  text,
  uuid
) from public;
grant execute on function public.record_opportunity_funnel_event(
  text,
  text,
  uuid
) to anon, authenticated;

revoke all on function public.get_opportunity_funnel_summary(uuid) from public;
grant execute on function public.get_opportunity_funnel_summary(uuid)
to authenticated;

revoke all on function public.record_client_error(
  text,
  text,
  text,
  text,
  text,
  text
) from public;
grant execute on function public.record_client_error(
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;
