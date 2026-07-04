-- Epic E7 (#66) — mark organization as founding cohort member
-- Run in Supabase SQL editor (service role). Replace slug or id.

-- By slug:
-- update public.organizations
--   set founding_member_at = now()
-- where slug = 'mi-bodega'
--   and founding_member_at is null;

-- By id:
-- update public.organizations
--   set founding_member_at = now()
-- where id = '00000000-0000-0000-0000-000000000000'
--   and founding_member_at is null;

-- Count current cohort:
-- select count(*) from public.organizations where founding_member_at is not null;
