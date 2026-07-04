-- M4 · Validación skip en prod (sin dist_products legacy)
-- Ejecutar en SQL Editor — solo SELECT + conteos. No modifica datos.
-- Si dist_products no existe y skus no tienen dist_product_id, M4 es N/A (M1 defaults ya aplicados).

-- 1) Tablas legacy
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('dist_products', 'dist_inventory', 'dist_movements', 'skus', 'movimientos_sku')
order by 1;

-- 2) SKUs con enlace legacy (debe ser 0 para skip seguro)
select
  count(*) as total_skus,
  count(dist_product_id) as con_dist_product_id
from public.skus;

-- 3) Muestra catálogo actual (columnas M1)
select id, nombre, origen, tipo_unidad, precio_mayoreo, moneda, dist_product_id
from public.skus
order by updated_at desc
limit 5;
