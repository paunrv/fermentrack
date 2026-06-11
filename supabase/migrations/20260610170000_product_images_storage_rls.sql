-- RLS para bucket product-images (upload desde cliente authenticated)
-- Path: skus/{sku_id}/{timestamp}.{ext}

create or replace function proof.sku_image_path_owned(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, proof
as $$
  select exists (
    select 1
    from public.skus s
    where s.id::text = (storage.foldername(object_name))[2]
      and (storage.foldername(object_name))[1] = 'skus'
      and proof.row_belongs_to_requester(s.clerk_id, s.profile_type_v2)
  );
$$;

grant execute on function proof.sku_image_path_owned(text) to authenticated, service_role;

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
