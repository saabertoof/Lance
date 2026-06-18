-- Lance Phase 2 onboarding and personal profiles.
-- This migration extends the Phase 1 schema without rewriting 0001 or 0002.

alter type public.user_intent add value if not exists 'find_opportunities';
alter type public.user_intent add value if not exists 'find_people';
alter type public.user_intent add value if not exists 'hire_or_find_help';
alter type public.user_intent add value if not exists 'promote_services';
alter type public.user_intent add value if not exists 'build_team';
alter type public.user_intent add value if not exists 'explore_everything';

alter type public.experience_level add value if not exists 'just_starting';
alter type public.experience_level add value if not exists 'some_experience';
alter type public.experience_level add value if not exists 'experienced';
alter type public.experience_level add value if not exists 'expert';

alter type public.availability_status add value if not exists 'few_hours_per_week';
alter type public.availability_status add value if not exists 'hours_5_10';
alter type public.availability_status add value if not exists 'hours_10_20';
alter type public.availability_status add value if not exists 'hours_20_plus';
alter type public.availability_status add value if not exists 'flexible_hours';

alter type public.opportunity_type add value if not exists 'one_time_project';
alter type public.opportunity_type add value if not exists 'retainer_work';
alter type public.opportunity_type add value if not exists 'local_work';
alter type public.opportunity_type add value if not exists 'remote_work';

alter table public.profiles
add column if not exists industry_experience text[] not null default '{}';

create table if not exists public.user_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  primary_intent public.user_intent not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_opportunity_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest public.opportunity_type not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, interest)
);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;
alter table public.profile_opportunity_interests enable row level security;

create policy "Users manage their own preferences"
on public.user_preferences for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Profile opportunity interests are readable"
on public.profile_opportunity_interests for select
to authenticated
using (true);

create policy "Users manage their own opportunity interests"
on public.profile_opportunity_interests for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Authenticated users add normalized skills"
on public.skills for insert
to authenticated
with check (
  char_length(trim(name)) between 1 and 50
);

create unique index if not exists skills_lower_name_key
on public.skills (lower(name));

create index if not exists profiles_display_name_search_idx
on public.profiles (lower(display_name));

create index if not exists profiles_city_search_idx
on public.profiles (lower(city))
where city is not null;

create index if not exists profiles_industry_experience_idx
on public.profiles using gin (industry_experience);

create index if not exists profile_opportunity_interests_interest_idx
on public.profile_opportunity_interests (interest, profile_id);

create or replace function public.save_my_profile(
  p_display_name text,
  p_username text,
  p_avatar_url text,
  p_headline text,
  p_bio text,
  p_city text,
  p_remote_preference public.remote_preference,
  p_primary_role text,
  p_experience_level public.experience_level,
  p_availability public.availability_status,
  p_industry_experience text[],
  p_primary_intent public.user_intent,
  p_skill_names text[],
  p_opportunity_interests public.opportunity_type[],
  p_links jsonb,
  p_confirm_adult boolean default false,
  p_complete_onboarding boolean default false
)
returns public.profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  saved_profile public.profiles;
begin
  if current_profile_id is null then
    raise exception 'An authenticated session is required.';
  end if;

  if char_length(trim(coalesce(p_display_name, ''))) not between 2 and 60 then
    raise exception 'Display name must be between 2 and 60 characters.';
  end if;

  if lower(trim(coalesce(p_username, ''))) !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must be 3 to 24 lowercase letters, numbers, or underscores.';
  end if;

  if p_complete_onboarding and (
    char_length(trim(coalesce(p_city, ''))) < 2
    or char_length(trim(coalesce(p_primary_role, ''))) < 2
    or char_length(trim(coalesce(p_headline, ''))) < 3
    or char_length(trim(coalesce(p_bio, ''))) < 10
    or coalesce(array_length(p_skill_names, 1), 0) = 0
    or coalesce(array_length(p_opportunity_interests, 1), 0) = 0
  ) then
    raise exception 'Complete all required onboarding fields before continuing.';
  end if;

  if p_complete_onboarding
    and not p_confirm_adult
    and not exists (
      select 1
      from public.profiles
      where id = current_profile_id
        and is_18_or_older_confirmed_at is not null
    )
  then
    raise exception 'You must confirm that you are at least 18.';
  end if;

  if jsonb_typeof(coalesce(p_links, '[]'::jsonb)) <> 'array' then
    raise exception 'Links must be supplied as a list.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_links, '[]'::jsonb))
      as link(link_type text, value text)
    where link.link_type not in (
      'portfolio',
      'website',
      'instagram',
      'tiktok',
      'x',
      'linkedin',
      'github',
      'discord',
      'calendly',
      'email'
    )
      or (
        link.link_type = 'email'
        and link.value !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
      )
      or (
        link.link_type <> 'email'
        and link.value !~* '^https://'
      )
  ) then
    raise exception 'One or more profile links are invalid.';
  end if;

  insert into public.profiles (
    id,
    display_name,
    username,
    avatar_url,
    headline,
    bio,
    city,
    remote_preference,
    primary_role,
    experience_level,
    availability,
    industry_experience,
    is_18_or_older_confirmed_at,
    onboarding_completed_at
  )
  values (
    current_profile_id,
    trim(p_display_name),
    lower(trim(p_username)),
    nullif(trim(coalesce(p_avatar_url, '')), ''),
    nullif(trim(coalesce(p_headline, '')), ''),
    nullif(trim(coalesce(p_bio, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    p_remote_preference,
    nullif(trim(coalesce(p_primary_role, '')), ''),
    p_experience_level,
    p_availability,
    coalesce(p_industry_experience, '{}'),
    case when p_confirm_adult then now() else null end,
    case when p_complete_onboarding then now() else null end
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    username = excluded.username,
    avatar_url = excluded.avatar_url,
    headline = excluded.headline,
    bio = excluded.bio,
    city = excluded.city,
    remote_preference = excluded.remote_preference,
    primary_role = excluded.primary_role,
    experience_level = excluded.experience_level,
    availability = excluded.availability,
    industry_experience = excluded.industry_experience,
    is_18_or_older_confirmed_at = case
      when p_confirm_adult then coalesce(
        public.profiles.is_18_or_older_confirmed_at,
        now()
      )
      else public.profiles.is_18_or_older_confirmed_at
    end,
    onboarding_completed_at = case
      when p_complete_onboarding then coalesce(
        public.profiles.onboarding_completed_at,
        now()
      )
      else public.profiles.onboarding_completed_at
    end
  returning * into saved_profile;

  insert into public.user_preferences (profile_id, primary_intent)
  values (current_profile_id, p_primary_intent)
  on conflict (profile_id) do update set
    primary_intent = excluded.primary_intent;

  insert into public.skills (name)
  select distinct initcap(regexp_replace(trim(skill_name), '\s+', ' ', 'g'))
  from unnest(coalesce(p_skill_names, '{}')) as skill_name
  where char_length(trim(skill_name)) between 1 and 50
    and not exists (
      select 1
      from public.skills existing_skill
      where lower(existing_skill.name) = lower(trim(skill_name))
    )
  on conflict do nothing;

  delete from public.profile_skills
  where profile_id = current_profile_id;

  insert into public.profile_skills (profile_id, skill_id)
  select current_profile_id, skill.id
  from public.skills skill
  where lower(skill.name) in (
    select lower(trim(skill_name))
    from unnest(coalesce(p_skill_names, '{}')) as skill_name
    where trim(skill_name) <> ''
  )
  on conflict do nothing;

  delete from public.profile_opportunity_interests
  where profile_id = current_profile_id;

  insert into public.profile_opportunity_interests (profile_id, interest)
  select current_profile_id, interest
  from unnest(coalesce(p_opportunity_interests, '{}')) as interest
  on conflict do nothing;

  delete from public.user_links
  where profile_id = current_profile_id;

  insert into public.user_links (
    profile_id,
    label,
    link_type,
    value,
    visibility,
    display_order
  )
  select
    current_profile_id,
    link.label,
    link.link_type,
    link.value,
    'public',
    link.display_order
  from jsonb_to_recordset(coalesce(p_links, '[]'::jsonb))
    as link(label text, link_type text, value text, display_order integer);

  return saved_profile;
end;
$$;

revoke all on function public.save_my_profile(
  text,
  text,
  text,
  text,
  text,
  text,
  public.remote_preference,
  text,
  public.experience_level,
  public.availability_status,
  text[],
  public.user_intent,
  text[],
  public.opportunity_type[],
  jsonb,
  boolean,
  boolean
) from public;

grant execute on function public.save_my_profile(
  text,
  text,
  text,
  text,
  text,
  text,
  public.remote_preference,
  text,
  public.experience_level,
  public.availability_status,
  text[],
  public.user_intent,
  text[],
  public.opportunity_type[],
  jsonb,
  boolean,
  boolean
) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Avatar images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'avatars');

create policy "Users upload avatars to their own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users update avatars in their own folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users delete avatars in their own folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
