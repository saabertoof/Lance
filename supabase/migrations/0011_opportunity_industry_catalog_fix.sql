begin;

-- Phase 4.5 introduced a shared industry catalog, but the older Phase 3
-- opportunity and business constraints still allowed only their original
-- hard-coded values. Keep the field bounded while allowing catalog entries.
alter table public.opportunities
drop constraint if exists opportunities_phase3_industry_check,
add constraint opportunities_industry_catalog_value_check check (
  industry is null
  or char_length(trim(industry)) between 1 and 80
);

alter table public.businesses
drop constraint if exists businesses_phase3_industry_check,
add constraint businesses_industry_catalog_value_check check (
  industry is null
  or char_length(trim(industry)) between 1 and 80
);

commit;
