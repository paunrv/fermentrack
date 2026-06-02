-- Eliminar perfil de usuario "bar" (tipo de cliente "bar" en clients se mantiene).

delete from profiles where profile_type_v2 = 'bar';

update profiles
set extra_profiles = array_remove(extra_profiles, 'bar')
where 'bar' = any(extra_profiles);

alter table profiles drop constraint if exists profiles_profile_type_v2_check;
alter table profiles add constraint profiles_profile_type_v2_check
  check (profile_type_v2 in ('brewer', 'winemaker', 'distiller', 'distributor'));
