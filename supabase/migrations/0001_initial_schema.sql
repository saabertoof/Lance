-- Lance Phase 1 database foundation.
-- Run this in a Supabase project before using real auth credentials.

create extension if not exists pgcrypto;

create type public.user_intent as enum (
  'finding_opportunities',
  'finding_people',
  'both'
);

create type public.remote_preference as enum (
  'remote',
  'hybrid',
  'in_person',
  'flexible'
);

create type public.experience_level as enum (
  'student',
  'early',
  'mid',
  'senior',
  'founder',
  'other'
);

create type public.availability_status as enum (
  'available',
  'open_to_offers',
  'busy',
  'not_available'
);

create type public.opportunity_type as enum (
  'paid_freelance',
  'ongoing_part_time',
  'cofounder',
  'revenue_share',
  'commission',
  'equity',
  'project_collaboration',
  'open_to_discussing'
);

create type public.compensation_type as enum (
  'paid',
  'unpaid',
  'commission',
  'revenue_share',
  'equity',
  'negotiable'
);

create type public.opportunity_status as enum (
  'draft',
  'published',
  'paused',
  'closed',
  'removed'
);

create type public.swipe_direction as enum (
  'pass',
  'interested'
);

create type public.opportunity_interest_status as enum (
  'interested',
  'passed',
  'matched',
  'withdrawn'
);

create type public.match_type as enum (
  'person',
  'opportunity'
);

create type public.match_status as enum (
  'active',
  'unmatched',
  'blocked'
);

create type public.conversation_status as enum (
  'active',
  'archived',
  'blocked'
);

create type public.link_visibility as enum (
  'public',
  'matches_only',
  'private'
);

create type public.business_member_role as enum (
  'owner'
);

create type public.report_target_type as enum (
  'profile',
  'opportunity',
  'message',
  'conversation'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text unique,
  avatar_url text,
  headline text,
  bio text,
  city text,
  remote_preference public.remote_preference default 'flexible',
  intent public.user_intent default 'both',
  primary_role text,
  experience_level public.experience_level,
  availability public.availability_status default 'available',
  show_age boolean not null default false,
  birthdate date,
  is_18_or_older_confirmed_at timestamptz,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  onboarding_completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9_]{3,24}$'
  )
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.profile_skills (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);

create table public.user_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  link_type text not null,
  value text not null,
  visibility public.link_visibility not null default 'matches_only',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique,
  logo_url text,
  short_description text,
  industry text,
  website text,
  location text,
  remote_status public.remote_preference default 'flexible',
  founding_year integer,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint businesses_slug_format check (
    slug is null or slug ~ '^[a-z0-9-]{3,60}$'
  )
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.business_member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (business_id, profile_id)
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  posted_as_business boolean not null default false,
  title text not null,
  slug text unique,
  category text,
  short_summary text not null,
  full_description text,
  opportunity_type public.opportunity_type not null default 'open_to_discussing',
  compensation_type public.compensation_type not null default 'negotiable',
  compensation_min numeric(12,2),
  compensation_max numeric(12,2),
  compensation_currency text not null default 'USD',
  compensation_label text,
  estimated_hours_min integer,
  estimated_hours_max integer,
  commitment text,
  workplace public.remote_preference not null default 'remote',
  location text,
  expected_start_date date,
  experience_requirements text,
  external_url text,
  status public.opportunity_status not null default 'draft',
  expires_at timestamptz,
  lance_disclaimer_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint opportunities_slug_format check (
    slug is null or slug ~ '^[a-z0-9-]{3,80}$'
  ),
  constraint opportunities_compensation_range check (
    compensation_min is null
    or compensation_max is null
    or compensation_min <= compensation_max
  )
);

create table public.opportunity_skills (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (opportunity_id, skill_id)
);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  direction public.swipe_direction not null,
  created_at timestamptz not null default now(),
  unique (actor_profile_id, target_profile_id),
  constraint swipes_no_self_target check (actor_profile_id <> target_profile_id)
);

create table public.opportunity_interests (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  interested_profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.opportunity_interest_status not null default 'interested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, interested_profile_id),
  constraint opportunity_interests_not_owner check (interested_profile_id <> owner_profile_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_type public.match_type not null,
  profile_one_id uuid not null references public.profiles(id) on delete cascade,
  profile_two_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  status public.match_status not null default 'active',
  unmatched_by_profile_id uuid references public.profiles(id) on delete set null,
  unmatched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_two_people check (profile_one_id <> profile_two_id),
  constraint opportunity_matches_have_opportunity check (
    (match_type = 'opportunity' and opportunity_id is not null)
    or (match_type = 'person')
  )
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  status public.conversation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.saved_profiles (
  saver_profile_id uuid not null references public.profiles(id) on delete cascade,
  saved_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (saver_profile_id, saved_profile_id),
  constraint saved_profiles_no_self_save check (saver_profile_id <> saved_profile_id)
);

create table public.saved_opportunities (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, opportunity_id)
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_profile_id uuid not null references public.profiles(id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (blocker_profile_id, blocked_profile_id),
  constraint blocks_no_self_block check (blocker_profile_id <> blocked_profile_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target_type not null,
  target_profile_id uuid references public.profiles(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  related_match_id uuid references public.matches(id) on delete set null,
  related_opportunity_id uuid references public.opportunities(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  community_guidelines_version text,
  accepted_at timestamptz not null default now()
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  media_url text,
  external_url text,
  visibility public.link_visibility not null default 'public',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_lower_username_key
on public.profiles (lower(username))
where username is not null;

create index profiles_discovery_idx
on public.profiles (deleted_at, onboarding_completed_at, primary_role);

create index businesses_owner_idx
on public.businesses (owner_profile_id);

create index opportunities_feed_idx
on public.opportunities (status, deleted_at, workplace, category, created_at desc);

create index opportunities_owner_idx
on public.opportunities (owner_profile_id);

create index swipes_actor_idx
on public.swipes (actor_profile_id, created_at desc);

create index swipes_target_idx
on public.swipes (target_profile_id, direction);

create index opportunity_interests_owner_idx
on public.opportunity_interests (owner_profile_id, status, created_at desc);

create index opportunity_interests_profile_idx
on public.opportunity_interests (interested_profile_id, status);

create unique index matches_unique_active_person_idx
on public.matches (
  least(profile_one_id, profile_two_id),
  greatest(profile_one_id, profile_two_id)
)
where match_type = 'person' and status = 'active' and opportunity_id is null;

create unique index matches_unique_active_opportunity_idx
on public.matches (
  opportunity_id,
  least(profile_one_id, profile_two_id),
  greatest(profile_one_id, profile_two_id)
)
where match_type = 'opportunity' and status = 'active';

create index conversation_members_profile_idx
on public.conversation_members (profile_id);

create index messages_conversation_created_idx
on public.messages (conversation_id, created_at desc);

create index reports_status_idx
on public.reports (status, created_at desc);

create index notifications_profile_idx
on public.notifications (profile_id, read_at, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_links_set_updated_at
before update on public.user_links
for each row execute function public.set_updated_at();

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create trigger opportunities_set_updated_at
before update on public.opportunities
for each row execute function public.set_updated_at();

create trigger opportunity_interests_set_updated_at
before update on public.opportunity_interests
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger messages_set_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

create trigger portfolio_items_set_updated_at
before update on public.portfolio_items
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Lance user')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
