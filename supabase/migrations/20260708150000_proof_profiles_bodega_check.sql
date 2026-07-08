-- Team cellar profile (platform_profile = bodega) needs proof_profiles rows on onboarding.

alter table public.proof_profiles
  drop constraint if exists profiles_profile_type_check;

alter table public.proof_profiles
  add constraint profiles_profile_type_check
  check (profile_type = any (array['brewer', 'winemaker', 'distiller', 'distributor', 'bodega']::text[]));

alter table public.proof_profiles
  drop constraint if exists profiles_profile_type_v2_check;

alter table public.proof_profiles
  add constraint profiles_profile_type_v2_check
  check (profile_type_v2 = any (array['brewer', 'winemaker', 'distiller', 'distributor', 'bar', 'bodega']::text[]));
