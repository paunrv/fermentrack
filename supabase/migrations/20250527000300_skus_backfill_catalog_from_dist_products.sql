-- M4 · Backfill columnas catálogo en skus desde dist_products (solo filas emparejadas)
-- Requiere M1 aplicada y tabla dist_products existente.
--
-- Si falla "relation dist_products does not exist", ejecutar primero el bloque
-- DIAGNÓSTICO (más abajo) en SQL Editor y confirmar schema/nombre real.

-- -----------------------------------------------------------------------------
-- BACKFILL (dist_products sin prefijo public — igual que migraciones legacy)
-- -----------------------------------------------------------------------------

update public.skus s
set
  origen = dp.origin,
  tipo_unidad = dp.unit_type,
  precio_mayoreo = dp.price_mayoreo,
  precio_especial = dp.price_especial,
  moneda = dp.currency,
  notas = dp.notes,
  imagen_url = dp.image_url,
  updated_at = now()
from dist_products dp
where s.dist_product_id = dp.id;

-- Validación 1: dist_products con scope sin SKU emparejado (debe ser 0 filas)
select dp.id, dp.name
from dist_products dp
left join public.skus s on s.dist_product_id = dp.id
where dp.clerk_id is not null and s.id is null;

-- Validación 2: muestra de 5 SKUs backfilled
select
  s.nombre,
  s.origen,
  s.tipo_unidad,
  s.precio_mayoreo,
  s.moneda,
  s.imagen_url
from public.skus s
where s.dist_product_id is not null
order by s.updated_at desc
limit 5;

-- -----------------------------------------------------------------------------
-- DIAGNÓSTICO (ejecutar solo si el UPDATE falla por tabla inexistente)
-- -----------------------------------------------------------------------------
-- select table_schema, table_name
-- from information_schema.tables
-- where table_name ilike '%dist%product%'
-- order by 1, 2;
--
-- select
--   count(*) as total_skus,
--   count(dist_product_id) as con_dist_product_id
-- from public.skus;
