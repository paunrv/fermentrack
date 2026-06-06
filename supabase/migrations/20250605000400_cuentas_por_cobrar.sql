-- =============================================================================
-- PROOF · Distribuidor — Cuentas por cobrar (CxC) + pagos de cliente
-- Aditivo · al entregar pedido se genera CxC automáticamente
-- =============================================================================

do $$ begin
  create type public.estado_cuenta_por_cobrar as enum ('pendiente', 'parcial', 'pagada', 'vencida');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.metodo_pago_cliente as enum ('efectivo', 'transferencia', 'cheque');
exception when duplicate_object then null;
end $$;

create table if not exists public.cuentas_por_cobrar (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  pedido_id uuid not null references public.pedidos(id) on delete restrict,
  cliente_nombre text not null default '',
  monto_total numeric(12, 2) not null check (monto_total >= 0),
  monto_pagado numeric(12, 2) not null default 0 check (monto_pagado >= 0),
  saldo_pendiente numeric(12, 2) generated always as (monto_total - monto_pagado) stored,
  estado public.estado_cuenta_por_cobrar not null default 'pendiente',
  fecha_vencimiento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pedido_id),
  check (monto_pagado <= monto_total)
);

create index if not exists cuentas_por_cobrar_scope_idx
  on public.cuentas_por_cobrar (clerk_id, profile_type_v2);

create index if not exists cuentas_por_cobrar_estado_idx
  on public.cuentas_por_cobrar (estado);

create index if not exists cuentas_por_cobrar_vencimiento_idx
  on public.cuentas_por_cobrar (fecha_vencimiento);

create table if not exists public.pagos_cliente (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  cuenta_por_cobrar_id uuid not null references public.cuentas_por_cobrar(id) on delete restrict,
  monto numeric(12, 2) not null check (monto > 0),
  metodo public.metodo_pago_cliente not null default 'transferencia',
  referencia text,
  fecha_pago date not null default current_date,
  nota text,
  created_at timestamptz not null default now()
);

create index if not exists pagos_cliente_cuenta_idx
  on public.pagos_cliente (cuenta_por_cobrar_id);

create index if not exists pagos_cliente_scope_idx
  on public.pagos_cliente (clerk_id, profile_type_v2);

-- Días de crédito desde condicion_pago (contado → 0, 30_dias → 30, etc.)
create or replace function proof.dias_credito_condicion(p_condicion text)
returns integer
language plpgsql
immutable
as $$
declare
  v_norm text;
  v_match text[];
begin
  v_norm := lower(trim(coalesce(p_condicion, 'contado')));
  if v_norm in ('contado', 'anticipo', 'contra_entrega') then
    return 0;
  end if;
  v_match := regexp_match(v_norm, '^(\d+)_dias$');
  if v_match is not null then
    return v_match[1]::integer;
  end if;
  v_match := regexp_match(v_norm, '(\d+)\s*d[ií]as?');
  if v_match is not null then
    return v_match[1]::integer;
  end if;
  return 0;
end;
$$;

create or replace function proof.trg_cxc_refresh_estado()
returns trigger
language plpgsql
as $$
begin
  if new.monto_pagado >= new.monto_total then
    new.estado := 'pagada'::public.estado_cuenta_por_cobrar;
  elsif new.fecha_vencimiento is not null
    and new.fecha_vencimiento < current_date
    and (new.monto_total - new.monto_pagado) > 0 then
    new.estado := 'vencida'::public.estado_cuenta_por_cobrar;
  elsif new.monto_pagado > 0 then
    new.estado := 'parcial'::public.estado_cuenta_por_cobrar;
  else
    new.estado := 'pendiente'::public.estado_cuenta_por_cobrar;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cuentas_por_cobrar_refresh_estado on public.cuentas_por_cobrar;
create trigger cuentas_por_cobrar_refresh_estado
  before insert or update of monto_pagado, monto_total, fecha_vencimiento on public.cuentas_por_cobrar
  for each row
  execute function proof.trg_cxc_refresh_estado();

-- Crear CxC para un pedido entregado (idempotente)
create or replace function proof.crear_cuenta_por_cobrar_pedido(p_pedido_id uuid)
returns public.cuentas_por_cobrar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_cliente text;
  v_dias integer;
  v_cuenta public.cuentas_por_cobrar%rowtype;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id;
  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_pedido.estado not in ('entregado', 'parcial') then
    raise exception 'Pedido % no está entregado', v_pedido.numero;
  end if;

  select c.name into v_cliente
  from public.clients c
  where c.id = v_pedido.cliente_id;

  select * into v_cuenta
  from public.cuentas_por_cobrar
  where pedido_id = p_pedido_id;

  if found then
    return v_cuenta;
  end if;

  if coalesce(v_pedido.total, 0) <= 0 then
    raise exception 'Pedido % sin monto a cobrar', v_pedido.numero;
  end if;

  v_dias := proof.dias_credito_condicion(v_pedido.condicion_pago);

  insert into public.cuentas_por_cobrar (
    clerk_id,
    profile_type_v2,
    pedido_id,
    cliente_nombre,
    monto_total,
    fecha_vencimiento
  )
  values (
    v_pedido.clerk_id,
    v_pedido.profile_type_v2,
    p_pedido_id,
    coalesce(v_cliente, 'Cliente'),
    v_pedido.total,
    v_pedido.fecha_entrega + v_dias
  )
  returning * into v_cuenta;

  return v_cuenta;
end;
$$;

-- Registrar pago de cliente (atómico)
create or replace function proof.registrar_pago_cliente(
  p_cuenta_id uuid,
  p_monto numeric,
  p_metodo public.metodo_pago_cliente default 'transferencia',
  p_referencia text default null,
  p_nota text default null
)
returns public.cuentas_por_cobrar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta public.cuentas_por_cobrar%rowtype;
  v_pago numeric;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'monto debe ser mayor a 0';
  end if;

  select * into v_cuenta
  from public.cuentas_por_cobrar
  where id = p_cuenta_id
  for update;

  if not found then
    raise exception 'Cuenta por cobrar no encontrada: %', p_cuenta_id;
  end if;

  if not proof.row_belongs_to_requester(v_cuenta.clerk_id, v_cuenta.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_cuenta.estado = 'pagada' then
    raise exception 'La cuenta de % ya está pagada', v_cuenta.cliente_nombre;
  end if;

  v_pago := least(p_monto, v_cuenta.monto_total - v_cuenta.monto_pagado);

  insert into public.pagos_cliente (
    clerk_id, profile_type_v2, cuenta_por_cobrar_id,
    monto, metodo, referencia, nota, fecha_pago
  )
  values (
    v_cuenta.clerk_id, v_cuenta.profile_type_v2, p_cuenta_id,
    v_pago, coalesce(p_metodo, 'transferencia'::public.metodo_pago_cliente),
    p_referencia, p_nota, current_date
  );

  update public.cuentas_por_cobrar
  set monto_pagado = monto_pagado + v_pago
  where id = p_cuenta_id
  returning * into v_cuenta;

  return v_cuenta;
end;
$$;

create or replace function public.registrar_pago_cliente(
  p_cuenta_id uuid,
  p_monto numeric,
  p_metodo public.metodo_pago_cliente default 'transferencia',
  p_referencia text default null,
  p_nota text default null
)
returns public.cuentas_por_cobrar
language sql
security definer
set search_path = public
as $$
  select * from proof.registrar_pago_cliente(
    p_cuenta_id, p_monto, p_metodo, p_referencia, p_nota
  );
$$;

create or replace function public.crear_cuenta_por_cobrar_pedido(p_pedido_id uuid)
returns public.cuentas_por_cobrar
language sql
security definer
set search_path = public, proof
as $$
  select proof.crear_cuenta_por_cobrar_pedido(p_pedido_id);
$$;

-- entregar_pedido: crear remisión + CxC al marcar entregado
create or replace function proof.entregar_pedido(p_pedido_id uuid, p_parcial boolean default false)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_item record;
  v_nuevo_estado public.estado_pedido;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido no encontrado: %', p_pedido_id; end if;
  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;
  if v_pedido.estado not in ('confirmado', 'preparando', 'en_ruta', 'parcial') then
    raise exception 'Estado inválido para entrega: %', v_pedido.estado;
  end if;
  v_nuevo_estado := case when p_parcial then 'parcial'::public.estado_pedido else 'entregado'::public.estado_pedido end;
  perform set_config('proof.allow_stock_reservado_mutation', '1', true);
  for v_item in select ip.sku_id, ip.cantidad from public.items_pedido ip where ip.pedido_id = p_pedido_id loop
    update public.skus s
    set
      stock_total = greatest(0, s.stock_total - v_item.cantidad),
      stock_reservado = greatest(0, s.stock_reservado - v_item.cantidad)
    where s.id = v_item.sku_id;
  end loop;
  update public.pedidos set estado = v_nuevo_estado, updated_at = now() where id = p_pedido_id returning * into v_pedido;

  if v_nuevo_estado = 'entregado' then
    perform proof.crear_remision_distribuidor(p_pedido_id);
  end if;

  if v_nuevo_estado in ('entregado', 'parcial') and coalesce(v_pedido.total, 0) > 0 then
    begin
      perform proof.crear_cuenta_por_cobrar_pedido(p_pedido_id);
    exception when others then
      null;
    end;
  end if;

  return v_pedido;
end;
$$;

create or replace function public.entregar_pedido(p_pedido_id uuid, p_parcial boolean default false)
returns public.pedidos
language sql
security definer
set search_path = public, proof
as $$
  select proof.entregar_pedido(p_pedido_id, p_parcial);
$$;

-- RLS
alter table public.cuentas_por_cobrar enable row level security;
alter table public.pagos_cliente enable row level security;

drop policy if exists cuentas_por_cobrar_select on public.cuentas_por_cobrar;
create policy cuentas_por_cobrar_select on public.cuentas_por_cobrar
  for select using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists cuentas_por_cobrar_insert on public.cuentas_por_cobrar;
create policy cuentas_por_cobrar_insert on public.cuentas_por_cobrar
  for insert with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists cuentas_por_cobrar_update on public.cuentas_por_cobrar;
create policy cuentas_por_cobrar_update on public.cuentas_por_cobrar
  for update
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists pagos_cliente_select on public.pagos_cliente;
create policy pagos_cliente_select on public.pagos_cliente
  for select using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists pagos_cliente_insert on public.pagos_cliente;
create policy pagos_cliente_insert on public.pagos_cliente
  for insert with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

grant select, insert, update on public.cuentas_por_cobrar to authenticated, service_role;
grant select, insert on public.pagos_cliente to authenticated, service_role;
grant usage on type public.estado_cuenta_por_cobrar to authenticated, service_role;
grant usage on type public.metodo_pago_cliente to authenticated, service_role;
grant execute on function public.registrar_pago_cliente(uuid, numeric, public.metodo_pago_cliente, text, text)
  to authenticated, service_role;
grant execute on function public.crear_cuenta_por_cobrar_pedido(uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';
