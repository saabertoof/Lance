-- Phase 3.5: reliable business URL checks and owner-scoped logo uploads.
-- This keeps RLS enabled and does not change the Phase 1-3 migrations.

create or replace function public.is_business_slug_available(
  candidate text,
  excluding_business_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    candidate is not null
    and lower(trim(candidate)) ~ '^[a-z0-9-]{3,60}$'
    and not exists (
      select 1
      from public.businesses business
      where lower(business.slug) = lower(trim(candidate))
        and (
          excluding_business_id is null
          or business.id <> excluding_business_id
          or business.owner_profile_id <> auth.uid()
        )
    );
$$;

revoke all on function public.is_business_slug_available(text, uuid) from public;
grant execute on function public.is_business_slug_available(text, uuid) to authenticated;

create or replace function public.can_manage_business_asset(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (storage.foldername(object_name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.businesses business
      where business.id::text = (storage.foldername(object_name))[2]
        and business.owner_profile_id = auth.uid()
        and business.deleted_at is null
    );
$$;

revoke all on function public.can_manage_business_asset(text) from public;
grant execute on function public.can_manage_business_asset(text) to authenticated;

drop policy if exists "Owners upload business logos in their folder" on storage.objects;
drop policy if exists "Owners update business logos in their folder" on storage.objects;
drop policy if exists "Owners delete business logos in their folder" on storage.objects;

create policy "Owners upload business logos in their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-assets'
  and public.can_manage_business_asset(name)
);

create policy "Owners update business logos in their folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'business-assets'
  and public.can_manage_business_asset(name)
)
with check (
  bucket_id = 'business-assets'
  and public.can_manage_business_asset(name)
);

create policy "Owners delete business logos in their folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-assets'
  and public.can_manage_business_asset(name)
);
