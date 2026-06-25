-- Phase: creator-first opportunity links.
-- Public share pages need to load one published opportunity by slug without
-- opening the underlying opportunity, profile, or business tables to anonymous
-- browsing. This function returns only the public fields needed by /o/:slug.

create or replace function public.get_public_opportunity_by_slug(
  target_slug text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', opportunity.id,
    'ownerProfileId',
      case
        when auth.uid() = opportunity.owner_profile_id then opportunity.owner_profile_id
        else null
      end,
    'businessId',
      case
        when auth.uid() = opportunity.owner_profile_id then opportunity.business_id
        else null
      end,
    'postingIdentity',
      case when opportunity.posted_as_business then 'business' else 'personal' end,
    'title', opportunity.title,
    'slug', opportunity.slug,
    'category', opportunity.category,
    'shortSummary', opportunity.short_summary,
    'fullDescription', coalesce(opportunity.full_description, ''),
    'workType', opportunity.opportunity_type,
    'compensationType', opportunity.compensation_type,
    'compensationMin',
      case
        when opportunity.compensation_min is null then ''
        else opportunity.compensation_min::text
      end,
    'compensationMax',
      case
        when opportunity.compensation_max is null then ''
        else opportunity.compensation_max::text
      end,
    'currency', opportunity.compensation_currency,
    'ratePeriod', coalesce(opportunity.rate_period::text, ''),
    'compensationNotes', coalesce(opportunity.compensation_label, ''),
    'workplace', opportunity.workplace,
    'location', coalesce(opportunity.location, ''),
    'locationId', opportunity.location_id,
    'locationRegion', coalesce(opportunity.location_region, ''),
    'locationCountry', coalesce(opportunity.location_country, ''),
    'timeCommitment', coalesce(opportunity.commitment::text, 'flexible'),
    'experienceLevel', coalesce(opportunity.experience_requirements::text, 'any_level'),
    'skills',
      coalesce(
        (
          select jsonb_agg(skill.name order by skill.name)
          from public.opportunity_skills opportunity_skill
          join public.skills skill on skill.id = opportunity_skill.skill_id
          where opportunity_skill.opportunity_id = opportunity.id
        ),
        '[]'::jsonb
      ),
    'industry', coalesce(opportunity.industry, 'Other'),
    'expectedStartDate', coalesce(opportunity.expected_start_date::text, ''),
    'expirationDate', coalesce(opportunity.expires_at::date::text, ''),
    'portfolioRequired', opportunity.portfolio_required,
    'externalUrl', coalesce(opportunity.external_url, ''),
    'peopleNeeded', coalesce(opportunity.people_needed::text, '1'),
    'additionalRequirements', coalesce(opportunity.additional_requirements, ''),
    'disclaimerAccepted', opportunity.lance_disclaimer_accepted_at is not null,
    'status', opportunity.status,
    'createdAt', opportunity.created_at,
    'updatedAt', opportunity.updated_at,
    'publishedAt', opportunity.published_at,
    'closedAt', opportunity.closed_at,
    'archivedAt', opportunity.archived_at,
    'poster', jsonb_build_object(
      'name',
        case
          when opportunity.posted_as_business then coalesce(business.name, 'Lance project')
          else coalesce(profile.display_name, 'Lance member')
        end,
      'imageUrl',
        case
          when opportunity.posted_as_business then business.logo_url
          else profile.avatar_url
        end,
      'identityType',
        case when opportunity.posted_as_business then 'business' else 'personal' end
    )
  )
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
$$;

revoke all on function public.get_public_opportunity_by_slug(text) from public;
grant execute on function public.get_public_opportunity_by_slug(text) to anon;
grant execute on function public.get_public_opportunity_by_slug(text) to authenticated;
