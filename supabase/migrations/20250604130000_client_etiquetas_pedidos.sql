-- Etiquetas / marcas por cliente (ej. Agua Mala → Mantis, Sirena) + obligatorio en pedidos

create table if not exists public.client_etiquetas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  nombre text not null,
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  created_at timestamptz not null default now(),
  unique (client_id, nombre)
);

create index if not exists client_etiquetas_client_id_idx on public.client_etiquetas (client_id);
create index if not exists client_etiquetas_scope_idx on public.client_etiquetas (clerk_id, profile_type_v2);

alter table public.pedidos
  add column if not exists etiqueta_id uuid references public.client_etiquetas(id) on delete restrict,
  add column if not exists etiqueta_nombre text;

alter table public.skus
  add column if not exists cliente_id uuid references public.clients(id) on delete set null,
  add column if not exists etiqueta_id uuid references public.client_etiquetas(id) on delete set null;

create index if not exists skus_etiqueta_id_idx on public.skus (etiqueta_id);
create index if not exists pedidos_etiqueta_id_idx on public.pedidos (etiqueta_id);

alter table public.client_etiquetas enable row level security;

drop policy if exists client_etiquetas_all on public.client_etiquetas;
create policy client_etiquetas_all on public.client_etiquetas for all
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

grant select, insert, update, delete on public.client_etiquetas to authenticated, service_role;

notify pgrst, 'reload schema';
