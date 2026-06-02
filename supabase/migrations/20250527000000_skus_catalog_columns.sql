-- M1 · dist_products → skus — columnas de catálogo faltantes (solo aditivo)
-- Paridad con dist_products: origin, unit_type, price tiers, currency, notes, image_url

alter table public.skus
  add column if not exists origen text not null default 'local',
  add column if not exists tipo_unidad text not null default 'botella',
  add column if not exists precio_mayoreo numeric(12, 2) not null default 0,
  add column if not exists precio_especial numeric(12, 2) not null default 0,
  add column if not exists moneda text not null default 'MXN',
  add column if not exists notas text,
  add column if not exists imagen_url text;

alter table public.skus drop constraint if exists skus_origen_check;
alter table public.skus add constraint skus_origen_check
  check (origen in ('local', 'importado'));

alter table public.skus drop constraint if exists skus_tipo_unidad_check;
alter table public.skus add constraint skus_tipo_unidad_check
  check (tipo_unidad in ('botella', 'lata'));

comment on column public.skus.origen is 'Paridad dist_products.origin';
comment on column public.skus.tipo_unidad is 'Paridad dist_products.unit_type';
comment on column public.skus.precio_mayoreo is 'Paridad dist_products.price_mayoreo';
comment on column public.skus.precio_especial is 'Paridad dist_products.price_especial';
comment on column public.skus.moneda is 'Paridad dist_products.currency';
comment on column public.skus.notas is 'Paridad dist_products.notes';
comment on column public.skus.imagen_url is 'Paridad dist_products.image_url';
