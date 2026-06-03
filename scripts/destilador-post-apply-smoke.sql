-- Smoke test tras aplicar migraciones Destilador (ejecutar como postgres / service role)
-- Sustituir :clerk_id por un clerk_id real con perfil distiller.

-- 1) Tablas creadas
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'bodegas', 'viajes', 'productos_viaje', 'lotes', 'pedidos_destilador'
  )
order by 1;

-- 2) RPC existe
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('proof', 'public')
  and proname in ('destilador_row_owned', 'confirmar_llegada_destilador', 'dest_next_numero_lote');

-- 3) Flujo mínimo (descomentar y poner clerk_id)
/*
\set clerk_id 'user_xxx'

insert into viajes (clerk_id, region, palenquero_nombre, costo_flete, estado)
values (:'clerk_id', 'Oaxaca', 'Test Palenque', 5000, 'en_transito')
returning id;

-- usar viaje_id devuelto:
insert into productos_viaje (clerk_id, viaje_id, tipo_agave, litros_acordados, precio_por_litro)
values (:'clerk_id', '<viaje_id>', 'Espadín', 200, 350);

select * from proof.confirmar_llegada_destilador(
  '<viaje_id>'::uuid,
  jsonb_build_array(
    jsonb_build_object(
      'producto_viaje_id', (select id from productos_viaje where viaje_id = '<viaje_id>' limit 1),
      'litros_salida', 200,
      'litros_recibidos', 195,
      'abv', 48
    )
  )
);

select numero_lote, tipo_agave, litros_recibidos, estado from lotes where viaje_id = '<viaje_id>';
*/
