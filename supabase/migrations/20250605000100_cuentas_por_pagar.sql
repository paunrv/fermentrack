-- =============================================================================
-- PROOF · Distribuidor — Cuentas por pagar (CxP) + pagos a proveedor
-- Aditivo · requiere 20250605000000_ordenes_compra_distribuidor.sql
-- =============================================================================

do $$ begin
  create type public.estado_cuenta_por_pagar as enum ('pendiente', 'parcial', 'pagada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.metodo_pago_proveedor as enum ('efectivo', 'transferencia', 'cheque');
exception when duplicate_object then null;
end $$;

create table if not exists public.cuentas_por_pagar (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  orden_compra_id uuid not null references public.ordenes_compra_distribuidor(id) on delete restrict,
  proveedor_nombre text not null default '',
  monto_total numeric(12, 2) not null check (monto_total >= 0),
  monto_pagado numeric(12, 2) not null default 0 check (monto_pagado >= 0),
  saldo_pendiente numeric(12, 2) generated always as (monto_total - monto_pagado) stored,
  estado public.estado_cuenta_por_pagar not null default 'pendiente',
  fecha_vencimiento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orden_compra_id),
  check (monto_pagado <= monto_total)
);

create index if not exists cuentas_por_pagar_scope_idx
  on public.cuentas_por_pagar (clerk_id, profile_type_v2);

create index if not exists cuentas_por_pagar_estado_idx
  on public.cuentas_por_pagar (estado);

create table if not exists public.pagos_proveedor (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  cuenta_por_pagar_id uuid not null references public.cuentas_por_pagar(id) on delete restrict,
  monto numeric(12, 2) not null check (monto > 0),
  metodo public.metodo_pago_proveedor not null default 'transferencia',
  referencia text,
  fecha_pago date not null default current_date,
  nota text,
  created_at timestamptz not null default now()
);

create index if not exists pagos_proveedor_cuenta_idx
  on public.pagos_proveedor (cuenta_por_pagar_id);

create index if not exists pagos_proveedor_scope_idx
  on public.pagos_proveedor (clerk_id, profile_type_v2);

-- Actualizar estado CxP al cambiar monto_pagado
create or replace function proof.trg_cxp_refresh_estado()
returns trigger
language plpgsql
as $$
begin
  new.estado := case
    when new.monto_pagado >= new.monto_total then 'pagada'::public.estado_cuenta_por_pagar
    when new.monto_pagado > 0 then 'parcial'::public.estado_cuenta_por_pagar
    else 'pendiente'::public.estado_cuenta_por_pagar
  end;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cuentas_por_pagar_refresh_estado on public.cuentas_por_pagar;
create trigger cuentas_por_pagar_refresh_estado
  before insert or update of monto_pagado, monto_total on public.cuentas_por_pagar
  for each row
  execute function proof.trg_cxp_refresh_estado();

-- Registrar pago a proveedor (atómico)
create or replace function proof.registrar_pago_proveedor(
  p_cuenta_id uuid,
  p_monto numeric,
  p_metodo public.metodo_pago_proveedor default 'transferencia',
  p_referencia text default null,
  p_nota text default null
)
returns public.cuentas_por_pagar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta public.cuentas_por_pagar%rowtype;
  v_pago numeric;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'monto debe ser mayor a 0';
  end if;

  select * into v_cuenta
  from public.cuentas_por_pagar
  where id = p_cuenta_id
  for update;

  if not found then
    raise exception 'Cuenta por pagar no encontrada: %', p_cuenta_id;
  end if;

  if not proof.row_belongs_to_requester(v_cuenta.clerk_id, v_cuenta.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_cuenta.estado = 'pagada' then
    raise exception 'La cuenta con % ya está pagada', v_cuenta.proveedor_nombre;
  end if;

  v_pago := least(p_monto, v_cuenta.monto_total - v_cuenta.monto_pagado);

  insert into public.pagos_proveedor (
    clerk_id, profile_type_v2, cuenta_por_pagar_id,
    monto, metodo, referencia, nota, fecha_pago
  )
  values (
    v_cuenta.clerk_id, v_cuenta.profile_type_v2, p_cuenta_id,
    v_pago, coalesce(p_metodo, 'transferencia'::public.metodo_pago_proveedor),
    p_referencia, p_nota, current_date
  );

  update public.cuentas_por_pagar
  set monto_pagado = monto_pagado + v_pago
  where id = p_cuenta_id
  returning * into v_cuenta;

  return v_cuenta;
end;
$$;

create or replace function public.registrar_pago_proveedor(
  p_cuenta_id uuid,
  p_monto numeric,
  p_metodo public.metodo_pago_proveedor default 'transferencia',
  p_referencia text default null,
  p_nota text default null
)
returns public.cuentas_por_pagar
language sql
security definer
set search_path = public
as $$
  select * from proof.registrar_pago_proveedor(
    p_cuenta_id, p_monto, p_metodo, p_referencia, p_nota
  );
$$;

grant execute on function public.registrar_pago_proveedor(uuid, numeric, public.metodo_pago_proveedor, text, text)
  to authenticated, service_role;

-- confirmar_llegada: crear CxP si hay recepción y aún no existe
create or replace function proof.confirmar_llegada_orden_compra_distribuidor(
  p_orden_id uuid,
  p_lineas jsonb
)
returns public.ordenes_compra_distribuidor
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden public.ordenes_compra_distribuidor%rowtype;
  v_elem jsonb;
  v_item public.items_orden_compra_distribuidor%rowtype;
  v_item_id uuid;
  v_cant_rec integer;
  v_sku_id uuid;
  v_codigo text;
  v_todos_completos boolean := true;
  v_alguno_recibido boolean := false;
begin
  select * into v_orden
  from public.ordenes_compra_distribuidor
  where id = p_orden_id
  for update;

  if not found then
    raise exception 'Orden de compra no encontrada: %', p_orden_id;
  end if;

  if not proof.row_belongs_to_requester(v_orden.clerk_id, v_orden.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_orden.estado in ('recibida', 'cancelada') then
    raise exception 'La orden % ya está %', v_orden.numero_orden, v_orden.estado;
  end if;

  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'p_lineas debe ser un arreglo no vacío';
  end if;

  for v_elem in select * from jsonb_array_elements(p_lineas) loop
    v_item_id := (v_elem ->> 'item_id')::uuid;
    v_cant_rec := (v_elem ->> 'cantidad_recibida')::integer;

    if v_item_id is null or v_cant_rec is null then
      raise exception 'cada línea requiere item_id y cantidad_recibida';
    end if;

    if v_cant_rec < 0 then
      raise exception 'cantidad_recibida no puede ser negativa';
    end if;

    select * into v_item
    from public.items_orden_compra_distribuidor
    where id = v_item_id and orden_id = p_orden_id;

    if not found then
      raise exception 'Ítem % no pertenece a la orden', v_item_id;
    end if;

    update public.items_orden_compra_distribuidor
    set cantidad_recibida = v_cant_rec
    where id = v_item_id;

    if v_cant_rec > 0 then
      v_alguno_recibido := true;
      v_sku_id := v_item.sku_id;

      if v_sku_id is null then
        select s.id into v_sku_id
        from public.skus s
        where s.clerk_id = v_orden.clerk_id
          and s.profile_type_v2 = v_orden.profile_type_v2
          and lower(trim(s.nombre)) = lower(trim(v_item.producto_nombre))
        order by s.created_at desc
        limit 1;

        if v_sku_id is null then
          v_codigo := proof.next_codigo(v_orden.clerk_id, v_orden.profile_type_v2, 'sku');
          insert into public.skus (
            codigo, nombre, productor, costo_unitario, stock_total,
            clerk_id, profile_type_v2, ultimo_movimiento
          )
          values (
            v_codigo,
            v_item.producto_nombre,
            v_orden.proveedor_nombre,
            v_item.costo_unitario,
            v_cant_rec,
            v_orden.clerk_id,
            v_orden.profile_type_v2,
            now()
          )
          returning id into v_sku_id;
        else
          update public.skus s
          set
            stock_total = s.stock_total + v_cant_rec,
            costo_unitario = v_item.costo_unitario,
            productor = case
              when coalesce(s.productor, '') = '' then v_orden.proveedor_nombre
              else s.productor
            end,
            ultimo_movimiento = now(),
            en_transito = false
          where s.id = v_sku_id;
        end if;

        update public.items_orden_compra_distribuidor
        set sku_id = v_sku_id
        where id = v_item_id;
      else
        update public.skus s
        set
          stock_total = s.stock_total + v_cant_rec,
          costo_unitario = v_item.costo_unitario,
          ultimo_movimiento = now(),
          en_transito = false
        where s.id = v_sku_id;
      end if;
    end if;
  end loop;

  select bool_and(coalesce(i.cantidad_recibida, 0) >= i.cantidad_ordenada)
  into v_todos_completos
  from public.items_orden_compra_distribuidor i
  where i.orden_id = p_orden_id;

  update public.ordenes_compra_distribuidor
  set
    estado = case
      when v_todos_completos then 'recibida'::public.estado_orden_compra_distribuidor
      when v_alguno_recibido then 'parcial'::public.estado_orden_compra_distribuidor
      else estado
    end,
    fecha_recepcion = coalesce(fecha_recepcion, current_date),
    updated_at = now()
  where id = p_orden_id
  returning * into v_orden;

  if v_alguno_recibido and not exists (
    select 1 from public.cuentas_por_pagar where orden_compra_id = p_orden_id
  ) then
    insert into public.cuentas_por_pagar (
      clerk_id,
      profile_type_v2,
      orden_compra_id,
      proveedor_nombre,
      monto_total
    )
    values (
      v_orden.clerk_id,
      v_orden.profile_type_v2,
      p_orden_id,
      v_orden.proveedor_nombre,
      v_orden.total_acordado
    );
  end if;

  return v_orden;
end;
$$;

-- RLS
alter table public.cuentas_por_pagar enable row level security;
alter table public.pagos_proveedor enable row level security;

drop policy if exists cuentas_por_pagar_select on public.cuentas_por_pagar;
create policy cuentas_por_pagar_select on public.cuentas_por_pagar
  for select using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists cuentas_por_pagar_insert on public.cuentas_por_pagar;
create policy cuentas_por_pagar_insert on public.cuentas_por_pagar
  for insert with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists cuentas_por_pagar_update on public.cuentas_por_pagar;
create policy cuentas_por_pagar_update on public.cuentas_por_pagar
  for update
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists pagos_proveedor_select on public.pagos_proveedor;
create policy pagos_proveedor_select on public.pagos_proveedor
  for select using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists pagos_proveedor_insert on public.pagos_proveedor;
create policy pagos_proveedor_insert on public.pagos_proveedor
  for insert with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

grant select, insert, update on public.cuentas_por_pagar to authenticated, service_role;
grant select, insert on public.pagos_proveedor to authenticated, service_role;
grant usage on type public.estado_cuenta_por_pagar to authenticated, service_role;
grant usage on type public.metodo_pago_proveedor to authenticated, service_role;

notify pgrst, 'reload schema';
