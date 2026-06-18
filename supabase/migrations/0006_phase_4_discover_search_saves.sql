-- Lance Phase 4: Discover, parameterized search, filters, and private saves.
-- Reuses the saved tables created in 0001. No Phase 5 interest or match data is used.

create extension if not exists pg_trgm;

create index if not exists saved_profiles_owner_created_idx
on public.saved_profiles (saver_profile_id, created_at desc);

create index if not exists saved_opportunities_owner_created_idx
on public.saved_opportunities (profile_id, created_at desc);

create index if not exists profiles_phase4_discovery_idx
on public.profiles (updated_at desc, id)
where deleted_at is null and onboarding_completed_at is not null;

create index if not exists profiles_phase4_search_idx
on public.profiles using gin (
  lower(
    coalesce(display_name, '') || ' ' ||
    coalesce(username, '') || ' ' ||
    coalesce(primary_role, '') || ' ' ||
    coalesce(headline, '') || ' ' ||
    coalesce(bio, '') || ' ' ||
    coalesce(city, '')
  ) gin_trgm_ops
);

create index if not exists opportunities_phase4_public_idx
on public.opportunities (published_at desc, id)
where status = 'published' and deleted_at is null;

create index if not exists opportunities_phase4_search_idx
on public.opportunities using gin (
  lower(
    coalesce(title, '') || ' ' ||
    coalesce(short_summary, '') || ' ' ||
    coalesce(full_description, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(industry, '') || ' ' ||
    coalesce(location, '')
  ) gin_trgm_ops
);

create index if not exists businesses_phase4_public_idx
on public.businesses (updated_at desc, id)
where status = 'active' and deleted_at is null;

create index if not exists businesses_phase4_search_idx
on public.businesses using gin (
  lower(
    coalesce(name, '') || ' ' ||
    coalesce(slug, '') || ' ' ||
    coalesce(business_type, '') || ' ' ||
    coalesce(short_description, '') || ' ' ||
    coalesce(full_description, '') || ' ' ||
    coalesce(industry, '') || ' ' ||
    coalesce(location, '')
  ) gin_trgm_ops
);

-- Replace the original broad ALL policies with explicit private list/save/unsave rules.
drop policy if exists "Users manage their saved profiles" on public.saved_profiles;
drop policy if exists "Users manage their saved opportunities" on public.saved_opportunities;

create policy "Users read their own saved profiles"
on public.saved_profiles for select
to authenticated
using (saver_profile_id = auth.uid());

create policy "Users save readable completed profiles"
on public.saved_profiles for insert
to authenticated
with check (
  saver_profile_id = auth.uid()
  and saved_profile_id <> auth.uid()
  and exists (
    select 1
    from public.profiles profile
    where profile.id = saved_profile_id
      and profile.deleted_at is null
      and profile.onboarding_completed_at is not null
  )
);

create policy "Users unsave their own profiles"
on public.saved_profiles for delete
to authenticated
using (saver_profile_id = auth.uid());

create policy "Users read their own saved opportunities"
on public.saved_opportunities for select
to authenticated
using (profile_id = auth.uid());

create policy "Users save readable published opportunities"
on public.saved_opportunities for insert
to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.opportunities opportunity
    where opportunity.id = opportunity_id
      and opportunity.owner_profile_id <> auth.uid()
      and opportunity.status = 'published'
      and opportunity.deleted_at is null
      and (opportunity.expires_at is null or opportunity.expires_at > now())
  )
);

create policy "Users unsave their own opportunities"
on public.saved_opportunities for delete
to authenticated
using (profile_id = auth.uid());

create or replace function public.is_clearly_paid(
  compensation public.compensation_type,
  minimum_amount numeric
)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select
    minimum_amount is not null
    and minimum_amount > 0
    and compensation::text in (
      'hourly',
      'fixed_project',
      'weekly',
      'monthly',
      'retainer',
      'salary',
      'mixed'
    );
$$;

create or replace function public.search_phase4_people(
  p_query text default '',
  p_primary_role text default null,
  p_skills text[] default '{}',
  p_experience text default null,
  p_availability text default null,
  p_location text default null,
  p_remote_preference text default null,
  p_interests text[] default '{}',
  p_industries text[] default '{}',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (profile_id uuid, total_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible as (
    select profile.id, profile.updated_at
    from public.profiles profile
    where profile.deleted_at is null
      and profile.onboarding_completed_at is not null
      and profile.id <> auth.uid()
      and (
        nullif(trim(p_query), '') is null
        or lower(
          coalesce(profile.display_name, '') || ' ' ||
          coalesce(profile.username, '') || ' ' ||
          coalesce(profile.primary_role, '') || ' ' ||
          coalesce(profile.headline, '') || ' ' ||
          coalesce(profile.bio, '') || ' ' ||
          coalesce(profile.city, '')
        ) like '%' || lower(trim(p_query)) || '%'
        or exists (
          select 1
          from public.profile_skills profile_skill
          join public.skills skill on skill.id = profile_skill.skill_id
          where profile_skill.profile_id = profile.id
            and lower(skill.name) like '%' || lower(trim(p_query)) || '%'
        )
        or exists (
          select 1
          from unnest(profile.industry_experience) profile_industry
          where lower(profile_industry) like '%' || lower(trim(p_query)) || '%'
        )
      )
      and (
        nullif(trim(p_primary_role), '') is null
        or lower(profile.primary_role) = lower(trim(p_primary_role))
      )
      and (
        nullif(trim(p_experience), '') is null
        or profile.experience_level::text = p_experience
      )
      and (
        nullif(trim(p_availability), '') is null
        or profile.availability::text = p_availability
      )
      and (
        nullif(trim(p_location), '') is null
        or lower(coalesce(profile.city, '')) like '%' || lower(trim(p_location)) || '%'
      )
      and (
        nullif(trim(p_remote_preference), '') is null
        or profile.remote_preference::text = p_remote_preference
      )
      and (
        cardinality(coalesce(p_skills, '{}')) = 0
        or exists (
          select 1
          from public.profile_skills profile_skill
          join public.skills skill on skill.id = profile_skill.skill_id
          where profile_skill.profile_id = profile.id
            and lower(skill.name) in (
              select lower(selected_skill)
              from unnest(p_skills) selected_skill
            )
        )
      )
      and (
        cardinality(coalesce(p_interests, '{}')) = 0
        or exists (
          select 1
          from public.profile_opportunity_interests interest
          where interest.profile_id = profile.id
            and interest.interest::text = any (p_interests)
        )
      )
      and (
        cardinality(coalesce(p_industries, '{}')) = 0
        or exists (
          select 1
          from unnest(profile.industry_experience) profile_industry
          where lower(profile_industry) in (
            select lower(selected_industry)
            from unnest(p_industries) selected_industry
          )
        )
      )
  ),
  counted as (
    select eligible.id, eligible.updated_at, count(*) over () as total_count
    from eligible
  )
  select counted.id, counted.total_count
  from counted
  order by counted.updated_at desc, counted.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

create or replace function public.search_phase4_opportunities(
  p_query text default '',
  p_category text default null,
  p_skills text[] default '{}',
  p_industry text default null,
  p_compensation_type text default null,
  p_paid_only boolean default false,
  p_work_type text default null,
  p_workplace text default null,
  p_commitment text default null,
  p_experience text default null,
  p_location text default null,
  p_exclude_owned boolean default false,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (opportunity_id uuid, total_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible as (
    select opportunity.id, opportunity.published_at
    from public.opportunities opportunity
    join public.profiles poster on poster.id = opportunity.owner_profile_id
    left join public.businesses business on business.id = opportunity.business_id
    where opportunity.status = 'published'
      and opportunity.deleted_at is null
      and (opportunity.expires_at is null or opportunity.expires_at > now())
      and (not p_exclude_owned or opportunity.owner_profile_id <> auth.uid())
      and (
        nullif(trim(p_query), '') is null
        or lower(
          coalesce(opportunity.title, '') || ' ' ||
          coalesce(opportunity.short_summary, '') || ' ' ||
          coalesce(opportunity.full_description, '') || ' ' ||
          coalesce(opportunity.category, '') || ' ' ||
          coalesce(opportunity.industry, '') || ' ' ||
          coalesce(opportunity.location, '')
        ) like '%' || lower(trim(p_query)) || '%'
        or lower(coalesce(poster.display_name, '')) like
          '%' || lower(trim(p_query)) || '%'
        or lower(coalesce(business.name, '')) like
          '%' || lower(trim(p_query)) || '%'
        or exists (
          select 1
          from public.opportunity_skills opportunity_skill
          join public.skills skill on skill.id = opportunity_skill.skill_id
          where opportunity_skill.opportunity_id = opportunity.id
            and lower(skill.name) like '%' || lower(trim(p_query)) || '%'
        )
      )
      and (
        nullif(trim(p_category), '') is null
        or opportunity.category = p_category
      )
      and (
        nullif(trim(p_industry), '') is null
        or lower(opportunity.industry) = lower(trim(p_industry))
      )
      and (
        nullif(trim(p_compensation_type), '') is null
        or opportunity.compensation_type::text = p_compensation_type
      )
      and (
        not p_paid_only
        or public.is_clearly_paid(
          opportunity.compensation_type,
          opportunity.compensation_min
        )
      )
      and (
        nullif(trim(p_work_type), '') is null
        or opportunity.opportunity_type::text = p_work_type
      )
      and (
        nullif(trim(p_workplace), '') is null
        or opportunity.workplace::text = p_workplace
      )
      and (
        nullif(trim(p_commitment), '') is null
        or opportunity.commitment = p_commitment
      )
      and (
        nullif(trim(p_experience), '') is null
        or opportunity.experience_requirements = p_experience
      )
      and (
        nullif(trim(p_location), '') is null
        or lower(coalesce(opportunity.location, '')) like '%' || lower(trim(p_location)) || '%'
      )
      and (
        cardinality(coalesce(p_skills, '{}')) = 0
        or exists (
          select 1
          from public.opportunity_skills opportunity_skill
          join public.skills skill on skill.id = opportunity_skill.skill_id
          where opportunity_skill.opportunity_id = opportunity.id
            and lower(skill.name) in (
              select lower(selected_skill)
              from unnest(p_skills) selected_skill
            )
        )
      )
  ),
  counted as (
    select eligible.id, eligible.published_at, count(*) over () as total_count
    from eligible
  )
  select counted.id, counted.total_count
  from counted
  order by counted.published_at desc nulls last, counted.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

create or replace function public.search_phase4_businesses(
  p_query text default '',
  p_business_type text default null,
  p_business_size text default null,
  p_industry text default null,
  p_location text default null,
  p_remote_status text default null,
  p_has_active_opportunities boolean default false,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (business_id uuid, total_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible as (
    select business.id, business.updated_at
    from public.businesses business
    where business.status = 'active'
      and business.deleted_at is null
      and (
        nullif(trim(p_query), '') is null
        or lower(
          coalesce(business.name, '') || ' ' ||
          coalesce(business.slug, '') || ' ' ||
          coalesce(business.business_type, '') || ' ' ||
          coalesce(business.short_description, '') || ' ' ||
          coalesce(business.full_description, '') || ' ' ||
          coalesce(business.industry, '') || ' ' ||
          coalesce(business.location, '')
        ) like '%' || lower(trim(p_query)) || '%'
      )
      and (
        nullif(trim(p_business_type), '') is null
        or business.business_type = p_business_type
      )
      and (
        nullif(trim(p_business_size), '') is null
        or business.business_size = p_business_size
      )
      and (
        nullif(trim(p_industry), '') is null
        or lower(business.industry) = lower(trim(p_industry))
      )
      and (
        nullif(trim(p_location), '') is null
        or lower(coalesce(business.location, '')) like '%' || lower(trim(p_location)) || '%'
      )
      and (
        nullif(trim(p_remote_status), '') is null
        or business.remote_status::text = p_remote_status
      )
      and (
        not p_has_active_opportunities
        or exists (
          select 1
          from public.opportunities opportunity
          where opportunity.business_id = business.id
            and opportunity.status = 'published'
            and opportunity.deleted_at is null
            and (opportunity.expires_at is null or opportunity.expires_at > now())
        )
      )
  ),
  counted as (
    select eligible.id, eligible.updated_at, count(*) over () as total_count
    from eligible
  )
  select counted.id, counted.total_count
  from counted
  order by counted.updated_at desc, counted.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.is_clearly_paid(public.compensation_type, numeric) from public;
revoke all on function public.search_phase4_people(
  text, text, text[], text, text, text, text, text[], text[], integer, integer
) from public;
revoke all on function public.search_phase4_opportunities(
  text, text, text[], text, text, boolean, text, text, text, text, text, boolean,
  integer, integer
) from public;
revoke all on function public.search_phase4_businesses(
  text, text, text, text, text, text, boolean, integer, integer
) from public;

grant execute on function public.is_clearly_paid(
  public.compensation_type, numeric
) to authenticated;
grant execute on function public.search_phase4_people(
  text, text, text[], text, text, text, text, text[], text[], integer, integer
) to authenticated;
grant execute on function public.search_phase4_opportunities(
  text, text, text[], text, text, boolean, text, text, text, text, text, boolean,
  integer, integer
) to authenticated;
grant execute on function public.search_phase4_businesses(
  text, text, text, text, text, text, boolean, integer, integer
) to authenticated;
