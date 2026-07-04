-- M8 · Validación post-cutover (solo SELECT). Ejecutar tras apply-dist-m8-legacy-revoke.sql

-- 1) RPC sync eliminados (debe ser 0 filas)
select routine_schema, routine_name
from information_schema.routines
where routine_schema in ('public', 'proof')
  and routine_name in ('sync_all_skus_for_scope', 'sync_sku_from_dist_product');

-- 2) Columna legacy en skus (debe fallar o 42703 si PostgREST; aquí: 0 filas)
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'skus'
  and column_name = 'dist_product_id';

-- 3) Tablas dist_* (prod: ninguna fila)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('dist_products', 'dist_inventory', 'dist_movements');

-- 4) Vistas legacy (solo si dist_* existían en el entorno)
select table_name
from information_schema.views
where table_schema = 'public'
  and table_name like 'dist_%_legacy';

-- 5) Catálogo activo
select count(*) as skus_activos from public.skus;
select count(*) as movimientos from public.movimientos_sku;
