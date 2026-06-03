-- Ejecutar en SQL Editor ANTES de aplicar 20250602000000_destilador_mezcal_core.sql
-- Debe devolver 0 filas en cada consulta (sin conflicto de nombres).

select 'CONFLICT' as issue, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'destilador_sequences',
    'bodegas',
    'viajes',
    'productos_viaje',
    'lotes',
    'corridas_embotellado',
    'stock_botellas_vacias',
    'expresiones_producto',
    'stock_etiquetas',
    'cajas',
    'botellas',
    'movimientos_inventario',
    'pedidos_destilador',
    'items_pedido_destilador'
  );

-- Distribuidor (no deben chocar si pedidos_destilador se usa en lugar de pedidos duplicado)
select 'DIST_EXISTS' as label, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('pedidos', 'items_pedido', 'dist_products', 'skus');
