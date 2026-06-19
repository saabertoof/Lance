-- Lance Phase 6: Ask Lance usage limits, saved searches, and in-app job alerts.
-- Apply once after 0008. This migration does not configure secrets, deploy Edge
-- Functions, or schedule Cron.

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  target_type text not null,
  original_query text,
  normalized_text_query text not null default '',
  filter_plan jsonb not null,
  schema_version integer not null default 1,
  sort text not null default 'relevance',
  alert_frequency text not null default 'paused',
  alert_enabled boolean not null default false,
  alert_baseline_at timestamptz,
  last_opened_at timestamptz,
  last_run_at timestamptz,
  last_success_at timestamptz,
  next_run_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_searches_name_length
    check (char_length(trim(name)) between 1 and 80),
  constraint saved_searches_target_type
    check (target_type in ('people', 'jobs', 'businesses')),
  constraint saved_searches_query_length
    check (
      original_query is null or char_length(original_query) <= 500
    ),
  constraint saved_searches_normalized_query_length
    check (char_length(normalized_text_query) <= 500),
  constraint saved_searches_schema_version
    check (schema_version = 1),
  constraint saved_searches_sort
    check (sort in ('relevance', 'newest')),
  constraint saved_searches_alert_frequency
    check (alert_frequency in ('paused', 'daily', 'weekly')),
  constraint saved_searches_job_alerts_only
    check (
      not alert_enabled
      or (
        target_type = 'jobs'
        and alert_frequency in ('daily', 'weekly')
      )
    ),
  constraint saved_searches_error_length
    check (
      last_error_code is null or char_length(last_error_code) <= 80
    )
);

create table public.search_alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  saved_search_id uuid not null
    references public.saved_searches(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  opportunity_title_snapshot text not null,
  poster_name_snapshot text not null,
  match_summary text[] not null default '{}',
  published_at_snapshot timestamptz,
  matched_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint search_alert_events_search_opportunity_unique
    unique (saved_search_id, opportunity_id),
  constraint search_alert_event_title_length
    check (char_length(opportunity_title_snapshot) between 1 and 120),
  constraint search_alert_event_poster_length
    check (char_length(poster_name_snapshot) between 1 and 120),
  constraint search_alert_event_summary_size
    check (
      cardinality(match_summary) <= 3
      and char_length(array_to_string(match_summary, '')) <= 420
    )
);

create table public.ask_lance_usage (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  success boolean,
  error_category text,
  model text,
  input_tokens integer,
  output_tokens integer,
  constraint ask_lance_usage_error_length
    check (error_category is null or char_length(error_category) <= 80),
  constraint ask_lance_usage_model_length
    check (model is null or char_length(model) <= 120),
  constraint ask_lance_usage_token_counts
    check (
      (input_tokens is null or input_tokens >= 0)
      and (output_tokens is null or output_tokens >= 0)
    )
);

create table public.phase6_runtime_config (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint phase6_runtime_config_known_key
    check (key in ('search_alert_scheduler'))
);

insert into public.phase6_runtime_config (key, enabled)
values ('search_alert_scheduler', false)
on conflict (key) do nothing;

create index saved_searches_owner_updated_idx
on public.saved_searches (user_id, updated_at desc);

create index saved_searches_due_alerts_idx
on public.saved_searches (next_run_at, id)
where alert_enabled = true and target_type = 'jobs';

create index search_alert_events_owner_unread_idx
on public.search_alert_events (user_id, matched_at desc)
where read_at is null;

create index search_alert_events_owner_history_idx
on public.search_alert_events (user_id, matched_at desc, id);

create index ask_lance_usage_owner_requested_idx
on public.ask_lance_usage (user_id, requested_at desc);

create or replace function public.phase6_jsonb_string_array_valid(
  target_value jsonb,
  target_max_items integer,
  target_max_length integer,
  target_allowed text[] default null
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(target_value) = 'array'
    and jsonb_array_length(target_value) <= target_max_items
    and not exists (
      select 1
      from jsonb_array_elements(target_value) item
      where jsonb_typeof(item) <> 'string'
        or char_length(item #>> '{}') > target_max_length
        or (
          target_allowed is not null
          and not ((item #>> '{}') = any(target_allowed))
        )
    );
$$;

create or replace function public.phase6_valid_search_plan(
  target_plan jsonb,
  expected_target text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(target_plan) = 'object'
    and target_plan ->> 'schema_version' = '1'
    and target_plan ->> 'target_type' = expected_target
    and expected_target in ('people', 'jobs', 'businesses')
    and target_plan ->> 'sort' in ('relevance', 'newest')
    and jsonb_typeof(target_plan -> 'original_intent_summary') = 'string'
    and char_length(target_plan ->> 'original_intent_summary') <= 180
    and public.phase6_jsonb_string_array_valid(
      target_plan -> 'keywords', 8, 80
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan -> 'location_terms', 3, 100
    )
    and jsonb_typeof(target_plan -> 'needs_clarification') = 'boolean'
    and jsonb_typeof(target_plan -> 'clarification_question') = 'string'
    and char_length(target_plan ->> 'clarification_question') <= 180
    and public.phase6_jsonb_string_array_valid(
      target_plan -> 'ignored_unsafe_constraints', 5, 120
    )
    and jsonb_typeof(target_plan -> 'confidence') = 'number'
    and (target_plan ->> 'confidence')::numeric between 0 and 1
    and jsonb_typeof(target_plan -> 'people_filters') = 'object'
    and jsonb_typeof(target_plan -> 'job_filters') = 'object'
    and jsonb_typeof(target_plan -> 'business_filters') = 'object'
    and target_plan::text !~* 'https?://'
    and target_plan::text !~* '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
    and target_plan::text !~* '(select|insert|update|delete|drop|alter|grant|revoke)[[:space:]]+.{1,80}[[:space:]]+(from|into|table|set|on)'
    and not exists (
      select 1
      from jsonb_object_keys(target_plan) key_name
      where key_name not in (
        'schema_version',
        'target_type',
        'original_intent_summary',
        'keywords',
        'location_terms',
        'sort',
        'needs_clarification',
        'clarification_question',
        'ignored_unsafe_constraints',
        'confidence',
        'people_filters',
        'job_filters',
        'business_filters'
      )
    )
    and not exists (
      select 1
      from jsonb_object_keys(target_plan -> 'people_filters') key_name
      where key_name not in (
        'primary_roles',
        'skills',
        'industries',
        'experience_levels',
        'availability',
        'remote_preferences',
        'current_intents',
        'opportunity_interests'
      )
    )
    and not exists (
      select 1
      from jsonb_object_keys(target_plan -> 'job_filters') key_name
      where key_name not in (
        'categories',
        'required_skills',
        'industries',
        'compensation_types',
        'clearly_paid_only',
        'work_types',
        'work_arrangements',
        'time_commitments',
        'experience_levels',
        'posting_identity_types',
        'newest_only'
      )
    )
    and not exists (
      select 1
      from jsonb_object_keys(target_plan -> 'business_filters') key_name
      where key_name not in (
        'business_types',
        'business_sizes',
        'industries',
        'remote_statuses',
        'has_active_jobs'
      )
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{people_filters,primary_roles}', 1, 60
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{people_filters,skills}', 8, 60
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{people_filters,industries}', 4, 80
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{people_filters,experience_levels}',
      1,
      30,
      array['just_starting', 'some_experience', 'experienced', 'expert']
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{people_filters,availability}',
      1,
      30,
      array[
        'few_hours_per_week',
        'hours_5_10',
        'hours_10_20',
        'hours_20_plus',
        'flexible_hours'
      ]
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{people_filters,remote_preferences}',
      1,
      20,
      array['remote', 'hybrid', 'in_person', 'flexible']
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{people_filters,current_intents}',
      3,
      40,
      array[
        'building_startup',
        'looking_for_cofounder',
        'looking_for_collaborators',
        'open_to_freelance',
        'looking_for_internships',
        'looking_for_job',
        'hiring',
        'looking_for_projects',
        'offering_skills',
        'just_networking',
        'offering_mentorship',
        'seeking_mentorship'
      ]
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{people_filters,opportunity_interests}',
      4,
      40,
      array[
        'paid_freelance',
        'ongoing_part_time',
        'one_time_project',
        'retainer_work',
        'cofounder',
        'project_collaboration',
        'commission',
        'revenue_share',
        'equity',
        'local_work',
        'remote_work',
        'open_to_discussing'
      ]
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{job_filters,categories}',
      1,
      40,
      array[
        'software_development',
        'web_development',
        'mobile_development',
        'product_design',
        'graphic_design',
        'video_editing',
        'photography',
        'content_creation',
        'social_media',
        'marketing',
        'sales',
        'copywriting',
        'virtual_assistance',
        'community_management',
        'operations',
        'consulting',
        'finance',
        'real_estate',
        'customer_support',
        'other'
      ]
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{job_filters,required_skills}', 8, 60
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{job_filters,industries}', 1, 80
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{job_filters,compensation_types}',
      1,
      30,
      array[
        'hourly',
        'fixed_project',
        'weekly',
        'monthly',
        'retainer',
        'salary',
        'commission',
        'revenue_share',
        'equity',
        'unpaid',
        'negotiable',
        'mixed'
      ]
    )
    and jsonb_typeof(
      target_plan #> '{job_filters,clearly_paid_only}'
    ) = 'boolean'
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{job_filters,work_types}',
      1,
      40,
      array[
        'one_time_project',
        'ongoing_freelance',
        'part_time',
        'full_time',
        'cofounder',
        'project_collaboration',
        'retainer',
        'internship',
        'commission_based',
        'other'
      ]
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{job_filters,work_arrangements}',
      1,
      20,
      array['remote', 'hybrid', 'in_person', 'flexible']
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{job_filters,time_commitments}',
      1,
      30,
      array[
        'under_5_hours',
        'hours_5_10',
        'hours_10_20',
        'hours_20_30',
        'hours_30_plus',
        'flexible',
        'one_time_deliverable'
      ]
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{job_filters,experience_levels}',
      1,
      30,
      array[
        'none_required',
        'beginner',
        'intermediate',
        'experienced',
        'expert',
        'any_level'
      ]
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{job_filters,posting_identity_types}',
      1,
      20,
      array['personal', 'business']
    )
    and jsonb_typeof(
      target_plan #> '{job_filters,newest_only}'
    ) = 'boolean'
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{business_filters,business_types}',
      1,
      30,
      array[
        'solo_operator',
        'creator',
        'startup',
        'agency',
        'small_business',
        'local_business',
        'nonprofit',
        'project',
        'community',
        'other'
      ]
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{business_filters,business_sizes}',
      1,
      30,
      array['one_person', 'two_to_ten', 'eleven_to_fifty', 'fifty_one_plus']
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{business_filters,industries}', 1, 80
    )
    and public.phase6_jsonb_string_array_valid(
      target_plan #> '{business_filters,remote_statuses}',
      1,
      30,
      array['remote', 'hybrid', 'in_person', 'flexible', 'not_applicable']
    )
    and jsonb_typeof(
      target_plan #> '{business_filters,has_active_jobs}'
    ) = 'boolean';
$$;

alter table public.saved_searches
add constraint saved_searches_filter_plan_valid
check (public.phase6_valid_search_plan(filter_plan, target_type));

create or replace function public.phase6_prepare_saved_search()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := trim(new.name);
  new.normalized_text_query :=
    left(trim(coalesce(new.normalized_text_query, '')), 500);
  new.updated_at := now();

  if not public.phase6_valid_search_plan(
    new.filter_plan,
    new.target_type
  ) then
    raise exception 'The saved search filter plan is invalid.';
  end if;

  if new.target_type <> 'jobs' then
    new.alert_enabled := false;
    new.alert_frequency := 'paused';
    new.alert_baseline_at := null;
    new.next_run_at := null;
  elsif new.alert_enabled and new.alert_frequency in ('daily', 'weekly') then
    if tg_op = 'INSERT'
      or old.alert_enabled is false
      or old.alert_frequency is distinct from new.alert_frequency then
      new.alert_baseline_at := now();
      new.last_success_at := now();
      new.last_error_code := null;
      new.next_run_at := now() + case
        when new.alert_frequency = 'weekly' then interval '7 days'
        else interval '1 day'
      end;
    end if;
  else
    new.alert_enabled := false;
    new.alert_frequency := 'paused';
    new.next_run_at := null;
  end if;

  return new;
end;
$$;

create trigger saved_searches_prepare
before insert or update on public.saved_searches
for each row execute function public.phase6_prepare_saved_search();

create or replace function public.phase6_consume_ask_lance_limit(
  target_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  daily_count integer;
  burst_count integer;
begin
  if current_profile_id is null then
    raise exception 'Sign in again to continue.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'ask-lance:' || current_profile_id::text,
      0
    )
  );

  select count(*)::integer into daily_count
  from public.ask_lance_usage usage
  where usage.user_id = current_profile_id
    and usage.requested_at > now() - interval '24 hours';

  select count(*)::integer into burst_count
  from public.ask_lance_usage usage
  where usage.user_id = current_profile_id
    and usage.requested_at > now() - interval '1 minute';

  if daily_count >= 20 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit'
    );
  end if;

  if burst_count >= 5 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'burst_limit'
    );
  end if;

  insert into public.ask_lance_usage (id, user_id)
  values (target_request_id, current_profile_id);

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(0, 19 - daily_count)
  );
end;
$$;

create or replace function public.phase6_finish_ask_lance_request(
  target_request_id uuid,
  target_success boolean,
  target_error_category text default null,
  target_model text default null,
  target_input_tokens integer default null,
  target_output_tokens integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ask_lance_usage
  set
    completed_at = now(),
    success = target_success,
    error_category = left(target_error_category, 80),
    model = left(target_model, 120),
    input_tokens = target_input_tokens,
    output_tokens = target_output_tokens
  where id = target_request_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.phase6_alert_scheduler_status()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select config.enabled
    from public.phase6_runtime_config config
    where config.key = 'search_alert_scheduler'
  ), false);
$$;

create or replace function public.phase6_claim_due_job_alerts(
  target_limit integer default 25
)
returns table (
  saved_search_id uuid,
  user_id uuid,
  filter_plan jsonb,
  since_at timestamptz,
  alert_frequency text
)
language sql
security definer
set search_path = ''
as $$
  with due as (
    select search.id
    from public.saved_searches search
    where search.alert_enabled = true
      and search.target_type = 'jobs'
      and search.alert_frequency in ('daily', 'weekly')
      and search.next_run_at is not null
      and search.next_run_at <= now()
    order by search.next_run_at, search.id
    for update skip locked
    limit least(greatest(target_limit, 1), 100)
  ),
  claimed as (
    update public.saved_searches search
    set
      last_run_at = now(),
      next_run_at = now() + interval '15 minutes'
    from due
    where search.id = due.id
    returning search.*
  )
  select
    claimed.id,
    claimed.user_id,
    claimed.filter_plan,
    coalesce(
      claimed.last_success_at,
      claimed.alert_baseline_at,
      claimed.created_at
    ),
    claimed.alert_frequency
  from claimed;
$$;

create or replace function public.phase6_match_job_alert_opportunities(
  target_saved_search_id uuid,
  target_since timestamptz,
  target_limit integer default 100
)
returns table (
  opportunity_id uuid,
  opportunity_title text,
  poster_name text,
  published_at timestamptz,
  match_summary text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with selected as (
    select search.user_id, search.filter_plan
    from public.saved_searches search
    where search.id = target_saved_search_id
      and search.target_type = 'jobs'
      and search.alert_enabled = true
  ),
  eligible as (
    select
      opportunity.id,
      opportunity.title,
      opportunity.published_at,
      opportunity.owner_profile_id,
      opportunity.business_id,
      opportunity.workplace::text as workplace,
      opportunity.location,
      opportunity.compensation_type,
      opportunity.compensation_min,
      poster.display_name,
      business.name as business_name,
      selected.filter_plan
    from selected
    join public.opportunities opportunity on true
    join public.profiles poster
      on poster.id = opportunity.owner_profile_id
    left join public.businesses business
      on business.id = opportunity.business_id
    where opportunity.status = 'published'
      and opportunity.deleted_at is null
      and opportunity.published_at > target_since
      and (opportunity.expires_at is null or opportunity.expires_at > now())
      and opportunity.owner_profile_id <> selected.user_id
      and poster.deleted_at is null
      and poster.onboarding_completed_at is not null
      and (
        opportunity.business_id is null
        or (
          business.status = 'active'
          and business.deleted_at is null
        )
      )
      and not public.phase5_profiles_blocked(
        selected.user_id,
        opportunity.owner_profile_id
      )
      and (
        jsonb_array_length(
          selected.filter_plan #> '{job_filters,categories}'
        ) = 0
        or opportunity.category =
          selected.filter_plan #>> '{job_filters,categories,0}'
      )
      and (
        jsonb_array_length(
          selected.filter_plan #> '{job_filters,industries}'
        ) = 0
        or lower(coalesce(opportunity.industry, '')) =
          lower(selected.filter_plan #>> '{job_filters,industries,0}')
      )
      and (
        jsonb_array_length(
          selected.filter_plan #> '{job_filters,compensation_types}'
        ) = 0
        or opportunity.compensation_type::text =
          selected.filter_plan #>> '{job_filters,compensation_types,0}'
      )
      and (
        not coalesce(
          (selected.filter_plan #>> '{job_filters,clearly_paid_only}')::boolean,
          false
        )
        or public.is_clearly_paid(
          opportunity.compensation_type,
          opportunity.compensation_min
        )
      )
      and (
        jsonb_array_length(
          selected.filter_plan #> '{job_filters,work_types}'
        ) = 0
        or opportunity.opportunity_type::text =
          selected.filter_plan #>> '{job_filters,work_types,0}'
      )
      and (
        jsonb_array_length(
          selected.filter_plan #> '{job_filters,work_arrangements}'
        ) = 0
        or opportunity.workplace::text =
          selected.filter_plan #>> '{job_filters,work_arrangements,0}'
      )
      and (
        jsonb_array_length(
          selected.filter_plan #> '{job_filters,time_commitments}'
        ) = 0
        or opportunity.commitment =
          selected.filter_plan #>> '{job_filters,time_commitments,0}'
      )
      and (
        jsonb_array_length(
          selected.filter_plan #> '{job_filters,experience_levels}'
        ) = 0
        or opportunity.experience_requirements =
          selected.filter_plan #>> '{job_filters,experience_levels,0}'
      )
      and (
        jsonb_array_length(
          selected.filter_plan #> '{job_filters,posting_identity_types}'
        ) = 0
        or (
          selected.filter_plan #>> '{job_filters,posting_identity_types,0}' =
            case when opportunity.posted_as_business
              then 'business' else 'personal' end
        )
      )
      and (
        jsonb_array_length(selected.filter_plan -> 'location_terms') = 0
        or exists (
          select 1
          from jsonb_array_elements_text(
            selected.filter_plan -> 'location_terms'
          ) location_term
          where lower(coalesce(opportunity.location, ''))
            like '%' || lower(location_term) || '%'
        )
      )
      and (
        jsonb_array_length(selected.filter_plan -> 'keywords') = 0
        or exists (
          select 1
          from jsonb_array_elements_text(
            selected.filter_plan -> 'keywords'
          ) keyword
          where lower(
            coalesce(opportunity.title, '') || ' ' ||
            coalesce(opportunity.short_summary, '') || ' ' ||
            coalesce(opportunity.full_description, '') || ' ' ||
            coalesce(opportunity.industry, '') || ' ' ||
            coalesce(opportunity.location, '') || ' ' ||
            coalesce(poster.display_name, '') || ' ' ||
            coalesce(business.name, '')
          ) like '%' || lower(keyword) || '%'
        )
      )
      and (
        jsonb_array_length(
          selected.filter_plan #> '{job_filters,required_skills}'
        ) = 0
        or exists (
          select 1
          from public.opportunity_skills opportunity_skill
          join public.skills skill
            on skill.id = opportunity_skill.skill_id
          where opportunity_skill.opportunity_id = opportunity.id
            and lower(skill.name) in (
              select lower(selected_skill)
              from jsonb_array_elements_text(
                selected.filter_plan #> '{job_filters,required_skills}'
              ) selected_skill
            )
        )
      )
  )
  select
    eligible.id,
    eligible.title,
    coalesce(eligible.business_name, eligible.display_name, 'Lance member'),
    eligible.published_at,
    array_remove(array[
      case
        when jsonb_array_length(
          eligible.filter_plan #> '{job_filters,required_skills}'
        ) > 0
        then 'Matches selected skills'
      end,
      case
        when coalesce(
          (eligible.filter_plan #>> '{job_filters,clearly_paid_only}')::boolean,
          false
        )
        then 'Matches the paid-only filter'
      end,
      case
        when jsonb_array_length(
          eligible.filter_plan #> '{job_filters,work_arrangements}'
        ) > 0
        then 'Matches the selected work arrangement'
      end
    ], null)::text[]
  from eligible
  order by eligible.published_at, eligible.id
  limit least(greatest(target_limit, 1), 250);
$$;

alter table public.saved_searches enable row level security;
alter table public.search_alert_events enable row level security;
alter table public.ask_lance_usage enable row level security;
alter table public.phase6_runtime_config enable row level security;

create policy "Users read their saved searches"
on public.saved_searches for select
to authenticated
using (user_id = auth.uid());

create policy "Users create their saved searches"
on public.saved_searches for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users update their saved searches"
on public.saved_searches for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users delete their saved searches"
on public.saved_searches for delete
to authenticated
using (user_id = auth.uid());

create policy "Users read their search alert events"
on public.search_alert_events for select
to authenticated
using (user_id = auth.uid());

create policy "Users update their search alert events"
on public.search_alert_events for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users delete their search alert events"
on public.search_alert_events for delete
to authenticated
using (user_id = auth.uid());

revoke all on public.saved_searches from anon;
revoke all on public.search_alert_events from anon;
revoke all on public.ask_lance_usage from anon, authenticated;
revoke all on public.phase6_runtime_config from anon, authenticated;

grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, delete on public.search_alert_events to authenticated;
grant update (read_at) on public.search_alert_events to authenticated;
grant select, update on public.saved_searches to service_role;
grant select, insert on public.search_alert_events to service_role;

revoke all on function public.phase6_jsonb_string_array_valid(
  jsonb, integer, integer, text[]
) from public;
revoke all on function public.phase6_valid_search_plan(jsonb, text) from public;
revoke all on function public.phase6_consume_ask_lance_limit(uuid) from public;
revoke all on function public.phase6_finish_ask_lance_request(
  uuid, boolean, text, text, integer, integer
) from public;
revoke all on function public.phase6_alert_scheduler_status() from public;
revoke all on function public.phase6_claim_due_job_alerts(integer) from public;
revoke all on function public.phase6_match_job_alert_opportunities(
  uuid, timestamptz, integer
) from public;

grant execute on function public.phase6_jsonb_string_array_valid(
  jsonb, integer, integer, text[]
) to authenticated;
grant execute on function public.phase6_valid_search_plan(jsonb, text)
to authenticated;
grant execute on function public.phase6_consume_ask_lance_limit(uuid)
to authenticated;
grant execute on function public.phase6_finish_ask_lance_request(
  uuid, boolean, text, text, integer, integer
) to authenticated;
grant execute on function public.phase6_alert_scheduler_status()
to authenticated;
grant execute on function public.phase6_claim_due_job_alerts(integer)
to service_role;
grant execute on function public.phase6_match_job_alert_opportunities(
  uuid, timestamptz, integer
) to service_role;
