-- Clientes por distribuidor (cartera comercial)
-- Scope: clerk_id + profile_type_v2 = 'distributor' (mismo patrón PROOF)

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  dias_credito integer not null default 0,
  notas text,
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  created_at timestamptz not null default now()
);

create index if not exists clientes_scope_idx
  on public.clientes (clerk_id, profile_type_v2);

-- created_at inmutable
create or replace function proof.trg_clientes_guard_created_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.created_at is distinct from new.created_at then
    raise exception 'created_at no es modificable';
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_guard_created_at on public.clientes;
create trigger clientes_guard_created_at
  before update on public.clientes
  for each row
  execute function proof.trg_clientes_guard_created_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.clientes enable row level security;

drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes
  for select
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists clientes_insert on public.clientes;
create policy clientes_insert on public.clientes
  for insert
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists clientes_update on public.clientes;
create policy clientes_update on public.clientes
  for update
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

grant select, insert, update on public.clientes to authenticated, service_role;

notify pgrst, 'reload schema';
