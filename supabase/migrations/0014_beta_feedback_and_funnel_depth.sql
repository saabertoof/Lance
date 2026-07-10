-- Lance private beta readiness: tester feedback and deeper opportunity funnel events.
-- Apply once after 0013. Do not expose raw feedback or raw telemetry to app clients.

alter table public.opportunity_funnel_events
  add column if not exists opportunity_interest_id uuid
    references public.opportunity_interests(id) on delete cascade;

create index if not exists opportunity_funnel_response_event_idx
on public.opportunity_funnel_events
  (opportunity_id, opportunity_interest_id, event_type, created_at desc)
where opportunity_interest_id is not null;

alter table public.opportunity_funnel_events
  drop constraint if exists opportunity_funnel_events_event_type_check;

alter table public.opportunity_funnel_events
  add constraint opportunity_funnel_events_event_type_check
  check (
    event_type in (
      'view',
      'apply_started',
      'application_submitted',
      'creator_reviewed',
      'message_started'
    )
  );

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null
    references public.profiles(id) on delete cascade,
  feedback_type text not null
    check (feedback_type in ('bug', 'confusing', 'design', 'idea', 'other')),
  area text check (area is null or char_length(area) <= 80),
  message text not null check (char_length(message) between 10 and 1500),
  contact_allowed boolean not null default true,
  platform text not null check (platform in ('android', 'ios', 'web', 'unknown')),
  app_version text check (app_version is null or char_length(app_version) <= 40),
  status text not null default 'new'
    check (status in ('new', 'triaged', 'planned', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists beta_feedback_recent_idx
on public.beta_feedback (created_at desc);

create index if not exists beta_feedback_status_idx
on public.beta_feedback (status, created_at desc);

create index if not exists beta_feedback_reporter_idx
on public.beta_feedback (reporter_profile_id, created_at desc);

alter table public.beta_feedback enable row level security;

revoke all on table public.beta_feedback from anon, authenticated;

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
  normalized_event text := lower(trim(coalesce(target_event, '')));
  target_opportunity_id uuid;
  target_owner_id uuid;
  dedupe_since timestamptz;
  dedupe_key text;
begin
  if normalized_event not in ('view', 'apply_started', 'application_submitted') then
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

  if current_profile_id is null and (
    target_session_id is null or normalized_event = 'application_submitted'
  ) then
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
      when normalized_event = 'view' then now() - interval '1 hour'
      when normalized_event = 'apply_started' then now() - interval '10 minutes'
      else now() - interval '1 day'
    end;
  dedupe_key := coalesce(current_profile_id::text, target_session_id::text);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'opportunity-funnel:' ||
      target_opportunity_id::text || ':' ||
      normalized_event || ':' ||
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
      and event.event_type = normalized_event
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
    normalized_event,
    current_profile_id,
    case when current_profile_id is null then target_session_id else null end
  );
end;
$$;

create or replace function public.record_opportunity_response_funnel_event(
  target_interest_id uuid,
  target_event text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  normalized_event text := lower(trim(coalesce(target_event, '')));
  target_opportunity_id uuid;
  target_owner_id uuid;
  dedupe_since timestamptz;
begin
  if current_profile_id is null then
    return;
  end if;

  if normalized_event not in ('creator_reviewed', 'message_started') then
    raise exception 'Unsupported funnel event.';
  end if;

  select interest.opportunity_id, interest.owner_profile_id
  into target_opportunity_id, target_owner_id
  from public.opportunity_interests interest
  join public.opportunities opportunity
    on opportunity.id = interest.opportunity_id
  where interest.id = target_interest_id
    and opportunity.deleted_at is null
  limit 1;

  if target_opportunity_id is null or target_owner_id <> current_profile_id then
    return;
  end if;

  dedupe_since :=
    case
      when normalized_event = 'creator_reviewed' then now() - interval '30 minutes'
      else now() - interval '1 day'
    end;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'opportunity-response-funnel:' ||
      target_interest_id::text || ':' ||
      normalized_event,
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
    where event.opportunity_interest_id = target_interest_id
      and event.event_type = normalized_event
      and event.actor_profile_id = current_profile_id
      and event.created_at >= dedupe_since
  ) then
    return;
  end if;

  insert into public.opportunity_funnel_events (
    opportunity_id,
    opportunity_interest_id,
    event_type,
    actor_profile_id,
    anonymous_session_id
  )
  values (
    target_opportunity_id,
    target_interest_id,
    normalized_event,
    current_profile_id,
    null
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
  review_count bigint;
  message_start_count bigint;
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
    count(*) filter (where event.event_type = 'creator_reviewed'),
    count(*) filter (where event.event_type = 'message_started'),
    min(event.created_at)
  into view_count, start_count, review_count, message_start_count, tracking_started_at
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
    'applications', coalesce(application_count, 0),
    'creator_reviews', coalesce(review_count, 0),
    'message_starts', coalesce(message_start_count, 0)
  );
end;
$$;

create or replace function public.submit_beta_feedback(
  target_feedback_type text,
  target_area text,
  target_message text,
  target_contact_allowed boolean default true,
  target_platform text default 'unknown',
  target_app_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  normalized_type text := lower(trim(coalesce(target_feedback_type, 'other')));
  normalized_area text := nullif(left(trim(coalesce(target_area, '')), 80), '');
  normalized_message text := left(trim(coalesce(target_message, '')), 1500);
  normalized_platform text := lower(trim(coalesce(target_platform, 'unknown')));
  saved_feedback_id uuid;
begin
  if current_profile_id is null then
    raise exception 'Sign in again to send feedback.';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = current_profile_id
      and profile.deleted_at is null
  ) then
    raise exception 'Your profile is not available.';
  end if;

  if normalized_type not in ('bug', 'confusing', 'design', 'idea', 'other') then
    normalized_type := 'other';
  end if;

  if char_length(normalized_message) < 10 then
    raise exception 'Add a little more detail before sending feedback.';
  end if;

  if normalized_platform not in ('android', 'ios', 'web') then
    normalized_platform := 'unknown';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'beta-feedback-rate:' || current_profile_id::text,
      0
    )
  );

  if (
    select count(*)
    from public.beta_feedback feedback
    where feedback.reporter_profile_id = current_profile_id
      and feedback.created_at > now() - interval '24 hours'
  ) >= 12 then
    raise exception 'You have sent a lot of feedback today. Try again tomorrow.';
  end if;

  insert into public.beta_feedback (
    reporter_profile_id,
    feedback_type,
    area,
    message,
    contact_allowed,
    platform,
    app_version
  )
  values (
    current_profile_id,
    normalized_type,
    normalized_area,
    normalized_message,
    coalesce(target_contact_allowed, true),
    normalized_platform,
    nullif(left(trim(coalesce(target_app_version, '')), 40), '')
  )
  returning id into saved_feedback_id;

  return saved_feedback_id;
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

revoke all on function public.record_opportunity_response_funnel_event(
  uuid,
  text
) from public;
grant execute on function public.record_opportunity_response_funnel_event(
  uuid,
  text
) to authenticated;

revoke all on function public.get_opportunity_funnel_summary(uuid) from public;
grant execute on function public.get_opportunity_funnel_summary(uuid)
to authenticated;

revoke all on function public.submit_beta_feedback(
  text,
  text,
  text,
  boolean,
  text,
  text
) from public;
grant execute on function public.submit_beta_feedback(
  text,
  text,
  text,
  boolean,
  text,
  text
) to authenticated;
