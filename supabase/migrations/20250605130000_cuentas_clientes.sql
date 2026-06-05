-- Cuentas clientes (crédito distribuidor) — faltaba en producción, rompía agente PROOF

do $$ begin
  create type public.estado_cuenta_cliente as enum (
    'vigente', 'en_riesgo', 'vencido', 'bloqueado', 'incobrable'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.cuentas_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clients(id) on delete cascade,
  saldo_pendiente numeric(12, 2) not null default 0 check (saldo_pendiente >= 0),
  pedidos_asociados uuid[] not null default '{}',
  fecha_ultima_factura date,
  fecha_vencimiento date,
  dias_vencido integer not null default 0 check (dias_vencido >= 0),
  pedido_activo_hoy boolean not null default false,
  estado public.estado_cuenta_cliente not null default 'vigente',
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_id, profile_type_v2, cliente_id)
);

create index if not exists cuentas_clientes_scope_idx on public.cuentas_clientes (clerk_id, profile_type_v2);

alter table public.cuentas_clientes enable row level security;

drop policy if exists cuentas_clientes_all on public.cuentas_clientes;
create policy cuentas_clientes_all on public.cuentas_clientes for all
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

grant select, insert, update, delete on public.cuentas_clientes to authenticated, service_role;
grant usage on type public.estado_cuenta_cliente to authenticated, service_role;

notify pgrst, 'reload schema';
