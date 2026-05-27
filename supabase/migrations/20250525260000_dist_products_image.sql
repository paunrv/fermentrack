-- Imagen de etiqueta en dist_products + bucket de Storage 'product-images'

alter table dist_products add column if not exists image_url text;

-- Crear bucket público para imágenes de productos
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Policies sobre storage.objects para el bucket product-images.
-- En dev la app usa la anon key (Clerk maneja la autenticación en cliente),
-- así que damos permisos amplios para anon. Ajustar para producción.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_public_read'
  ) then
    create policy product_images_public_read on storage.objects
      for select
      using (bucket_id = 'product-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_anon_insert'
  ) then
    create policy product_images_anon_insert on storage.objects
      for insert
      with check (bucket_id = 'product-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_anon_update'
  ) then
    create policy product_images_anon_update on storage.objects
      for update
      using (bucket_id = 'product-images')
      with check (bucket_id = 'product-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_anon_delete'
  ) then
    create policy product_images_anon_delete on storage.objects
      for delete
      using (bucket_id = 'product-images');
  end if;
end $$;
