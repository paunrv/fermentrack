-- Inventario y movimientos de productos para distribución

create table if not exists dist_inventory (
  product_id uuid primary key references dist_products(id) on delete cascade,
  cases integer not null default 0 check (cases >= 0),
  loose_units integer not null default 0 check (loose_units >= 0),
  max_units integer not null default 0 check (max_units >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists dist_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references dist_products(id) on delete cascade,
  movement_type text not null check (movement_type in ('entrada', 'salida')),
  cases integer not null default 0 check (cases >= 0),
  loose_units integer not null default 0 check (loose_units >= 0),
  movement_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists dist_movements_product_id_idx on dist_movements(product_id);
create index if not exists dist_movements_movement_type_idx on dist_movements(movement_type);
create index if not exists dist_movements_movement_date_idx on dist_movements(movement_date desc);
