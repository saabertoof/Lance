-- Lance Phase 4.5: Discover/profile polish, structured catalogs, and profile media.
-- Apply once after 0006. Existing free-text values remain intact for legacy display.

alter table public.skills
add column if not exists normalized_name text,
add column if not exists category text,
add column if not exists is_curated boolean not null default false,
add column if not exists is_default_suggestion boolean not null default false;

update public.skills
set normalized_name = trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g'))
where normalized_name is null;

create or replace function public.normalize_catalog_label()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.normalized_name := trim(regexp_replace(lower(new.name), '[^a-z0-9]+', ' ', 'g'));
  return new;
end;
$$;

drop trigger if exists skills_normalize_name on public.skills;
create trigger skills_normalize_name
before insert or update of name on public.skills
for each row execute function public.normalize_catalog_label();

create index if not exists skills_catalog_lookup_idx
on public.skills (is_default_suggestion desc, category, normalized_name);

with curated(name, category) as (
  values
    ('Marketing', 'Marketing and Growth'), ('Growth Marketing', 'Marketing and Growth'),
    ('Digital Marketing', 'Marketing and Growth'), ('Social Media Marketing', 'Marketing and Growth'),
    ('Content Marketing', 'Marketing and Growth'), ('Email Marketing', 'Marketing and Growth'),
    ('Influencer Marketing', 'Marketing and Growth'), ('Affiliate Marketing', 'Marketing and Growth'),
    ('Community Management', 'Marketing and Growth'), ('Brand Strategy', 'Marketing and Growth'),
    ('Market Research', 'Marketing and Growth'), ('SEO', 'Marketing and Growth'),
    ('Paid Ads', 'Marketing and Growth'), ('Google Ads', 'Marketing and Growth'),
    ('Meta Ads', 'Marketing and Growth'), ('TikTok Ads', 'Marketing and Growth'),
    ('Campaign Management', 'Marketing and Growth'), ('Lead Generation', 'Marketing and Growth'),
    ('Partnerships', 'Marketing and Growth'), ('Public Relations', 'Marketing and Growth'),
    ('Sales', 'Sales and Business'), ('B2B Sales', 'Sales and Business'),
    ('B2C Sales', 'Sales and Business'), ('SaaS Sales', 'Sales and Business'),
    ('Business Development', 'Sales and Business'), ('Account Management', 'Sales and Business'),
    ('Customer Success', 'Sales and Business'), ('Cold Outreach', 'Sales and Business'),
    ('Appointment Setting', 'Sales and Business'), ('Closing', 'Sales and Business'),
    ('Sales Operations', 'Sales and Business'), ('CRM', 'Sales and Business'),
    ('HubSpot', 'Sales and Business'), ('Salesforce', 'Sales and Business'),
    ('Negotiation', 'Sales and Business'), ('Fundraising', 'Sales and Business'),
    ('Investor Relations', 'Sales and Business'), ('Operations', 'Sales and Business'),
    ('Project Management', 'Sales and Business'), ('Product Management', 'Sales and Business'),
    ('Strategy', 'Sales and Business'),
    ('Content Creation', 'Content and Creative'), ('Video Editing', 'Content and Creative'),
    ('Short-Form Video', 'Content and Creative'), ('Long-Form Video', 'Content and Creative'),
    ('Clipping', 'Content and Creative'), ('CapCut', 'Content and Creative'),
    ('Adobe Premiere Pro', 'Content and Creative'), ('Final Cut Pro', 'Content and Creative'),
    ('After Effects', 'Content and Creative'), ('Motion Graphics', 'Content and Creative'),
    ('Graphic Design', 'Content and Creative'), ('Canva', 'Content and Creative'),
    ('Figma', 'Content and Creative'), ('Branding', 'Content and Creative'),
    ('Copywriting', 'Content and Creative'), ('Scriptwriting', 'Content and Creative'),
    ('Photography', 'Content and Creative'), ('Videography', 'Content and Creative'),
    ('Podcast Editing', 'Content and Creative'), ('Thumbnail Design', 'Content and Creative'),
    ('UGC', 'Content and Creative'), ('Creative Direction', 'Content and Creative'),
    ('Web Development', 'Technology and Product'), ('Mobile Development', 'Technology and Product'),
    ('Frontend Development', 'Technology and Product'), ('Backend Development', 'Technology and Product'),
    ('Full-Stack Development', 'Technology and Product'), ('React', 'Technology and Product'),
    ('React Native', 'Technology and Product'), ('TypeScript', 'Technology and Product'),
    ('JavaScript', 'Technology and Product'), ('Python', 'Technology and Product'),
    ('Node.js', 'Technology and Product'), ('Supabase', 'Technology and Product'),
    ('PostgreSQL', 'Technology and Product'), ('SQL', 'Technology and Product'),
    ('No-Code', 'Technology and Product'), ('Bubble', 'Technology and Product'),
    ('Webflow', 'Technology and Product'), ('Framer', 'Technology and Product'),
    ('Shopify', 'Technology and Product'), ('WordPress', 'Technology and Product'),
    ('API Integration', 'Technology and Product'), ('Automation', 'Technology and Product'),
    ('AI Tools', 'Technology and Product'), ('Prompt Engineering', 'Technology and Product'),
    ('Data Analysis', 'Technology and Product'), ('UI Design', 'Technology and Product'),
    ('UX Design', 'Technology and Product'), ('Product Design', 'Technology and Product'),
    ('QA Testing', 'Technology and Product'), ('Cybersecurity', 'Technology and Product'),
    ('Financial Modeling', 'Finance and Professional'), ('Valuation', 'Finance and Professional'),
    ('Accounting', 'Finance and Professional'), ('Bookkeeping', 'Finance and Professional'),
    ('Corporate Finance', 'Finance and Professional'), ('Investment Research', 'Finance and Professional'),
    ('Real Estate', 'Finance and Professional'), ('Underwriting', 'Finance and Professional'),
    ('Excel', 'Finance and Professional'), ('PowerPoint', 'Finance and Professional'),
    ('Legal Research', 'Finance and Professional'), ('Recruiting', 'Finance and Professional'),
    ('Human Resources', 'Finance and Professional'), ('Consulting', 'Finance and Professional'),
    ('Business Analysis', 'Finance and Professional'),
    ('YouTube', 'Creator and Online Business'), ('TikTok', 'Creator and Online Business'),
    ('Instagram', 'Creator and Online Business'), ('X / Twitter', 'Creator and Online Business'),
    ('Discord', 'Creator and Online Business'), ('Newsletter', 'Creator and Online Business'),
    ('Community Building', 'Creator and Online Business'), ('Creator Partnerships', 'Creator and Online Business'),
    ('E-commerce', 'Creator and Online Business'), ('Amazon', 'Creator and Online Business'),
    ('Etsy', 'Creator and Online Business'), ('Dropshipping', 'Creator and Online Business'),
    ('Online Courses', 'Creator and Online Business'), ('Coaching', 'Creator and Online Business'),
    ('Livestreaming', 'Creator and Online Business'), ('Personal Branding', 'Creator and Online Business')
)
insert into public.skills (name, normalized_name, category, is_curated, is_default_suggestion)
select curated.name,
  trim(regexp_replace(lower(curated.name), '[^a-z0-9]+', ' ', 'g')),
  curated.category,
  true,
  true
from curated
where not exists (
  select 1 from public.skills skill
  where trim(regexp_replace(lower(skill.name), '[^a-z0-9]+', ' ', 'g')) =
    trim(regexp_replace(lower(curated.name), '[^a-z0-9]+', ' ', 'g'))
);

update public.skills skill
set is_curated = true,
    is_default_suggestion = true,
    category = curated.category
from (
  values
    ('Marketing', 'Marketing and Growth'), ('Sales', 'Sales and Business'),
    ('Video Editing', 'Content and Creative'), ('Clipping', 'Content and Creative'),
    ('CapCut', 'Content and Creative'), ('Social Media Marketing', 'Marketing and Growth')
) as curated(name, category)
where skill.normalized_name =
  trim(regexp_replace(lower(curated.name), '[^a-z0-9]+', ' ', 'g'));

create table public.industry_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  category text not null default 'General',
  is_curated boolean not null default true,
  is_default_suggestion boolean not null default true,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint industry_catalog_name_length check (char_length(trim(name)) between 1 and 80)
);

insert into public.industry_catalog (name, normalized_name)
select name, trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g'))
from unnest(array[
  'Advertising','Aerospace','Agriculture','AI / Machine Learning','Automotive',
  'Beauty','Biotechnology','Blockchain / Crypto','Business Services','Consumer Products',
  'Creator Economy','Cybersecurity','E-commerce','Education','Energy','Entertainment',
  'Fashion','Financial Services','Fitness','Food and Beverage','Gaming','Government',
  'Healthcare','Hospitality','Insurance','Legal','Logistics','Manufacturing','Marketing',
  'Media','Music','Nonprofit','Professional Services','Real Estate','Recruiting','Retail',
  'SaaS','Social Media','Sports','Technology','Telecommunications','Travel',
  'Venture Capital','Web3'
]) as name
on conflict (normalized_name) do nothing;

create table public.location_catalog (
  id text primary key,
  display_label text not null,
  city text,
  region text,
  country text not null,
  country_code text not null,
  location_type text not null check (location_type in ('city', 'region', 'country')),
  search_text text not null,
  priority integer not null default 100,
  is_active boolean not null default true
);

insert into public.location_catalog
  (id, display_label, city, region, country, country_code, location_type, search_text, priority)
values
  ('us-il-chicago','Chicago, Illinois, United States','Chicago','Illinois','United States','US','city','chicago illinois il united states usa',1),
  ('us-ny-new-york','New York, New York, United States','New York','New York','United States','US','city','new york city ny united states usa',1),
  ('us-ca-los-angeles','Los Angeles, California, United States','Los Angeles','California','United States','US','city','los angeles california ca united states usa',2),
  ('us-ca-san-francisco','San Francisco, California, United States','San Francisco','California','United States','US','city','san francisco bay area california ca united states usa',1),
  ('us-tx-austin','Austin, Texas, United States','Austin','Texas','United States','US','city','austin texas tx united states usa',1),
  ('us-ma-boston','Boston, Massachusetts, United States','Boston','Massachusetts','United States','US','city','boston massachusetts ma united states usa',2),
  ('us-wa-seattle','Seattle, Washington, United States','Seattle','Washington','United States','US','city','seattle washington wa united states usa',2),
  ('us-fl-miami','Miami, Florida, United States','Miami','Florida','United States','US','city','miami florida fl united states usa',2),
  ('us-dc-washington','Washington, District of Columbia, United States','Washington','District of Columbia','United States','US','city','washington dc district of columbia united states usa',1),
  ('us-in-south-bend','South Bend, Indiana, United States','South Bend','Indiana','United States','US','city','south bend notre dame indiana in united states usa',1),
  ('gb-eng-london','London, England, United Kingdom','London','England','United Kingdom','GB','city','london england united kingdom uk',2),
  ('ca-on-toronto','Toronto, Ontario, Canada','Toronto','Ontario','Canada','CA','city','toronto ontario canada',2),
  ('ca-on','Ontario, Canada',null,'Ontario','Canada','CA','region','ontario canada',4),
  ('fr-idf-paris','Paris, Ile-de-France, France','Paris','Ile-de-France','France','FR','city','paris ile de france france',3),
  ('de-be-berlin','Berlin, Germany','Berlin','Berlin','Germany','DE','city','berlin germany',3),
  ('es-md-madrid','Madrid, Spain','Madrid','Community of Madrid','Spain','ES','city','madrid spain',4),
  ('nl-nh-amsterdam','Amsterdam, Netherlands','Amsterdam','North Holland','Netherlands','NL','city','amsterdam netherlands',3),
  ('ie-l-dublin','Dublin, Ireland','Dublin','Leinster','Ireland','IE','city','dublin ireland',3),
  ('au-nsw-sydney','Sydney, New South Wales, Australia','Sydney','New South Wales','Australia','AU','city','sydney new south wales australia',3),
  ('sg-singapore','Singapore','Singapore','Singapore','Singapore','SG','city','singapore',3),
  ('in-mh-mumbai','Mumbai, Maharashtra, India','Mumbai','Maharashtra','India','IN','city','mumbai maharashtra india',4),
  ('in-ka-bengaluru','Bengaluru, Karnataka, India','Bengaluru','Karnataka','India','IN','city','bengaluru bangalore karnataka india',3),
  ('jp-13-tokyo','Tokyo, Japan','Tokyo','Tokyo','Japan','JP','city','tokyo japan',3),
  ('ae-du-dubai','Dubai, United Arab Emirates','Dubai','Dubai','United Arab Emirates','AE','city','dubai uae united arab emirates',3)
on conflict (id) do nothing;

with states(code, name) as (
  values
    ('al','Alabama'),('ak','Alaska'),('az','Arizona'),('ar','Arkansas'),
    ('ca','California'),('co','Colorado'),('ct','Connecticut'),('de','Delaware'),
    ('fl','Florida'),('ga','Georgia'),('hi','Hawaii'),('id','Idaho'),
    ('il','Illinois'),('in','Indiana'),('ia','Iowa'),('ks','Kansas'),
    ('ky','Kentucky'),('la','Louisiana'),('me','Maine'),('md','Maryland'),
    ('ma','Massachusetts'),('mi','Michigan'),('mn','Minnesota'),('ms','Mississippi'),
    ('mo','Missouri'),('mt','Montana'),('ne','Nebraska'),('nv','Nevada'),
    ('nh','New Hampshire'),('nj','New Jersey'),('nm','New Mexico'),('ny','New York'),
    ('nc','North Carolina'),('nd','North Dakota'),('oh','Ohio'),('ok','Oklahoma'),
    ('or','Oregon'),('pa','Pennsylvania'),('ri','Rhode Island'),('sc','South Carolina'),
    ('sd','South Dakota'),('tn','Tennessee'),('tx','Texas'),('ut','Utah'),
    ('vt','Vermont'),('va','Virginia'),('wa','Washington'),('wv','West Virginia'),
    ('wi','Wisconsin'),('wy','Wyoming'),('dc','District of Columbia')
)
insert into public.location_catalog
  (id, display_label, region, country, country_code, location_type, search_text, priority)
select 'us-' || code,
  name || ', United States',
  name,
  'United States',
  'US',
  'region',
  lower(name || ' ' || code || ' united states usa'),
  10
from states
on conflict (id) do nothing;

insert into public.location_catalog
  (id, display_label, country, country_code, location_type, search_text, priority)
values
  ('country-us','United States','United States','US','country','united states usa',20),
  ('country-ca','Canada','Canada','CA','country','canada',20),
  ('country-gb','United Kingdom','United Kingdom','GB','country','united kingdom uk england scotland wales',20),
  ('country-au','Australia','Australia','AU','country','australia',20),
  ('country-in','India','India','IN','country','india',20),
  ('country-fr','France','France','FR','country','france',20),
  ('country-de','Germany','Germany','DE','country','germany',20),
  ('country-es','Spain','Spain','ES','country','spain',20),
  ('country-nl','Netherlands','Netherlands','NL','country','netherlands holland',20),
  ('country-ie','Ireland','Ireland','IE','country','ireland',20),
  ('country-sg','Singapore','Singapore','SG','country','singapore',20),
  ('country-jp','Japan','Japan','JP','country','japan',20),
  ('country-ae','United Arab Emirates','United Arab Emirates','AE','country','united arab emirates uae',20),
  ('country-br','Brazil','Brazil','BR','country','brazil',20),
  ('country-mx','Mexico','Mexico','MX','country','mexico',20)
on conflict (id) do nothing;

alter table public.profiles
add column if not exists banner_path text,
add column if not exists location_id text references public.location_catalog(id) on delete set null,
add column if not exists location_region text,
add column if not exists location_country text,
add column if not exists profile_template text not null default 'clean',
add column if not exists profile_accent text not null default 'purple',
add column if not exists profile_header_alignment text not null default 'left',
add column if not exists profile_card_shape text not null default 'soft',
add column if not exists profile_background text not null default 'neutral';

alter table public.profiles
drop constraint if exists profiles_profile_template_check,
add constraint profiles_profile_template_check
  check (profile_template in ('clean','creator','studio','bold')),
drop constraint if exists profiles_profile_accent_check,
add constraint profiles_profile_accent_check
  check (profile_accent in ('purple','blue','green','rose','charcoal')),
drop constraint if exists profiles_profile_header_alignment_check,
add constraint profiles_profile_header_alignment_check
  check (profile_header_alignment in ('left','center')),
drop constraint if exists profiles_profile_card_shape_check,
add constraint profiles_profile_card_shape_check
  check (profile_card_shape in ('soft','pill','squared')),
drop constraint if exists profiles_profile_background_check,
add constraint profiles_profile_background_check
  check (profile_background in ('neutral','soft_gradient','banner_led'));

alter table public.businesses
add column if not exists location_id text references public.location_catalog(id) on delete set null,
add column if not exists location_region text,
add column if not exists location_country text;

alter table public.opportunities
add column if not exists location_id text references public.location_catalog(id) on delete set null,
add column if not exists location_region text,
add column if not exists location_country text;

create table public.profile_current_intents (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  intent text not null,
  visibility text not null default 'public',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (profile_id, intent),
  constraint profile_current_intents_value_check check (intent in (
    'building_startup','looking_for_cofounder','looking_for_collaborators',
    'open_to_freelance','looking_for_internships','looking_for_job','hiring',
    'looking_for_projects','offering_skills','just_networking',
    'offering_mentorship','seeking_mentorship'
  )),
  constraint profile_current_intents_visibility_check check (visibility in ('public','private')),
  constraint profile_current_intents_order_check check (display_order between 0 and 2)
);

create table public.profile_prompts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  prompt_key text not null,
  answer text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, prompt_key),
  constraint profile_prompts_answer_length check (char_length(trim(answer)) between 1 and 280),
  constraint profile_prompts_order_check check (display_order between 0 and 2)
);

create or replace function public.enforce_phase45_profile_limits()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_count integer;
  maximum_count integer;
begin
  maximum_count := case
    when tg_table_name = 'portfolio_items' then 12
    else 3
  end;
  execute format(
    'select count(*) from public.%I where profile_id = $1',
    tg_table_name
  )
  into existing_count
  using new.profile_id;
  if existing_count >= maximum_count then
    raise exception 'This profile section has reached its item limit.';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_prompts_set_updated_at on public.profile_prompts;
create trigger profile_prompts_set_updated_at
before update on public.profile_prompts
for each row execute function public.set_updated_at();

alter table public.user_links
add column if not exists icon_key text;

alter table public.portfolio_items
add column if not exists item_type text not null default 'project_link',
add column if not exists storage_path text,
add column if not exists thumbnail_url text,
add column if not exists accessibility_description text;

alter table public.portfolio_items
drop constraint if exists portfolio_items_item_type_check,
add constraint portfolio_items_item_type_check
  check (item_type in ('image','external_video','project_link')),
drop constraint if exists portfolio_items_order_check,
add constraint portfolio_items_order_check
  check (display_order between 0 and 11);

drop trigger if exists profile_current_intents_limit on public.profile_current_intents;
create trigger profile_current_intents_limit
before insert on public.profile_current_intents
for each row execute function public.enforce_phase45_profile_limits();

drop trigger if exists profile_prompts_limit on public.profile_prompts;
create trigger profile_prompts_limit
before insert on public.profile_prompts
for each row execute function public.enforce_phase45_profile_limits();

drop trigger if exists portfolio_items_limit on public.portfolio_items;
create trigger portfolio_items_limit
before insert on public.portfolio_items
for each row execute function public.enforce_phase45_profile_limits();

create index if not exists profile_current_intents_profile_order_idx
on public.profile_current_intents (profile_id, display_order);
create index if not exists profile_prompts_profile_order_idx
on public.profile_prompts (profile_id, display_order);
create index if not exists portfolio_items_profile_order_idx
on public.portfolio_items (profile_id, display_order);
create index if not exists location_catalog_search_idx
on public.location_catalog using gin (to_tsvector('simple', search_text));

alter table public.industry_catalog enable row level security;
alter table public.location_catalog enable row level security;
alter table public.profile_current_intents enable row level security;
alter table public.profile_prompts enable row level security;

create policy "Industry catalog is readable"
on public.industry_catalog for select
to authenticated
using (true);

create policy "Users add their own custom industries"
on public.industry_catalog for insert
to authenticated
with check (
  created_by_profile_id = auth.uid()
  and not is_curated
  and not is_default_suggestion
);

create policy "Location catalog is readable"
on public.location_catalog for select
to authenticated
using (is_active);

create policy "Public current intents are readable"
on public.profile_current_intents for select
to authenticated
using (
  profile_id = auth.uid()
  or (
    visibility = 'public'
    and exists (
      select 1 from public.profiles profile
      where profile.id = profile_id
        and profile.deleted_at is null
        and profile.onboarding_completed_at is not null
    )
  )
);

create policy "Users manage their own current intents"
on public.profile_current_intents for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Profile prompts are readable"
on public.profile_prompts for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.profiles profile
    where profile.id = profile_id
      and profile.deleted_at is null
      and profile.onboarding_completed_at is not null
  )
);

create policy "Users manage their own profile prompts"
on public.profile_prompts for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'profile-media',
  'profile-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Readable profile media can be viewed"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-media'
  and exists (
    select 1 from public.profiles profile
    where profile.id::text = (storage.foldername(name))[1]
      and profile.deleted_at is null
      and profile.onboarding_completed_at is not null
  )
);

create policy "Users upload profile media to their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users update profile media in their folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users delete profile media in their folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

grant select, insert on public.industry_catalog to authenticated;
grant select on public.location_catalog to authenticated;
grant select, insert, update, delete on public.profile_current_intents to authenticated;
grant select, insert, update, delete on public.profile_prompts to authenticated;
