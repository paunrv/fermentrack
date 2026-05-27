-- Ampliar dist_movements para soportar ventas, donaciones, mermas y muestras

alter table dist_movements drop constraint if exists dist_movements_movement_type_check;
alter table dist_movements add constraint dist_movements_movement_type_check
  check (movement_type in ('entrada', 'venta', 'donacion', 'merma', 'muestra'));

alter table dist_movements
  add column if not exists client_id uuid references clients(id) on delete set null,
  add column if not exists recipient text,
  add column if not exists reason text,
  add column if not exists event text,
  add column if not exists unit_price numeric(12, 2),
  add column if not exists total_amount numeric(12, 2),
  add column if not exists currency text;

create index if not exists dist_movements_client_id_idx on dist_movements(client_id);
create index if not exists dist_movements_created_at_idx on dist_movements(created_at desc);
