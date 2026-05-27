-- Embotellado, costos de producción y salidas de bodega

create table if not exists bottling (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null references batches(id) on delete cascade,
  unit_type text not null check (unit_type in ('botella', 'lata')),
  materials jsonb not null default '{}',
  total_units integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists production_costs (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null references batches(id) on delete cascade,
  category text not null check (category in (
    'materia_prima', 'mano_obra', 'equipo', 'energia', 'limpieza', 'analisis', 'otro'
  )),
  description text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'MXN',
  cost_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists warehouse_exits (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null references batches(id) on delete cascade,
  units integer not null check (units > 0),
  price_per_unit numeric(12, 2) not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists bottling_batch_id_idx on bottling(batch_id);
create index if not exists production_costs_batch_id_idx on production_costs(batch_id);
create index if not exists warehouse_exits_batch_id_idx on warehouse_exits(batch_id);
