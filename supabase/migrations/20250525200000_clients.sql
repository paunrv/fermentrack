-- Clientes: restaurantes, bares, tiendas y sub-distribuidores

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('restaurante', 'bar', 'tienda', 'sub-distribuidor')),
  contact_name text,
  phone text,
  email text,
  address text,
  price_tier text not null default 'regular' check (price_tier in ('regular', 'mayoreo', 'especial')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists clients_type_idx on clients(type);
create index if not exists clients_price_tier_idx on clients(price_tier);
