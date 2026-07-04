-- M7 · product-images bucket: RLS por skus/{sku_id}/... + Supabase Auth
-- Project: stjnoacbdcjhhucaoqrw · Run ONCE in SQL Editor
-- Path canónico en app: skus/{sku_id}/{timestamp}.{ext}
-- Acepta legacy {sku_id}/... durante transición (lectura/subida si el SKU es tuyo)

begin;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

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
    where (
      (
        (storage.foldername(object_name))[1] = 'skus'
        and s.id::text = (storage.foldername(object_name))[2]
      )
      or (
        (storage.foldername(object_name))[1] <> 'skus'
        and s.id::text = (storage.foldername(object_name))[1]
      )
    )
    and (
      s.user_id = auth.uid()
      or proof.auth_has_staff_access_to_scope(s.clerk_id, s.profile_type_v2)
    )
  );
$$;

grant execute on function proof.sku_image_path_owned(text) to authenticated, service_role;

-- Quitar políticas anon legacy (dev) si existen
drop policy if exists product_images_anon_insert on storage.objects;
drop policy if exists product_images_anon_update on storage.objects;
drop policy if exists product_images_anon_delete on storage.objects;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select
  using (bucket_id = 'product-images');

drop policy if exists product_images_owner_insert on storage.objects;
create policy product_images_owner_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and proof.sku_image_path_owned(name)
  );

drop policy if exists product_images_owner_update on storage.objects;
create policy product_images_owner_update on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and proof.sku_image_path_owned(name)
  )
  with check (
    bucket_id = 'product-images'
    and proof.sku_image_path_owned(name)
  );

drop policy if exists product_images_owner_delete on storage.objects;
create policy product_images_owner_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and proof.sku_image_path_owned(name)
  );

notify pgrst, 'reload schema';

commit;
