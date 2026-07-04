-- Prereq for 20260624160000_drop_clerk_columns.sql
-- Run ONCE in SQL Editor when DROP auth_has_staff_access_to_scope(text,text) fails with 2BP01.
-- Cause: M2 (movimientos_sku) + proof_profiles_restore policies still bind the text overload.
-- After success, re-run the full drop_clerk_columns migration.

begin;

-- Ensure uuid overload exists (patron_user_id — no clerk_id)
create or replace function proof.auth_has_staff_access_to_scope(
  p_scope_user_id uuid,
  p_profile_type_v2 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trabajadores t
    where t.user_id = auth.uid()
      and t.profile_type_v2 = p_profile_type_v2
      and t.activo = true
      and (
        (t.rol = 'patron' and t.user_id = p_scope_user_id)
        or (t.rol <> 'patron' and t.patron_user_id = p_scope_user_id)
      )
  );
$$;

grant execute on function proof.auth_has_staff_access_to_scope(uuid, text)
  to authenticated, service_role;

-- movimientos_sku · backfill + RLS (M2, not in drop_clerk §4)
update public.movimientos_sku m
set user_id = s.user_id
from public.skus s
where m.user_id is null
  and m.sku_id = s.id
  and s.user_id is not null;

update public.movimientos_sku m
set user_id = ref.user_id
from (
  select distinct clerk_id, user_id
  from public.skus
  where user_id is not null and clerk_id is not null
) ref
where m.user_id is null
  and m.clerk_id = ref.clerk_id;

drop policy if exists movimientos_sku_select on public.movimientos_sku;
create policy movimientos_sku_select on public.movimientos_sku
  for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

drop policy if exists movimientos_sku_insert on public.movimientos_sku;
create policy movimientos_sku_insert on public.movimientos_sku
  for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

drop policy if exists movimientos_sku_update on public.movimientos_sku;
create policy movimientos_sku_update on public.movimientos_sku
  for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

drop policy if exists movimientos_sku_delete on public.movimientos_sku;
create policy movimientos_sku_delete on public.movimientos_sku
  for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- proof_profiles · staff check on user_id (table keeps clerk_id column for now)
drop policy if exists proof_profiles_select on public.proof_profiles;
create policy proof_profiles_select on public.proof_profiles
  for select
  using (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

drop policy if exists proof_profiles_update on public.proof_profiles;
create policy proof_profiles_update on public.proof_profiles
  for update
  using (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
  );

-- storage M7/M8 · sku_image_path_owned
create or replace function proof.sku_image_path_owned(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, proof
as $$
  select exists (
    select 1
    from public.skus s
    where (storage.foldername(object_name))[1] = 'skus'
      and s.id::text = (storage.foldername(object_name))[2]
      and (
        s.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(s.user_id, s.profile_type_v2)
      )
  );
$$;

grant execute on function proof.sku_image_path_owned(text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
