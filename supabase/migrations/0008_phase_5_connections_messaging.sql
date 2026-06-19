-- Lance Phase 5: intentional Connect requests, opportunity responses, messaging, and safety.
-- Apply once after 0007. Existing Phase 1 relationship tables are extended rather than duplicated.

alter type public.opportunity_interest_status add value if not exists 'submitted';
alter type public.opportunity_interest_status add value if not exists 'in_discussion';
alter type public.opportunity_interest_status add value if not exists 'declined';
alter type public.opportunity_interest_status add value if not exists 'closed';

alter type public.report_target_type add value if not exists 'business';
alter type public.report_target_type add value if not exists 'connection_request';
alter type public.report_target_type add value if not exists 'opportunity_response';

create type public.connection_request_status as enum (
  'pending',
  'accepted',
  'declined',
  'withdrawn',
  'expired'
);

create type public.connect_reason as enum (
  'build_together',
  'cofounder',
  'hire_or_help',
  'offer_skills',
  'project',
  'network',
  'ask_about_work',
  'mentorship',
  'other'
);

create table public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.profiles(id) on delete restrict,
  recipient_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason public.connect_reason not null,
  note text,
  portfolio_item_id uuid references public.portfolio_items(id) on delete set null,
  status public.connection_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  withdrawn_at timestamptz,
  expires_at timestamptz not null default (now() + interval '90 days'),
  constraint connection_requests_no_self check (requester_profile_id <> recipient_profile_id),
  constraint connection_requests_note_length check (note is null or char_length(note) <= 300),
  constraint connection_requests_other_explanation check (
    reason <> 'other' or char_length(trim(coalesce(note, ''))) > 0
  )
);

create unique index connection_requests_one_pending_pair_idx
on public.connection_requests (
  least(requester_profile_id, recipient_profile_id),
  greatest(requester_profile_id, recipient_profile_id)
)
where status = 'pending';

create index connection_requests_incoming_idx
on public.connection_requests (recipient_profile_id, status, created_at desc);

create index connection_requests_outgoing_idx
on public.connection_requests (requester_profile_id, status, created_at desc);

alter table public.opportunity_interests
add column if not exists note text,
add column if not exists portfolio_item_id uuid references public.portfolio_items(id) on delete set null,
add column if not exists owner_viewed_at timestamptz,
add column if not exists responded_at timestamptz,
add column if not exists withdrawn_at timestamptz,
add column if not exists compensation_acknowledged_at timestamptz;

alter table public.opportunity_interests
drop constraint if exists opportunity_interests_note_length,
add constraint opportunity_interests_note_length
  check (note is null or char_length(note) <= 500);

create table public.opportunity_interest_skills (
  opportunity_interest_id uuid not null
    references public.opportunity_interests(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (opportunity_interest_id, skill_id)
);

create index opportunity_interests_owner_phase5_idx
on public.opportunity_interests (owner_profile_id, status, created_at desc);

create index opportunity_interests_sender_phase5_idx
on public.opportunity_interests (interested_profile_id, status, created_at desc);

alter table public.matches
add column if not exists connection_request_id uuid
  references public.connection_requests(id) on delete set null;

create unique index if not exists matches_connection_request_idx
on public.matches (connection_request_id)
where connection_request_id is not null;

alter table public.conversations
alter column match_id drop not null,
add column if not exists conversation_type text not null default 'direct',
add column if not exists opportunity_interest_id uuid
  references public.opportunity_interests(id) on delete restrict,
add column if not exists opportunity_id uuid
  references public.opportunities(id) on delete set null,
add column if not exists business_id uuid
  references public.businesses(id) on delete set null,
add column if not exists created_by_profile_id uuid
  references public.profiles(id) on delete set null,
add column if not exists last_message_at timestamptz,
add column if not exists closed_at timestamptz;

alter table public.conversations
drop constraint if exists conversations_phase5_context_check,
add constraint conversations_phase5_context_check check (
  (
    conversation_type = 'direct'
    and match_id is not null
    and opportunity_interest_id is null
  )
  or (
    conversation_type = 'opportunity'
    and match_id is null
    and opportunity_interest_id is not null
    and opportunity_id is not null
  )
);

create unique index conversations_one_opportunity_response_idx
on public.conversations (opportunity_interest_id)
where opportunity_interest_id is not null;

create index conversations_recent_activity_idx
on public.conversations (coalesce(last_message_at, created_at) desc);

alter table public.conversation_members
add column if not exists participant_role text not null default 'member',
add column if not exists archived_at timestamptz;

create index conversation_members_unread_idx
on public.conversation_members (profile_id, last_read_at, conversation_id);

alter table public.messages
add column if not exists message_type text not null default 'text',
add column if not exists client_nonce uuid;

alter table public.messages
drop constraint if exists messages_body_length,
add constraint messages_body_length check (
  char_length(trim(body)) between 1 and 2000
),
drop constraint if exists messages_type_check,
add constraint messages_type_check check (message_type = 'text');

create unique index messages_sender_nonce_idx
on public.messages (sender_profile_id, client_nonce)
where client_nonce is not null;

create index messages_conversation_phase5_idx
on public.messages (conversation_id, created_at desc, id desc)
where deleted_at is null;

alter table public.reports
add column if not exists business_id uuid references public.businesses(id) on delete set null,
add column if not exists connection_request_id uuid
  references public.connection_requests(id) on delete set null,
add column if not exists opportunity_interest_id uuid
  references public.opportunity_interests(id) on delete set null,
add column if not exists related_profile_id uuid references public.profiles(id) on delete set null;

create index reports_reporter_target_idx
on public.reports (reporter_profile_id, target_type, created_at desc);

create table public.communication_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  connect_request_setting text not null default 'everyone',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_preferences_connect_check
    check (connect_request_setting in ('everyone', 'no_new_requests'))
);

drop trigger if exists connection_requests_set_updated_at on public.connection_requests;
create trigger connection_requests_set_updated_at
before update on public.connection_requests
for each row execute function public.set_updated_at();

drop trigger if exists communication_preferences_set_updated_at
on public.communication_preferences;
create trigger communication_preferences_set_updated_at
before update on public.communication_preferences
for each row execute function public.set_updated_at();

create or replace function public.phase5_profiles_blocked(
  first_profile_id uuid,
  second_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks block
    where (
      block.blocker_profile_id = first_profile_id
      and block.blocked_profile_id = second_profile_id
    ) or (
      block.blocker_profile_id = second_profile_id
      and block.blocked_profile_id = first_profile_id
    )
  );
$$;

create or replace function public.phase5_is_conversation_participant(
  target_conversation_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members member
    where member.conversation_id = target_conversation_id
      and member.profile_id = target_profile_id
  );
$$;

create or replace function public.phase5_other_conversation_profile(
  target_conversation_id uuid,
  target_profile_id uuid default auth.uid()
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select member.profile_id
  from public.conversation_members member
  where member.conversation_id = target_conversation_id
    and member.profile_id <> target_profile_id
  limit 1;
$$;

create or replace function public.phase5_ensure_direct_conversation(
  target_connection_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_connection public.matches;
  saved_conversation_id uuid;
begin
  select *
  into target_connection
  from public.matches
  where id = target_connection_id
    and match_type = 'person'
    and status = 'active';

  if target_connection.id is null then
    raise exception 'The connection is not active.';
  end if;

  select id into saved_conversation_id
  from public.conversations
  where match_id = target_connection.id
  limit 1;

  if saved_conversation_id is null then
    insert into public.conversations (
      match_id,
      conversation_type,
      created_by_profile_id
    )
    values (
      target_connection.id,
      'direct',
      auth.uid()
    )
    returning id into saved_conversation_id;
  end if;

  insert into public.conversation_members (
    conversation_id,
    profile_id,
    participant_role
  )
  values
    (saved_conversation_id, target_connection.profile_one_id, 'connection'),
    (saved_conversation_id, target_connection.profile_two_id, 'connection')
  on conflict (conversation_id, profile_id) do nothing;

  return saved_conversation_id;
end;
$$;

create or replace function public.phase5_accept_connection_request(
  target_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  target_request public.connection_requests;
  connection_id uuid;
  conversation_id uuid;
begin
  if current_profile_id is null then
    raise exception 'Sign in again to continue.';
  end if;

  select *
  into target_request
  from public.connection_requests
  where id = target_request_id
  for update;

  if target_request.id is null
    or target_request.recipient_profile_id <> current_profile_id
    or target_request.status <> 'pending'
    or target_request.expires_at <= now()
  then
    raise exception 'This request is no longer available.';
  end if;

  if public.phase5_profiles_blocked(
    target_request.requester_profile_id,
    target_request.recipient_profile_id
  ) then
    raise exception 'This connection cannot be completed.';
  end if;

  update public.connection_requests
  set status = 'accepted',
      responded_at = now()
  where id = target_request.id;

  select id into connection_id
  from public.matches
  where match_type = 'person'
    and status = 'active'
    and least(profile_one_id, profile_two_id) =
      least(target_request.requester_profile_id, target_request.recipient_profile_id)
    and greatest(profile_one_id, profile_two_id) =
      greatest(target_request.requester_profile_id, target_request.recipient_profile_id)
  limit 1;

  if connection_id is null then
    begin
      insert into public.matches (
        match_type,
        profile_one_id,
        profile_two_id,
        status,
        connection_request_id
      )
      values (
        'person',
        least(target_request.requester_profile_id, target_request.recipient_profile_id),
        greatest(target_request.requester_profile_id, target_request.recipient_profile_id),
        'active',
        target_request.id
      )
      returning id into connection_id;
    exception when unique_violation then
      select id into connection_id
      from public.matches
      where match_type = 'person'
        and status = 'active'
        and least(profile_one_id, profile_two_id) =
          least(target_request.requester_profile_id, target_request.recipient_profile_id)
        and greatest(profile_one_id, profile_two_id) =
          greatest(target_request.requester_profile_id, target_request.recipient_profile_id)
      limit 1;
    end;
  end if;

  conversation_id := public.phase5_ensure_direct_conversation(connection_id);

  return jsonb_build_object(
    'state', 'connected',
    'request_id', target_request.id,
    'connection_id', connection_id,
    'conversation_id', conversation_id
  );
end;
$$;

create or replace function public.phase5_send_connection_request(
  target_profile_id uuid,
  target_reason public.connect_reason,
  target_note text default null,
  target_portfolio_item_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  normalized_note text := nullif(trim(coalesce(target_note, '')), '');
  existing_request public.connection_requests;
  existing_connection_id uuid;
  existing_conversation_id uuid;
  saved_request_id uuid;
begin
  if current_profile_id is null then
    raise exception 'Sign in again to continue.';
  end if;
  if target_profile_id is null or target_profile_id = current_profile_id then
    raise exception 'Choose another person to connect with.';
  end if;
  if normalized_note is not null and char_length(normalized_note) > 300 then
    raise exception 'Keep your note under 300 characters.';
  end if;
  if target_reason = 'other' and normalized_note is null then
    raise exception 'Add a short explanation for Other.';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = target_profile_id
      and profile.deleted_at is null
      and profile.onboarding_completed_at is not null
  ) then
    raise exception 'This profile is not available.';
  end if;
  if public.phase5_profiles_blocked(current_profile_id, target_profile_id) then
    raise exception 'This connection request is not available.';
  end if;
  if coalesce((
    select preference.connect_request_setting
    from public.communication_preferences preference
    where preference.profile_id = target_profile_id
  ), 'everyone') = 'no_new_requests' then
    raise exception 'This person is not accepting new connection requests.';
  end if;
  if target_portfolio_item_id is not null and not exists (
    select 1 from public.portfolio_items portfolio
    where portfolio.id = target_portfolio_item_id
      and portfolio.profile_id = current_profile_id
  ) then
    raise exception 'Choose one of your available portfolio items.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'connect-pair:' ||
      least(current_profile_id, target_profile_id)::text || ':' ||
      greatest(current_profile_id, target_profile_id)::text,
      0
    )
  );

  update public.connection_requests
  set status = 'expired',
      responded_at = coalesce(responded_at, now())
  where status = 'pending'
    and expires_at <= now()
    and least(requester_profile_id, recipient_profile_id) =
      least(current_profile_id, target_profile_id)
    and greatest(requester_profile_id, recipient_profile_id) =
      greatest(current_profile_id, target_profile_id);

  select id into existing_connection_id
  from public.matches
  where match_type = 'person'
    and status = 'active'
    and least(profile_one_id, profile_two_id) =
      least(current_profile_id, target_profile_id)
    and greatest(profile_one_id, profile_two_id) =
      greatest(current_profile_id, target_profile_id)
  limit 1;

  if existing_connection_id is not null then
    existing_conversation_id :=
      public.phase5_ensure_direct_conversation(existing_connection_id);
    return jsonb_build_object(
      'state', 'connected',
      'connection_id', existing_connection_id,
      'conversation_id', existing_conversation_id
    );
  end if;

  select *
  into existing_request
  from public.connection_requests request
  where request.requester_profile_id = target_profile_id
    and request.recipient_profile_id = current_profile_id
    and request.status = 'pending'
    and request.expires_at > now()
  order by request.created_at desc
  limit 1;

  if existing_request.id is not null then
    return public.phase5_accept_connection_request(existing_request.id);
  end if;

  select *
  into existing_request
  from public.connection_requests request
  where request.requester_profile_id = current_profile_id
    and request.recipient_profile_id = target_profile_id
    and request.status = 'pending'
    and request.expires_at > now()
  order by request.created_at desc
  limit 1;

  if existing_request.id is not null then
    return jsonb_build_object('state', 'requested', 'request_id', existing_request.id);
  end if;

  if exists (
    select 1 from public.connection_requests request
    where least(request.requester_profile_id, request.recipient_profile_id) =
      least(current_profile_id, target_profile_id)
      and greatest(request.requester_profile_id, request.recipient_profile_id) =
      greatest(current_profile_id, target_profile_id)
      and (
        (request.status = 'declined' and request.responded_at > now() - interval '30 days')
        or
        (request.status = 'withdrawn' and request.withdrawn_at > now() - interval '7 days')
      )
  ) then
    raise exception 'A new request is not available yet.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'connect-rate:' || current_profile_id::text,
      0
    )
  );

  if (
    select count(*)
    from public.connection_requests request
    where request.requester_profile_id = current_profile_id
      and request.created_at > now() - interval '24 hours'
  ) >= 25 then
    raise exception 'You have reached the current request limit. Try again later.';
  end if;

  insert into public.connection_requests (
    requester_profile_id,
    recipient_profile_id,
    reason,
    note,
    portfolio_item_id
  )
  values (
    current_profile_id,
    target_profile_id,
    target_reason,
    normalized_note,
    target_portfolio_item_id
  )
  returning id into saved_request_id;

  return jsonb_build_object('state', 'requested', 'request_id', saved_request_id);
end;
$$;

create or replace function public.phase5_update_connection_request(
  target_request_id uuid,
  target_action text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  target_request public.connection_requests;
begin
  select * into target_request
  from public.connection_requests
  where id = target_request_id
  for update;

  if target_request.id is null or target_request.status <> 'pending' then
    raise exception 'This request is no longer available.';
  end if;
  if target_request.expires_at <= now() then
    update public.connection_requests
    set status = 'expired',
        responded_at = coalesce(responded_at, now())
    where id = target_request.id;
    raise exception 'This request is no longer available.';
  end if;

  if target_action = 'withdraw'
    and target_request.requester_profile_id = current_profile_id then
    update public.connection_requests
    set status = 'withdrawn', withdrawn_at = now()
    where id = target_request.id;
  elsif target_action = 'decline'
    and target_request.recipient_profile_id = current_profile_id then
    update public.connection_requests
    set status = 'declined', responded_at = now()
    where id = target_request.id;
  else
    raise exception 'You cannot perform that request action.';
  end if;
end;
$$;

create or replace function public.phase5_send_opportunity_response(
  target_opportunity_id uuid,
  target_note text default null,
  target_portfolio_item_id uuid default null,
  target_skill_ids uuid[] default '{}',
  compensation_acknowledged boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  target_opportunity public.opportunities;
  saved_interest_id uuid;
  normalized_note text := nullif(trim(coalesce(target_note, '')), '');
begin
  if current_profile_id is null then
    raise exception 'Sign in again to continue.';
  end if;
  if normalized_note is not null and char_length(normalized_note) > 500 then
    raise exception 'Keep your note under 500 characters.';
  end if;
  if cardinality(coalesce(target_skill_ids, '{}')) > 5 then
    raise exception 'Choose up to five relevant skills.';
  end if;

  select * into target_opportunity
  from public.opportunities
  where id = target_opportunity_id
  for share;

  if target_opportunity.id is null
    or target_opportunity.status <> 'published'
    or target_opportunity.deleted_at is not null
    or (target_opportunity.expires_at is not null and target_opportunity.expires_at <= now())
  then
    raise exception 'This opportunity is not accepting new interest.';
  end if;
  if target_opportunity.owner_profile_id = current_profile_id then
    raise exception 'You cannot respond to your own opportunity.';
  end if;
  if public.phase5_profiles_blocked(
    current_profile_id,
    target_opportunity.owner_profile_id
  ) then
    raise exception 'This opportunity response is not available.';
  end if;
  if target_portfolio_item_id is not null and not exists (
    select 1 from public.portfolio_items portfolio
    where portfolio.id = target_portfolio_item_id
      and portfolio.profile_id = current_profile_id
  ) then
    raise exception 'Choose one of your available portfolio items.';
  end if;
  if exists (
    select 1
    from unnest(coalesce(target_skill_ids, '{}')) selected_skill_id
    where not exists (
      select 1 from public.profile_skills profile_skill
      where profile_skill.profile_id = current_profile_id
        and profile_skill.skill_id = selected_skill_id
    )
  ) then
    raise exception 'Choose skills that are already on your profile.';
  end if;
  if not public.is_clearly_paid(
    target_opportunity.compensation_type,
    target_opportunity.compensation_min
  ) and not compensation_acknowledged then
    raise exception 'Acknowledge the compensation notice before continuing.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'opportunity-response-rate:' || current_profile_id::text,
      0
    )
  );

  if (
    select count(*)
    from public.opportunity_interests interest
    where interest.interested_profile_id = current_profile_id
      and interest.created_at > now() - interval '24 hours'
  ) >= 25 then
    raise exception 'You have reached the current response limit. Try again later.';
  end if;

  insert into public.opportunity_interests (
    opportunity_id,
    interested_profile_id,
    owner_profile_id,
    status,
    note,
    portfolio_item_id,
    compensation_acknowledged_at
  )
  values (
    target_opportunity.id,
    current_profile_id,
    target_opportunity.owner_profile_id,
    'submitted',
    normalized_note,
    target_portfolio_item_id,
    case when compensation_acknowledged then now() else null end
  )
  returning id into saved_interest_id;

  insert into public.opportunity_interest_skills (
    opportunity_interest_id,
    skill_id
  )
  select saved_interest_id, selected_skill_id
  from unnest(coalesce(target_skill_ids, '{}')) selected_skill_id
  on conflict do nothing;

  return saved_interest_id;
exception when unique_violation then
  raise exception 'You already responded to this opportunity.';
end;
$$;

create or replace function public.phase5_start_opportunity_conversation(
  target_interest_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  target_interest public.opportunity_interests;
  target_opportunity public.opportunities;
  saved_conversation_id uuid;
begin
  select * into target_interest
  from public.opportunity_interests
  where id = target_interest_id
  for update;

  if target_interest.id is null
    or target_interest.owner_profile_id <> current_profile_id
    or target_interest.status not in ('submitted', 'in_discussion')
  then
    raise exception 'This response is not available for discussion.';
  end if;
  if public.phase5_profiles_blocked(
    target_interest.interested_profile_id,
    target_interest.owner_profile_id
  ) then
    raise exception 'This conversation cannot be started.';
  end if;

  select * into target_opportunity
  from public.opportunities
  where id = target_interest.opportunity_id;

  update public.opportunity_interests
  set status = 'in_discussion',
      responded_at = coalesce(responded_at, now()),
      owner_viewed_at = coalesce(owner_viewed_at, now())
  where id = target_interest.id;

  select id into saved_conversation_id
  from public.conversations
  where opportunity_interest_id = target_interest.id
  limit 1;

  if saved_conversation_id is null then
    insert into public.conversations (
      match_id,
      conversation_type,
      opportunity_interest_id,
      opportunity_id,
      business_id,
      created_by_profile_id
    )
    values (
      null,
      'opportunity',
      target_interest.id,
      target_interest.opportunity_id,
      target_opportunity.business_id,
      current_profile_id
    )
    returning id into saved_conversation_id;
  end if;

  insert into public.conversation_members (
    conversation_id,
    profile_id,
    participant_role
  )
  values
    (saved_conversation_id, target_interest.owner_profile_id, 'opportunity_owner'),
    (saved_conversation_id, target_interest.interested_profile_id, 'responder')
  on conflict (conversation_id, profile_id) do nothing;

  return saved_conversation_id;
end;
$$;

create or replace function public.phase5_update_opportunity_response(
  target_interest_id uuid,
  target_action text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  target_interest public.opportunity_interests;
begin
  select * into target_interest
  from public.opportunity_interests
  where id = target_interest_id
  for update;

  if target_interest.id is null then
    raise exception 'This response is not available.';
  end if;

  if target_action = 'withdraw'
    and target_interest.interested_profile_id = current_profile_id
    and target_interest.status in ('submitted', 'in_discussion') then
    update public.opportunity_interests
    set status = 'withdrawn', withdrawn_at = now()
    where id = target_interest.id;
  elsif target_action = 'decline'
    and target_interest.owner_profile_id = current_profile_id
    and target_interest.status in ('submitted', 'in_discussion') then
    update public.opportunity_interests
    set status = 'declined', responded_at = now(),
        owner_viewed_at = coalesce(owner_viewed_at, now())
    where id = target_interest.id;
  elsif target_action = 'close'
    and target_interest.owner_profile_id = current_profile_id
    and target_interest.status in ('submitted', 'in_discussion') then
    update public.opportunity_interests
    set status = 'closed', responded_at = now(),
        owner_viewed_at = coalesce(owner_viewed_at, now())
    where id = target_interest.id;
  else
    raise exception 'You cannot perform that response action.';
  end if;
end;
$$;

create or replace function public.phase5_send_message(
  target_conversation_id uuid,
  target_body text,
  target_client_nonce uuid
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  normalized_body text := trim(coalesce(target_body, ''));
  other_profile_id uuid;
  saved_message public.messages;
begin
  if current_profile_id is null then
    raise exception 'Sign in again to send a message.';
  end if;
  if char_length(normalized_body) not between 1 and 2000 then
    raise exception 'Messages must be between 1 and 2,000 characters.';
  end if;
  if target_client_nonce is null then
    raise exception 'A message nonce is required.';
  end if;
  if not public.phase5_is_conversation_participant(
    target_conversation_id,
    current_profile_id
  ) then
    raise exception 'This conversation is not available.';
  end if;
  if not exists (
    select 1 from public.conversations conversation
    where conversation.id = target_conversation_id
      and conversation.status = 'active'
  ) then
    raise exception 'This conversation is read-only.';
  end if;

  other_profile_id :=
    public.phase5_other_conversation_profile(target_conversation_id, current_profile_id);
  if other_profile_id is null
    or public.phase5_profiles_blocked(current_profile_id, other_profile_id) then
    raise exception 'Messaging is unavailable for this conversation.';
  end if;

  select * into saved_message
  from public.messages message
  where message.sender_profile_id = current_profile_id
    and message.client_nonce = target_client_nonce
  limit 1;

  if saved_message.id is not null then
    if saved_message.conversation_id <> target_conversation_id then
      raise exception 'This message nonce is not valid for this conversation.';
    end if;
    return saved_message;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'message-rate:' || current_profile_id::text,
      0
    )
  );

  if (
    select count(*)
    from public.messages message
    where message.sender_profile_id = current_profile_id
      and message.created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'Messages are being sent too quickly. Pause and try again.';
  end if;

  insert into public.messages (
    conversation_id,
    sender_profile_id,
    body,
    message_type,
    client_nonce
  )
  values (
    target_conversation_id,
    current_profile_id,
    normalized_body,
    'text',
    target_client_nonce
  )
  on conflict (sender_profile_id, client_nonce)
    where client_nonce is not null
  do update set body = public.messages.body
  returning * into saved_message;

  return saved_message;
end;
$$;

create or replace function public.phase5_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.phase5_touch_conversation();

create or replace function public.phase5_mark_conversation_read(
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.phase5_is_conversation_participant(
    target_conversation_id,
    auth.uid()
  ) then
    raise exception 'This conversation is not available.';
  end if;

  update public.conversation_members
  set last_read_at = now()
  where conversation_id = target_conversation_id
    and profile_id = auth.uid();
end;
$$;

create or replace function public.phase5_block_profile(
  target_profile_id uuid,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
begin
  if current_profile_id is null or target_profile_id = current_profile_id then
    raise exception 'Choose another profile to block.';
  end if;

  insert into public.blocks (
    blocker_profile_id,
    blocked_profile_id,
    reason
  )
  values (
    current_profile_id,
    target_profile_id,
    nullif(trim(coalesce(target_reason, '')), '')
  )
  on conflict (blocker_profile_id, blocked_profile_id) do nothing;

  update public.connection_requests
  set status = case
        when requester_profile_id = current_profile_id then 'withdrawn'
        else 'declined'
      end,
      withdrawn_at = case
        when requester_profile_id = current_profile_id then now()
        else withdrawn_at
      end,
      responded_at = case
        when recipient_profile_id = current_profile_id then now()
        else responded_at
      end
  where status = 'pending'
    and least(requester_profile_id, recipient_profile_id) =
      least(current_profile_id, target_profile_id)
    and greatest(requester_profile_id, recipient_profile_id) =
      greatest(current_profile_id, target_profile_id);

  update public.opportunity_interests
  set status = case
        when interested_profile_id = current_profile_id then 'withdrawn'
        else 'declined'
      end,
      withdrawn_at = case
        when interested_profile_id = current_profile_id then now()
        else withdrawn_at
      end,
      responded_at = case
        when owner_profile_id = current_profile_id then now()
        else responded_at
      end
  where status in ('submitted', 'in_discussion')
    and least(interested_profile_id, owner_profile_id) =
      least(current_profile_id, target_profile_id)
    and greatest(interested_profile_id, owner_profile_id) =
      greatest(current_profile_id, target_profile_id);

  update public.matches
  set status = 'blocked',
      unmatched_by_profile_id = current_profile_id,
      unmatched_at = now()
  where match_type = 'person'
    and status = 'active'
    and least(profile_one_id, profile_two_id) =
      least(current_profile_id, target_profile_id)
    and greatest(profile_one_id, profile_two_id) =
      greatest(current_profile_id, target_profile_id);

  update public.conversations conversation
  set status = 'blocked'
  where public.phase5_is_conversation_participant(conversation.id, current_profile_id)
    and public.phase5_is_conversation_participant(conversation.id, target_profile_id);
end;
$$;

create or replace function public.phase5_unblock_profile(
  target_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
begin
  delete from public.blocks
  where blocker_profile_id = current_profile_id
    and blocked_profile_id = target_profile_id;

  update public.conversations conversation
  set status = 'active'
  where conversation.status = 'blocked'
    and public.phase5_is_conversation_participant(conversation.id, current_profile_id)
    and public.phase5_is_conversation_participant(conversation.id, target_profile_id)
    and (
      (
        conversation.conversation_type = 'direct'
        and exists (
          select 1 from public.matches connection
          where connection.id = conversation.match_id
            and connection.status in ('active', 'blocked')
        )
      )
      or (
        conversation.conversation_type = 'opportunity'
        and exists (
          select 1 from public.opportunity_interests interest
          where interest.id = conversation.opportunity_interest_id
            and interest.status = 'in_discussion'
        )
      )
    )
    and not public.phase5_profiles_blocked(current_profile_id, target_profile_id);

  update public.matches
  set status = 'active',
      unmatched_by_profile_id = null,
      unmatched_at = null
  where match_type = 'person'
    and status = 'blocked'
    and least(profile_one_id, profile_two_id) =
      least(current_profile_id, target_profile_id)
    and greatest(profile_one_id, profile_two_id) =
      greatest(current_profile_id, target_profile_id)
    and not public.phase5_profiles_blocked(current_profile_id, target_profile_id);
end;
$$;

create or replace function public.phase5_submit_report(
  target_kind text,
  target_id uuid,
  target_reason text,
  target_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  saved_report_id uuid;
  related_user_id uuid;
  mapped_type public.report_target_type;
begin
  if current_profile_id is null then
    raise exception 'Sign in again to submit a report.';
  end if;
  if target_reason not in (
    'spam_scam','harassment','impersonation','inappropriate_content',
    'misleading_opportunity','discrimination','compensation_concern',
    'underage_concern','other'
  ) then
    raise exception 'Choose a valid report reason.';
  end if;
  if char_length(trim(coalesce(target_details, ''))) > 1000 then
    raise exception 'Keep report details under 1,000 characters.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'report-rate:' || current_profile_id::text,
      0
    )
  );

  if (
    select count(*) from public.reports report
    where report.reporter_profile_id = current_profile_id
      and report.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Reports are being submitted too quickly. Try again later.';
  end if;

  mapped_type := target_kind::public.report_target_type;

  if target_kind = 'profile' then
    related_user_id := target_id;
  elsif target_kind = 'business' then
    select owner_profile_id into related_user_id
    from public.businesses where id = target_id;
  elsif target_kind = 'opportunity' then
    select owner_profile_id into related_user_id
    from public.opportunities where id = target_id;
  elsif target_kind = 'connection_request' then
    select case
      when requester_profile_id = current_profile_id then recipient_profile_id
      else requester_profile_id
    end into related_user_id
    from public.connection_requests
    where id = target_id
      and current_profile_id in (requester_profile_id, recipient_profile_id);
  elsif target_kind = 'opportunity_response' then
    select case
      when interested_profile_id = current_profile_id then owner_profile_id
      else interested_profile_id
    end into related_user_id
    from public.opportunity_interests
    where id = target_id
      and current_profile_id in (interested_profile_id, owner_profile_id);
  elsif target_kind = 'conversation' then
    if not public.phase5_is_conversation_participant(target_id, current_profile_id) then
      raise exception 'This conversation is not available.';
    end if;
    related_user_id :=
      public.phase5_other_conversation_profile(target_id, current_profile_id);
  elsif target_kind = 'message' then
    select sender_profile_id into related_user_id
    from public.messages
    where id = target_id
      and public.phase5_is_conversation_participant(
        conversation_id,
        current_profile_id
      );
  else
    raise exception 'This report target is not supported.';
  end if;

  if related_user_id is null or related_user_id = current_profile_id then
    raise exception 'This report target is not available.';
  end if;

  if exists (
    select 1 from public.reports report
    where report.reporter_profile_id = current_profile_id
      and report.target_type = mapped_type
      and report.related_profile_id = related_user_id
      and report.reason = target_reason
      and report.created_at > now() - interval '10 minutes'
  ) then
    raise exception 'You already submitted a similar report recently.';
  end if;

  insert into public.reports (
    reporter_profile_id,
    target_type,
    target_profile_id,
    opportunity_id,
    conversation_id,
    message_id,
    business_id,
    connection_request_id,
    opportunity_interest_id,
    related_profile_id,
    reason,
    details
  )
  values (
    current_profile_id,
    mapped_type,
    case when target_kind = 'profile' then target_id else null end,
    case when target_kind = 'opportunity' then target_id else null end,
    case when target_kind = 'conversation' then target_id else null end,
    case when target_kind = 'message' then target_id else null end,
    case when target_kind = 'business' then target_id else null end,
    case when target_kind = 'connection_request' then target_id else null end,
    case when target_kind = 'opportunity_response' then target_id else null end,
    related_user_id,
    target_reason,
    nullif(trim(coalesce(target_details, '')), '')
  )
  returning id into saved_report_id;

  return saved_report_id;
end;
$$;

create or replace function public.phase5_mark_responses_viewed(
  target_opportunity_id uuid default null,
  target_business_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
begin
  if current_profile_id is null then
    raise exception 'Sign in again to continue.';
  end if;
  if target_opportunity_id is null and target_business_id is null then
    raise exception 'Choose an opportunity or business.';
  end if;

  update public.opportunity_interests interest
  set owner_viewed_at = coalesce(interest.owner_viewed_at, now())
  from public.opportunities opportunity
  where opportunity.id = interest.opportunity_id
    and interest.owner_profile_id = current_profile_id
    and (
      target_opportunity_id is not null
      and interest.opportunity_id = target_opportunity_id
      or target_business_id is not null
      and opportunity.business_id = target_business_id
    );
end;
$$;

create or replace function public.phase5_relationship_state(
  target_profile_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  request_row public.connection_requests;
  connection_id uuid;
  conversation_id uuid;
  blocked_by_me boolean;
  blocked_either boolean;
begin
  blocked_by_me := exists (
    select 1 from public.blocks block
    where block.blocker_profile_id = current_profile_id
      and block.blocked_profile_id = target_profile_id
  );
  blocked_either := public.phase5_profiles_blocked(current_profile_id, target_profile_id);

  select id into connection_id
  from public.matches
  where match_type = 'person'
    and status = 'active'
    and least(profile_one_id, profile_two_id) =
      least(current_profile_id, target_profile_id)
    and greatest(profile_one_id, profile_two_id) =
      greatest(current_profile_id, target_profile_id)
  limit 1;

  if connection_id is not null then
    select id into conversation_id
    from public.conversations where match_id = connection_id limit 1;
    return jsonb_build_object(
      'state', 'connected',
      'connection_id', connection_id,
      'conversation_id', conversation_id,
      'blocked_by_me', blocked_by_me,
      'blocked', blocked_either
    );
  end if;

  select * into request_row
  from public.connection_requests request
  where request.status = 'pending'
    and request.expires_at > now()
    and least(request.requester_profile_id, request.recipient_profile_id) =
      least(current_profile_id, target_profile_id)
    and greatest(request.requester_profile_id, request.recipient_profile_id) =
      greatest(current_profile_id, target_profile_id)
  order by request.created_at desc
  limit 1;

  return jsonb_build_object(
    'state', case
      when blocked_either then 'blocked'
      when request_row.id is null then 'none'
      when request_row.requester_profile_id = current_profile_id then 'outgoing_pending'
      else 'incoming_pending'
    end,
    'request_id', request_row.id,
    'blocked_by_me', blocked_by_me,
    'blocked', blocked_either
  );
end;
$$;

create or replace function public.phase5_opportunity_response_state(
  target_opportunity_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'response_id', interest.id,
      'status', interest.status::text,
      'conversation_id', conversation.id
    )
    from public.opportunity_interests interest
    left join public.conversations conversation
      on conversation.opportunity_interest_id = interest.id
    where interest.opportunity_id = target_opportunity_id
      and interest.interested_profile_id = auth.uid()
    limit 1
  ), jsonb_build_object('status', 'none'));
$$;

create or replace function public.phase5_unread_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.messages message
  join public.conversation_members member
    on member.conversation_id = message.conversation_id
  where member.profile_id = auth.uid()
    and message.sender_profile_id <> auth.uid()
    and message.deleted_at is null
    and message.created_at > coalesce(member.last_read_at, '-infinity'::timestamptz);
$$;

create or replace function public.phase5_filter_profile_ids(
  target_profile_ids uuid[]
)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(candidate.profile_id order by candidate.ordinality), '{}')
  from unnest(coalesce(target_profile_ids, '{}')) with ordinality
    as candidate(profile_id, ordinality)
  where candidate.profile_id <> auth.uid()
    and not public.phase5_profiles_blocked(auth.uid(), candidate.profile_id);
$$;

create or replace function public.phase5_filter_opportunity_ids(
  target_opportunity_ids uuid[]
)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(candidate.opportunity_id order by candidate.ordinality), '{}')
  from unnest(coalesce(target_opportunity_ids, '{}')) with ordinality
    as candidate(opportunity_id, ordinality)
  join public.opportunities opportunity
    on opportunity.id = candidate.opportunity_id
  where opportunity.owner_profile_id <> auth.uid()
    and not public.phase5_profiles_blocked(
      auth.uid(),
      opportunity.owner_profile_id
    );
$$;

create or replace function public.phase5_list_chats(
  target_limit integer default 20,
  target_offset integer default 0
)
returns table (
  conversation_id uuid,
  conversation_type text,
  conversation_status text,
  other_profile_id uuid,
  other_display_name text,
  other_avatar_url text,
  opportunity_id uuid,
  opportunity_title text,
  business_name text,
  last_message_body text,
  last_message_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    conversation.id,
    conversation.conversation_type,
    conversation.status::text,
    other_profile.id,
    other_profile.display_name,
    other_profile.avatar_url,
    conversation.opportunity_id,
    opportunity.title,
    business.name,
    last_message.body,
    coalesce(last_message.created_at, conversation.created_at),
    (
      select count(*)
      from public.messages unread_message
      where unread_message.conversation_id = conversation.id
        and unread_message.sender_profile_id <> auth.uid()
        and unread_message.deleted_at is null
        and unread_message.created_at >
          coalesce(my_membership.last_read_at, '-infinity'::timestamptz)
    )
  from public.conversation_members my_membership
  join public.conversations conversation
    on conversation.id = my_membership.conversation_id
  join public.conversation_members other_membership
    on other_membership.conversation_id = conversation.id
    and other_membership.profile_id <> auth.uid()
  join public.profiles other_profile
    on other_profile.id = other_membership.profile_id
  left join public.opportunities opportunity
    on opportunity.id = conversation.opportunity_id
  left join public.businesses business
    on business.id = conversation.business_id
  left join lateral (
    select message.body, message.created_at
    from public.messages message
    where message.conversation_id = conversation.id
      and message.deleted_at is null
    order by message.created_at desc, message.id desc
    limit 1
  ) last_message on true
  where my_membership.profile_id = auth.uid()
    and my_membership.archived_at is null
  order by coalesce(
    last_message.created_at,
    conversation.last_message_at,
    conversation.created_at
  ) desc
  limit least(greatest(target_limit, 1), 50)
  offset greatest(target_offset, 0);
$$;

alter table public.connection_requests enable row level security;
alter table public.opportunity_interest_skills enable row level security;
alter table public.communication_preferences enable row level security;

drop policy if exists "Opportunity interest visible to participant or owner"
on public.opportunity_interests;
drop policy if exists "Users create their own opportunity interest"
on public.opportunity_interests;
drop policy if exists "Opportunity owners and interested users update interest"
on public.opportunity_interests;
drop policy if exists "Create person or opportunity match only after confirmed interest"
on public.matches;
drop policy if exists "Match participants can unmatch" on public.matches;
drop policy if exists "Match participants can create conversations"
on public.conversations;
drop policy if exists "Conversation members can update conversations"
on public.conversations;
drop policy if exists "Match participants can add themselves to conversations"
on public.conversation_members;
drop policy if exists "Conversation members can send messages when not blocked"
on public.messages;
drop policy if exists "Senders can soft edit their messages" on public.messages;
drop policy if exists "Conversation members update their own member row"
on public.conversation_members;
drop policy if exists "Users manage their own blocks" on public.blocks;
drop policy if exists "Users create their own reports" on public.reports;

create policy "Connection request participants read requests"
on public.connection_requests for select
to authenticated
using (
  requester_profile_id = auth.uid()
  or recipient_profile_id = auth.uid()
);

create policy "Opportunity response participants read responses"
on public.opportunity_interests for select
to authenticated
using (
  interested_profile_id = auth.uid()
  or owner_profile_id = auth.uid()
);

create policy "Response participants read selected skills"
on public.opportunity_interest_skills for select
to authenticated
using (
  exists (
    select 1 from public.opportunity_interests interest
    where interest.id = opportunity_interest_id
      and auth.uid() in (
        interest.interested_profile_id,
        interest.owner_profile_id
      )
  )
);

create policy "Blockers read their own blocks"
on public.blocks for select
to authenticated
using (blocker_profile_id = auth.uid());

create policy "Users read their communication preferences"
on public.communication_preferences for select
to authenticated
using (profile_id = auth.uid());

create policy "Users create their communication preferences"
on public.communication_preferences for insert
to authenticated
with check (profile_id = auth.uid());

create policy "Users update their communication preferences"
on public.communication_preferences for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Existing select policies on matches, conversations, members, messages, and reports
-- remain participant/reporter scoped. All Phase 5 creation and transitions use the
-- narrow RPCs above; normal clients receive no direct insert/update grants here.

revoke all on public.connection_requests from anon;
revoke all on public.opportunity_interest_skills from anon;
revoke all on public.communication_preferences from anon;

revoke insert, update, delete on public.connection_requests from authenticated;
revoke insert, update, delete on public.opportunity_interests from authenticated;
revoke insert, update, delete on public.opportunity_interest_skills from authenticated;
revoke insert, update, delete on public.matches from authenticated;
revoke insert, update, delete on public.conversations from authenticated;
revoke insert, update, delete on public.conversation_members from authenticated;
revoke insert, update, delete on public.messages from authenticated;
revoke insert, update, delete on public.blocks from authenticated;
revoke insert, update, delete on public.reports from authenticated;

grant select on public.connection_requests to authenticated;
grant select on public.opportunity_interests to authenticated;
grant select on public.opportunity_interest_skills to authenticated;
grant select, insert, update on public.communication_preferences to authenticated;

revoke all on function public.phase5_profiles_blocked(uuid, uuid) from public;
revoke all on function public.phase5_is_conversation_participant(uuid, uuid) from public;
revoke all on function public.phase5_other_conversation_profile(uuid, uuid) from public;
revoke all on function public.phase5_ensure_direct_conversation(uuid) from public;
revoke all on function public.phase5_accept_connection_request(uuid) from public;
revoke all on function public.phase5_send_connection_request(
  uuid, public.connect_reason, text, uuid
) from public;
revoke all on function public.phase5_update_connection_request(uuid, text) from public;
revoke all on function public.phase5_send_opportunity_response(
  uuid, text, uuid, uuid[], boolean
) from public;
revoke all on function public.phase5_start_opportunity_conversation(uuid) from public;
revoke all on function public.phase5_update_opportunity_response(uuid, text) from public;
revoke all on function public.phase5_send_message(uuid, text, uuid) from public;
revoke all on function public.phase5_touch_conversation() from public;
revoke all on function public.phase5_mark_conversation_read(uuid) from public;
revoke all on function public.phase5_block_profile(uuid, text) from public;
revoke all on function public.phase5_unblock_profile(uuid) from public;
revoke all on function public.phase5_submit_report(text, uuid, text, text) from public;
revoke all on function public.phase5_mark_responses_viewed(uuid, uuid) from public;
revoke all on function public.phase5_relationship_state(uuid) from public;
revoke all on function public.phase5_opportunity_response_state(uuid) from public;
revoke all on function public.phase5_unread_count() from public;
revoke all on function public.phase5_filter_profile_ids(uuid[]) from public;
revoke all on function public.phase5_filter_opportunity_ids(uuid[]) from public;
revoke all on function public.phase5_list_chats(integer, integer) from public;

grant execute on function public.phase5_accept_connection_request(uuid) to authenticated;
grant execute on function public.phase5_send_connection_request(
  uuid, public.connect_reason, text, uuid
) to authenticated;
grant execute on function public.phase5_update_connection_request(uuid, text)
to authenticated;
grant execute on function public.phase5_send_opportunity_response(
  uuid, text, uuid, uuid[], boolean
) to authenticated;
grant execute on function public.phase5_start_opportunity_conversation(uuid)
to authenticated;
grant execute on function public.phase5_update_opportunity_response(uuid, text)
to authenticated;
grant execute on function public.phase5_send_message(uuid, text, uuid)
to authenticated;
grant execute on function public.phase5_mark_conversation_read(uuid)
to authenticated;
grant execute on function public.phase5_block_profile(uuid, text)
to authenticated;
grant execute on function public.phase5_unblock_profile(uuid)
to authenticated;
grant execute on function public.phase5_submit_report(text, uuid, text, text)
to authenticated;
grant execute on function public.phase5_mark_responses_viewed(uuid, uuid)
to authenticated;
grant execute on function public.phase5_relationship_state(uuid)
to authenticated;
grant execute on function public.phase5_opportunity_response_state(uuid)
to authenticated;
grant execute on function public.phase5_unread_count()
to authenticated;
grant execute on function public.phase5_filter_profile_ids(uuid[])
to authenticated;
grant execute on function public.phase5_filter_opportunity_ids(uuid[])
to authenticated;
grant execute on function public.phase5_list_chats(integer, integer)
to authenticated;

-- Postgres Changes is the Expo-compatible Phase 5 Realtime transport. RLS still
-- determines which message rows each authenticated subscriber may receive.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
