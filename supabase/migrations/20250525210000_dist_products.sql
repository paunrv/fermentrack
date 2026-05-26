-- Catálogo de productos para distribución (cerveza, vino, destilado)

create table if not exists dist_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('cerveza', 'vino', 'destilado')),
  producer text,
  origin text not null check (origin in ('local', 'importado')),
  unit_type text not null check (unit_type in ('botella', 'lata')),
  bottles_per_case integer not null default 12 check (bottles_per_case > 0),
  cost_per_unit numeric(12, 2) not null default 0,
  price_regular numeric(12, 2) not null default 0,
  price_mayoreo numeric(12, 2) not null default 0,
  price_especial numeric(12, 2) not null default 0,
  currency text not null default 'MXN',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists dist_products_category_idx on dist_products(category);
create index if not exists dist_products_origin_idx on dist_products(origin);
