-- =============================================================================
-- PROOF · Distribuidor — órdenes de compra (entrada de producto)
-- Tablas separadas de ordenes_compra (recepciones/foto legacy)
-- Aditivo · idempotente
-- =============================================================================

-- Secuencia OC en proof_sequences
alter table public.proof_sequences
  add column if not exists oc_seq integer not null default 0;

-- Enum estado
do $$ begin
  create type public.estado_orden_compra_distribuidor as enum (
    'pendiente', 'parcial', 'recibida', 'cancelada'
  );
exception when duplicate_object then null;
end $$;

-- Tabla cabecera
create table if not exists public.ordenes_compra_distribuidor (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  numero_orden text not null,
  proveedor_nombre text not null default '',
  estado public.estado_orden_compra_distribuidor not null default 'pendiente',
  fecha_estimada date,
  fecha_recepcion date,
  total_acordado numeric(12, 2) not null default 0 check (total_acordado >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_id, profile_type_v2, numero_orden)
);

create index if not exists ordenes_compra_dist_scope_idx
  on public.ordenes_compra_distribuidor (clerk_id, profile_type_v2);

create index if not exists ordenes_compra_dist_estado_idx
  on public.ordenes_compra_distribuidor (estado);

-- Ítems
create table if not exists public.items_orden_compra_distribuidor (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_compra_distribuidor(id) on delete cascade,
  producto_nombre text not null,
  sku_id uuid references public.skus(id) on delete set null,
  cantidad_ordenada integer not null check (cantidad_ordenada > 0),
  cantidad_recibida integer check (cantidad_recibida is null or cantidad_recibida >= 0),
  costo_unitario numeric(12, 2) not null default 0 check (costo_unitario >= 0),
  subtotal numeric(12, 2) generated always as (
    cantidad_ordenada::numeric * costo_unitario
  ) stored,
  created_at timestamptz not null default now()
);

create index if not exists items_orden_compra_dist_orden_idx
  on public.items_orden_compra_distribuidor (orden_id);

-- next_codigo: kind 'oc' → OC-001
create or replace function proof.next_codigo(
  p_clerk_id text,
  p_profile_type_v2 text,
  p_kind text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_prefix text;
begin
  insert into public.proof_sequences (clerk_id, profile_type_v2)
  values (p_clerk_id, p_profile_type_v2)
  on conflict (clerk_id, profile_type_v2) do nothing;

  if p_kind = 'sku' then
    update public.proof_sequences
    set sku_seq = sku_seq + 1
    where clerk_id = p_clerk_id and profile_type_v2 = p_profile_type_v2
    returning sku_seq into v_next;
    v_prefix := 'SKU';
  elsif p_kind = 'pedido' then
    update public.proof_sequences
    set pedido_seq = pedido_seq + 1
    where clerk_id = p_clerk_id and profile_type_v2 = p_profile_type_v2
    returning pedido_seq into v_next;
    v_prefix := 'PED';
  elsif p_kind = 'recepcion' then
    update public.proof_sequences
    set recepcion_seq = recepcion_seq + 1
    where clerk_id = p_clerk_id and profile_type_v2 = p_profile_type_v2
    returning recepcion_seq into v_next;
    v_prefix := 'REC';
  elsif p_kind = 'oc' then
    update public.proof_sequences
    set oc_seq = oc_seq + 1
    where clerk_id = p_clerk_id and profile_type_v2 = p_profile_type_v2
    returning oc_seq into v_next;
    v_prefix := 'OC';
  else
    raise exception 'kind inválido: %', p_kind;
  end if;

  return v_prefix || '-' || lpad(v_next::text, 3, '0');
end;
$$;

-- Refrescar total_acordado al cambiar ítems
create or replace function proof.trg_oc_dist_refresh_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden_id uuid;
begin
  v_orden_id := coalesce(NEW.orden_id, OLD.orden_id);
  update public.ordenes_compra_distribuidor
  set
    total_acordado = coalesce((
      select sum(i.subtotal)
      from public.items_orden_compra_distribuidor i
      where i.orden_id = v_orden_id
    ), 0),
    updated_at = now()
  where id = v_orden_id;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists items_orden_compra_dist_refresh_total on public.items_orden_compra_distribuidor;
create trigger items_orden_compra_dist_refresh_total
  after insert or update or delete on public.items_orden_compra_distribuidor
  for each row
  execute function proof.trg_oc_dist_refresh_total();

-- Confirmar llegada: actualiza ítems, stock SKUs y estado OC
-- p_lineas: [{ "item_id": "uuid", "cantidad_recibida": n }]
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

  return v_orden;
end;
$$;

create or replace function public.confirmar_llegada_orden_compra_distribuidor(
  p_orden_id uuid,
  p_lineas jsonb
)
returns public.ordenes_compra_distribuidor
language sql
security definer
set search_path = public
as $$
  select * from proof.confirmar_llegada_orden_compra_distribuidor(p_orden_id, p_lineas);
$$;

grant execute on function public.confirmar_llegada_orden_compra_distribuidor(uuid, jsonb)
  to authenticated, service_role;

-- RLS
alter table public.ordenes_compra_distribuidor enable row level security;
alter table public.items_orden_compra_distribuidor enable row level security;

drop policy if exists ordenes_compra_dist_select on public.ordenes_compra_distribuidor;
create policy ordenes_compra_dist_select on public.ordenes_compra_distribuidor
  for select
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists ordenes_compra_dist_insert on public.ordenes_compra_distribuidor;
create policy ordenes_compra_dist_insert on public.ordenes_compra_distribuidor
  for insert
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists ordenes_compra_dist_update on public.ordenes_compra_distribuidor;
create policy ordenes_compra_dist_update on public.ordenes_compra_distribuidor
  for update
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists ordenes_compra_dist_delete on public.ordenes_compra_distribuidor;
create policy ordenes_compra_dist_delete on public.ordenes_compra_distribuidor
  for delete
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists items_orden_compra_dist_select on public.items_orden_compra_distribuidor;
create policy items_orden_compra_dist_select on public.items_orden_compra_distribuidor
  for select
  using (
    exists (
      select 1 from public.ordenes_compra_distribuidor oc
      where oc.id = items_orden_compra_distribuidor.orden_id
        and proof.row_belongs_to_requester(oc.clerk_id, oc.profile_type_v2)
    )
  );

drop policy if exists items_orden_compra_dist_insert on public.items_orden_compra_distribuidor;
create policy items_orden_compra_dist_insert on public.items_orden_compra_distribuidor
  for insert
  with check (
    exists (
      select 1 from public.ordenes_compra_distribuidor oc
      where oc.id = items_orden_compra_distribuidor.orden_id
        and proof.row_belongs_to_requester(oc.clerk_id, oc.profile_type_v2)
    )
  );

drop policy if exists items_orden_compra_dist_update on public.items_orden_compra_distribuidor;
create policy items_orden_compra_dist_update on public.items_orden_compra_distribuidor
  for update
  using (
    exists (
      select 1 from public.ordenes_compra_distribuidor oc
      where oc.id = items_orden_compra_distribuidor.orden_id
        and proof.row_belongs_to_requester(oc.clerk_id, oc.profile_type_v2)
    )
  )
  with check (
    exists (
      select 1 from public.ordenes_compra_distribuidor oc
      where oc.id = items_orden_compra_distribuidor.orden_id
        and proof.row_belongs_to_requester(oc.clerk_id, oc.profile_type_v2)
    )
  );

drop policy if exists items_orden_compra_dist_delete on public.items_orden_compra_distribuidor;
create policy items_orden_compra_dist_delete on public.items_orden_compra_distribuidor
  for delete
  using (
    exists (
      select 1 from public.ordenes_compra_distribuidor oc
      where oc.id = items_orden_compra_distribuidor.orden_id
        and proof.row_belongs_to_requester(oc.clerk_id, oc.profile_type_v2)
    )
  );

-- Data API grants
grant select, insert, update, delete on public.ordenes_compra_distribuidor to authenticated, service_role;
grant select, insert, update, delete on public.items_orden_compra_distribuidor to authenticated, service_role;
grant usage on type public.estado_orden_compra_distribuidor to authenticated, service_role;

notify pgrst, 'reload schema';
