-- Lance Phase 3 business/project profiles and opportunity posting.
-- Extends existing Phase 1 tables without rewriting migrations 0001-0003.

alter type public.remote_preference add value if not exists 'not_applicable';

alter type public.opportunity_type add value if not exists 'ongoing_freelance';
alter type public.opportunity_type add value if not exists 'part_time';
alter type public.opportunity_type add value if not exists 'full_time';
alter type public.opportunity_type add value if not exists 'retainer';
alter type public.opportunity_type add value if not exists 'internship';
alter type public.opportunity_type add value if not exists 'commission_based';
alter type public.opportunity_type add value if not exists 'other';

alter type public.compensation_type add value if not exists 'hourly';
alter type public.compensation_type add value if not exists 'fixed_project';
alter type public.compensation_type add value if not exists 'weekly';
alter type public.compensation_type add value if not exists 'monthly';
alter type public.compensation_type add value if not exists 'retainer';
alter type public.compensation_type add value if not exists 'salary';
alter type public.compensation_type add value if not exists 'mixed';

alter type public.opportunity_status add value if not exists 'archived';

alter table public.businesses
add column if not exists business_type text,
add column if not exists full_description text,
add column if not exists business_size text,
add column if not exists instagram_url text,
add column if not exists tiktok_url text,
add column if not exists x_url text,
add column if not exists linkedin_url text,
add column if not exists github_url text,
add column if not exists contact_email text,
add column if not exists archived_at timestamptz;

alter table public.opportunities
add column if not exists industry text,
add column if not exists rate_period text,
add column if not exists portfolio_required boolean not null default false,
add column if not exists people_needed integer,
add column if not exists additional_requirements text,
add column if not exists published_at timestamptz,
add column if not exists closed_at timestamptz,
add column if not exists archived_at timestamptz;

alter table public.businesses
drop constraint if exists businesses_phase3_type_check,
add constraint businesses_phase3_type_check check (
  business_type is null or business_type in (
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
  )
),
drop constraint if exists businesses_phase3_size_check,
add constraint businesses_phase3_size_check check (
  business_size is null or business_size in (
    'one_person',
    'two_to_ten',
    'eleven_to_fifty',
    'fifty_one_plus'
  )
),
drop constraint if exists businesses_phase3_status_check,
add constraint businesses_phase3_status_check check (
  status in ('active', 'archived')
),
drop constraint if exists businesses_phase3_foundation_year_check,
add constraint businesses_phase3_foundation_year_check check (
  founding_year is null
  or founding_year between 1800 and 2100
),
drop constraint if exists businesses_phase3_description_check,
add constraint businesses_phase3_description_check check (
  char_length(short_description) between 10 and 180
  and (
    full_description is null
    or char_length(full_description) between 10 and 2000
  )
),
drop constraint if exists businesses_phase3_contact_email_check,
add constraint businesses_phase3_contact_email_check check (
  contact_email is null
  or contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
),
drop constraint if exists businesses_phase3_industry_check,
add constraint businesses_phase3_industry_check check (
  industry is null or industry in (
    'Technology',
    'Artificial intelligence',
    'Media',
    'Content',
    'Marketing',
    'E-commerce',
    'Fashion',
    'Real estate',
    'Finance',
    'Crypto / Web3',
    'Food and hospitality',
    'Health and fitness',
    'Education',
    'Gaming',
    'Creative services',
    'Professional services',
    'Nonprofit',
    'Other'
  )
);

alter table public.opportunities
drop constraint if exists opportunities_phase3_posting_identity_check,
add constraint opportunities_phase3_posting_identity_check check (
  (
    posted_as_business = false
    and business_id is null
  )
  or (
    posted_as_business = true
    and business_id is not null
  )
),
drop constraint if exists opportunities_phase3_rate_period_check,
add constraint opportunities_phase3_rate_period_check check (
  rate_period is null or rate_period in (
    'per_hour',
    'per_project',
    'per_week',
    'per_month',
    'per_year',
    'other'
  )
),
drop constraint if exists opportunities_phase3_commitment_check,
add constraint opportunities_phase3_commitment_check check (
  commitment is null or commitment in (
    'under_5_hours',
    'hours_5_10',
    'hours_10_20',
    'hours_20_30',
    'hours_30_plus',
    'flexible',
    'one_time_deliverable'
  )
),
drop constraint if exists opportunities_phase3_experience_check,
add constraint opportunities_phase3_experience_check check (
  experience_requirements is null or experience_requirements in (
    'none_required',
    'beginner',
    'intermediate',
    'experienced',
    'expert',
    'any_level'
  )
),
drop constraint if exists opportunities_phase3_people_needed_check,
add constraint opportunities_phase3_people_needed_check check (
  people_needed is null or people_needed between 1 and 1000
),
drop constraint if exists opportunities_phase3_compensation_positive_check,
add constraint opportunities_phase3_compensation_positive_check check (
  (compensation_min is null or compensation_min > 0)
  and (compensation_max is null or compensation_max > 0)
),
drop constraint if exists opportunities_phase3_description_check,
add constraint opportunities_phase3_description_check check (
  char_length(short_summary) between 10 and 180
  and (
    full_description is null
    or char_length(full_description) between 20 and 5000
  )
),
drop constraint if exists opportunities_phase3_dates_check,
add constraint opportunities_phase3_dates_check check (
  expires_at is null
  or expected_start_date is null
  or expires_at::date >= expected_start_date
),
drop constraint if exists opportunities_phase3_category_check,
add constraint opportunities_phase3_category_check check (
  category is null or category in (
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
  )
),
drop constraint if exists opportunities_phase3_work_type_check,
add constraint opportunities_phase3_work_type_check check (
  opportunity_type::text in (
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
  )
),
drop constraint if exists opportunities_phase3_compensation_type_check,
add constraint opportunities_phase3_compensation_type_check check (
  compensation_type::text in (
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
  )
),
drop constraint if exists opportunities_phase3_workplace_check,
add constraint opportunities_phase3_workplace_check check (
  workplace::text in ('remote', 'hybrid', 'in_person', 'flexible')
),
drop constraint if exists opportunities_phase3_status_check,
add constraint opportunities_phase3_status_check check (
  status::text in ('draft', 'published', 'paused', 'closed', 'archived')
),
drop constraint if exists opportunities_phase3_industry_check,
add constraint opportunities_phase3_industry_check check (
  industry is null or industry in (
    'Technology',
    'Artificial intelligence',
    'Media',
    'Content',
    'Marketing',
    'E-commerce',
    'Fashion',
    'Real estate',
    'Finance',
    'Crypto / Web3',
    'Food and hospitality',
    'Health and fitness',
    'Education',
    'Gaming',
    'Creative services',
    'Professional services',
    'Nonprofit',
    'Other'
  )
);

create unique index if not exists businesses_lower_slug_key
on public.businesses (lower(slug))
where slug is not null;

create unique index if not exists opportunities_lower_slug_key
on public.opportunities (lower(slug))
where slug is not null;

create index if not exists businesses_phase3_owner_status_idx
on public.businesses (owner_profile_id, status, updated_at desc);

create index if not exists businesses_phase3_search_idx
on public.businesses (status, business_type, industry, business_size, remote_status);

create index if not exists opportunities_phase3_owner_status_idx
on public.opportunities (owner_profile_id, status, updated_at desc);

create index if not exists opportunities_phase3_business_status_idx
on public.opportunities (business_id, status, updated_at desc)
where business_id is not null;

create index if not exists opportunities_phase3_search_idx
on public.opportunities (
  status,
  category,
  workplace,
  compensation_type,
  opportunity_type,
  published_at desc
);

create or replace function public.validate_business_links()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  candidate text;
begin
  if char_length(trim(coalesce(new.name, ''))) < 2
    or char_length(trim(coalesce(new.slug, ''))) < 3
    or new.business_type is null
    or char_length(trim(coalesce(new.short_description, ''))) < 10
    or char_length(trim(coalesce(new.industry, ''))) < 2
  then
    raise exception 'Complete every required business field before saving.';
  end if;

  foreach candidate in array array[
    new.website,
    new.instagram_url,
    new.tiktok_url,
    new.x_url,
    new.linkedin_url,
    new.github_url
  ]
  loop
    if candidate is not null and candidate !~* '^https://[^[:space:]]+$' then
      raise exception 'Business links must be valid HTTPS URLs.';
    end if;
  end loop;

  if new.status = 'archived' and new.archived_at is null then
    new.archived_at := now();
  elsif new.status = 'active' then
    new.archived_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists businesses_phase3_validate on public.businesses;
create trigger businesses_phase3_validate
before insert or update on public.businesses
for each row execute function public.validate_business_links();

create or replace function public.handle_business_archive()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'archived' and new.status = 'archived' then
    update public.opportunities
    set status = 'paused'
    where business_id = new.id
      and owner_profile_id = new.owner_profile_id
      and status::text = 'published';
  end if;

  return new;
end;
$$;

drop trigger if exists businesses_phase3_archive_opportunities on public.businesses;
create trigger businesses_phase3_archive_opportunities
after update on public.businesses
for each row execute function public.handle_business_archive();

create or replace function public.prevent_business_delete_with_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.opportunities opportunity
    where opportunity.business_id = old.id
  ) then
    raise exception 'Archive businesses that have opportunity history instead of deleting them.';
  end if;

  return old;
end;
$$;

drop trigger if exists businesses_phase3_delete_guard on public.businesses;
create trigger businesses_phase3_delete_guard
before delete on public.businesses
for each row execute function public.prevent_business_delete_with_history();

create or replace function public.validate_opportunity_phase3()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status::text <> 'draft' then
    raise exception 'New opportunities must begin as drafts.';
  end if;

  if new.posted_as_business then
    if not exists (
      select 1
      from public.businesses business
      where business.id = new.business_id
        and business.owner_profile_id = new.owner_profile_id
        and business.deleted_at is null
    ) then
      raise exception 'The selected business is unavailable or is not owned by this user.';
    end if;

    if new.status::text in ('draft', 'published') and not exists (
      select 1
      from public.businesses business
      where business.id = new.business_id
        and business.owner_profile_id = new.owner_profile_id
        and business.status = 'active'
        and business.deleted_at is null
    ) then
      raise exception 'Archived businesses cannot create drafts or publish opportunities.';
    end if;
  elsif new.business_id is not null then
    raise exception 'Personal opportunities cannot reference a business.';
  end if;

  if new.external_url is not null and new.external_url !~* '^https://[^[:space:]]+$' then
    raise exception 'External project links must be valid HTTPS URLs.';
  end if;

  if new.status::text = 'published' then
    if new.lance_disclaimer_accepted_at is null then
      raise exception 'The Lance compensation disclaimer must be accepted before publishing.';
    end if;

    if char_length(trim(coalesce(new.title, ''))) < 3
      or char_length(trim(coalesce(new.category, ''))) < 2
      or char_length(trim(coalesce(new.full_description, ''))) < 20
      or new.opportunity_type is null
      or new.compensation_type is null
      or new.workplace is null
      or new.commitment is null
      or new.experience_requirements is null
    then
      raise exception 'Complete every required opportunity field before publishing.';
    end if;

    if not exists (
      select 1
      from public.opportunity_skills required_skill
      where required_skill.opportunity_id = new.id
    ) then
      raise exception 'Add at least one required skill before publishing.';
    end if;

    new.published_at := coalesce(new.published_at, now());
    new.closed_at := null;
    new.archived_at := null;
  elsif new.status::text = 'closed' then
    new.closed_at := coalesce(new.closed_at, now());
  elsif new.status::text = 'archived' then
    new.archived_at := coalesce(new.archived_at, now());
  end if;

  if (new.compensation_min is not null or new.compensation_max is not null)
    and (
      char_length(trim(coalesce(new.compensation_currency, ''))) <> 3
      or new.rate_period is null
    )
  then
    raise exception 'Numeric compensation requires a three-letter currency and rate period.';
  end if;

  if tg_op = 'UPDATE' and old.status::text <> new.status::text then
    if not (
      (old.status::text = 'draft' and new.status::text in ('published', 'archived'))
      or (
        old.status::text = 'published'
        and new.status::text in ('paused', 'closed', 'archived')
      )
      or (
        old.status::text = 'paused'
        and new.status::text in ('published', 'closed', 'archived')
      )
      or (old.status::text = 'closed' and new.status::text = 'archived')
    ) then
      raise exception 'This opportunity status transition is not allowed.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists opportunities_phase3_validate on public.opportunities;
create trigger opportunities_phase3_validate
before insert or update on public.opportunities
for each row execute function public.validate_opportunity_phase3();

create or replace function public.prevent_non_draft_opportunity_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status::text <> 'draft' then
    raise exception 'Only draft opportunities may be permanently deleted.';
  end if;

  return old;
end;
$$;

drop trigger if exists opportunities_phase3_delete_guard on public.opportunities;
create trigger opportunities_phase3_delete_guard
before delete on public.opportunities
for each row execute function public.prevent_non_draft_opportunity_delete();

create or replace function public.add_business_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_members (business_id, profile_id, role)
  values (new.id, new.owner_profile_id, 'owner')
  on conflict (business_id, profile_id) do nothing;

  return new;
end;
$$;

drop trigger if exists businesses_phase3_add_owner on public.businesses;
create trigger businesses_phase3_add_owner
after insert on public.businesses
for each row execute function public.add_business_owner_membership();

create policy "Business owners read all owned businesses"
on public.businesses for select
to authenticated
using (owner_profile_id = auth.uid());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'business-assets',
  'business-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Business logos are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'business-assets');

create policy "Owners upload business logos in their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.businesses business
    where business.id::text = (storage.foldername(name))[2]
      and business.owner_profile_id = auth.uid()
  )
);

create policy "Owners update business logos in their folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.businesses business
    where business.id::text = (storage.foldername(name))[2]
      and business.owner_profile_id = auth.uid()
  )
)
with check (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.businesses business
    where business.id::text = (storage.foldername(name))[2]
      and business.owner_profile_id = auth.uid()
  )
);

create policy "Owners delete business logos in their folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.businesses business
    where business.id::text = (storage.foldername(name))[2]
      and business.owner_profile_id = auth.uid()
  )
);
