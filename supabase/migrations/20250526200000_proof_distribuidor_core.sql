-- =============================================================================
-- PROOF · Distribuidor — núcleo operacional
-- skus, pedidos, recepciones, crédito
-- Scope: clerk_id + profile_type_v2 = 'distributor'
-- =============================================================================

create schema if not exists proof;

-- -----------------------------------------------------------------------------
-- Extensiones
-- -----------------------------------------------------------------------------
do $ext$
begin
  create extension if not exists pg_cron with schema extensions;
exception
  when others then
    raise notice 'pg_cron no instalado: %', sqlerrm;
end;
$ext$;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.categoria_sku as enum (
    'tequila', 'vino', 'mezcal', 'cerveza', 'destilado', 'gin', 'otro'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estado_sku as enum (
    'sano', 'bajo', 'quiebre', 'muerto', 'en_transito', 'consignacion', 'sobrevendido'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rotacion_30d as enum (
    'muy_alta', 'alta', 'media', 'baja', 'ninguna'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estado_pedido as enum (
    'borrador', 'confirmado', 'preparando', 'en_ruta', 'entregado', 'parcial', 'cancelado'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estado_recepcion as enum (
    'pendiente', 'en_revision', 'confirmada', 'con_discrepancias'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.condicion_item_recepcion as enum ('ok', 'roto', 'incompleto');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tipo_discrepancia as enum (
    'faltante', 'lote_diferente', 'roto', 'sku_incorrecto', 'excedente'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tipo_deuda_productor as enum (
    'credito', 'consignacion', 'acuerdo_verbal'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estado_deuda_productor as enum (
    'al_corriente', 'proximo', 'vencido', 'en_negociacion'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estado_cuenta_cliente as enum (
    'vigente', 'en_riesgo', 'vencido', 'bloqueado', 'incobrable'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Secuencias por distribuidor (códigos legibles)
-- -----------------------------------------------------------------------------
create table if not exists public.proof_sequences (
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  sku_seq integer not null default 0,
  pedido_seq integer not null default 0,
  recepcion_seq integer not null default 0,
  primary key (clerk_id, profile_type_v2)
);

-- -----------------------------------------------------------------------------
-- 1) SKUs
-- -----------------------------------------------------------------------------
create table if not exists public.skus (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  productor text not null default '',
  categoria public.categoria_sku not null default 'otro',
  bodega text not null default 'Principal',
  botellas_por_caja integer not null default 12 check (botellas_por_caja > 0),

  stock_total integer not null default 0 check (stock_total >= 0),
  stock_reservado integer not null default 0 check (stock_reservado >= 0),
  stock_disponible integer generated always as (stock_total - stock_reservado) stored,

  stock_minimo integer not null default 0 check (stock_minimo >= 0),
  costo_unitario numeric(12, 2) not null default 0,
  precio_venta numeric(12, 2) not null default 0,
  margen_porcentaje numeric(6, 2) generated always as (
    case
      when precio_venta > 0 then round(((precio_venta - costo_unitario) / precio_venta * 100)::numeric, 2)
      else 0
    end
  ) stored,

  lote text not null default '',
  dias_sin_movimiento integer not null default 0 check (dias_sin_movimiento >= 0),
  rotacion_30d public.rotacion_30d not null default 'ninguna',
  deuda_asociada numeric(12, 2) not null default 0 check (deuda_asociada >= 0),
  estado public.estado_sku not null default 'sano',
  en_transito boolean not null default false,
  en_consignacion boolean not null default false,
  ultimo_movimiento timestamptz,

  dist_product_id uuid references public.dist_products(id) on delete set null,

  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (clerk_id, profile_type_v2, codigo)
);

create index if not exists skus_scope_idx on public.skus (clerk_id, profile_type_v2);
create index if not exists skus_estado_idx on public.skus (estado);
create index if not exists skus_bodega_idx on public.skus (bodega);
create index if not exists skus_categoria_idx on public.skus (categoria);
create index if not exists skus_stock_disponible_idx on public.skus (stock_disponible);
create index if not exists skus_dist_product_id_idx on public.skus (dist_product_id) where dist_product_id is not null;

-- -----------------------------------------------------------------------------
-- 2) Pedidos + ítems
-- -----------------------------------------------------------------------------
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  cliente_id uuid not null references public.clients(id) on delete restrict,
  fecha_creacion timestamptz not null default now(),
  fecha_entrega date not null,
  condicion_pago text not null default 'contado',
  estado public.estado_pedido not null default 'borrador',
  total numeric(12, 2) not null default 0 check (total >= 0),
  ticket_exportado boolean not null default false,
  notas text,

  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (clerk_id, profile_type_v2, numero)
);

create table if not exists public.items_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  sku_id uuid not null references public.skus(id) on delete restrict,
  nombre text not null,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) not null default 0,
  disponible_al_crear integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pedidos_scope_idx on public.pedidos (clerk_id, profile_type_v2);
create index if not exists pedidos_estado_idx on public.pedidos (estado);
create index if not exists pedidos_fecha_entrega_idx on public.pedidos (fecha_entrega);
create index if not exists pedidos_cliente_id_idx on public.pedidos (cliente_id);
create index if not exists pedidos_fecha_entrega_hoy_idx on public.pedidos (clerk_id, profile_type_v2, fecha_entrega)
  where estado in ('confirmado', 'preparando', 'en_ruta', 'parcial');

create index if not exists items_pedido_pedido_id_idx on public.items_pedido (pedido_id);
create index if not exists items_pedido_sku_id_idx on public.items_pedido (sku_id);

-- -----------------------------------------------------------------------------
-- 3) Recepciones
-- -----------------------------------------------------------------------------
create table if not exists public.recepciones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  productor text not null,
  bodega_destino text not null default 'Principal',
  orden_compra_id text,
  costo_total numeric(12, 2) not null default 0,
  deuda_registrada numeric(12, 2) not null default 0,
  estado public.estado_recepcion not null default 'pendiente',
  fecha_recepcion timestamptz not null default now(),
  foto_urls text[] not null default '{}',

  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (clerk_id, profile_type_v2, codigo)
);

create table if not exists public.items_recepcion (
  id uuid primary key default gen_random_uuid(),
  recepcion_id uuid not null references public.recepciones(id) on delete cascade,
  sku_id uuid references public.skus(id) on delete set null,
  cantidad_esperada integer not null default 0 check (cantidad_esperada >= 0),
  cantidad_recibida integer not null default 0 check (cantidad_recibida >= 0),
  lote text not null default '',
  condicion public.condicion_item_recepcion not null default 'ok',
  created_at timestamptz not null default now()
);

create table if not exists public.discrepancias (
  id uuid primary key default gen_random_uuid(),
  recepcion_id uuid not null references public.recepciones(id) on delete cascade,
  sku_id uuid references public.skus(id) on delete set null,
  tipo public.tipo_discrepancia not null,
  descripcion text not null default '',
  cantidad_afectada integer not null default 0 check (cantidad_afectada >= 0),
  created_at timestamptz not null default now()
);

create index if not exists recepciones_scope_idx on public.recepciones (clerk_id, profile_type_v2);
create index if not exists recepciones_estado_idx on public.recepciones (estado);
create index if not exists items_recepcion_recepcion_id_idx on public.items_recepcion (recepcion_id);
create index if not exists discrepancias_recepcion_id_idx on public.discrepancias (recepcion_id);

-- -----------------------------------------------------------------------------
-- 4) Deudas a productores
-- -----------------------------------------------------------------------------
create table if not exists public.deudas_productores (
  id uuid primary key default gen_random_uuid(),
  productor text not null,
  monto numeric(12, 2) not null check (monto >= 0),
  tipo public.tipo_deuda_productor not null default 'credito',
  fecha_vencimiento date not null,
  estado public.estado_deuda_productor not null default 'al_corriente',
  skus_asociados uuid[] not null default '{}',
  notas text,

  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deudas_productores_scope_idx on public.deudas_productores (clerk_id, profile_type_v2);
create index if not exists deudas_productores_estado_idx on public.deudas_productores (estado);
create index if not exists deudas_productores_fecha_vencimiento_idx on public.deudas_productores (fecha_vencimiento);

-- -----------------------------------------------------------------------------
-- 5) Cuentas de clientes (crédito)
-- -----------------------------------------------------------------------------
create table if not exists public.cuentas_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clients(id) on delete cascade,
  saldo_pendiente numeric(12, 2) not null default 0 check (saldo_pendiente >= 0),
  pedidos_asociados uuid[] not null default '{}',
  fecha_ultima_factura date,
  fecha_vencimiento date,
  -- Mantenido por job diario + triggers (no puede ser GENERATED con current_date)
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
create index if not exists cuentas_clientes_estado_idx on public.cuentas_clientes (estado);
create index if not exists cuentas_clientes_dias_vencido_idx on public.cuentas_clientes (dias_vencido desc);
create index if not exists cuentas_clientes_pedido_activo_hoy_idx on public.cuentas_clientes (pedido_activo_hoy)
  where pedido_activo_hoy = true;

-- -----------------------------------------------------------------------------
-- Helpers · identidad (Clerk JWT → sub + claim profile_type_v2)
-- -----------------------------------------------------------------------------
create or replace function proof.current_clerk_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'sub', ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', ''),
    nullif(current_setting('app.clerk_id', true), '')
  );
$$;

create or replace function proof.current_profile_type_v2()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'profile_type_v2', ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'profile_type_v2', ''),
    nullif(current_setting('app.profile_type_v2', true), ''),
    'distributor'
  );
$$;

create or replace function proof.is_super_user(p_clerk_id text default proof.current_clerk_id())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.clerk_id = p_clerk_id
      and p.is_super_user = true
  );
$$;

create or replace function proof.row_belongs_to_requester(
  p_clerk_id text,
  p_profile_type_v2 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    proof.is_super_user()
    or (
      p_clerk_id = proof.current_clerk_id()
      and p_profile_type_v2 = proof.current_profile_type_v2()
      and p_profile_type_v2 = 'distributor'
    );
$$;

-- -----------------------------------------------------------------------------
-- Estado SKU (prioridad spec)
-- -----------------------------------------------------------------------------
create or replace function proof.calcular_estado_sku(
  p_stock_total integer,
  p_stock_reservado integer,
  p_stock_minimo integer,
  p_dias_sin_movimiento integer,
  p_en_transito boolean,
  p_en_consignacion boolean,
  p_botellas_por_caja integer default 12
)
returns public.estado_sku
language plpgsql
immutable
as $$
declare
  v_disponible integer;
  v_quiebre_umbral integer;
  v_estado public.estado_sku;
begin
  v_disponible := p_stock_total - p_stock_reservado;
  v_quiebre_umbral := greatest(3 * coalesce(nullif(p_botellas_por_caja, 0), 12), 1);

  if p_stock_reservado > p_stock_total then
    return 'sobrevendido';
  end if;
  if v_disponible <= 0 or v_disponible <= v_quiebre_umbral then
    return 'quiebre';
  end if;
  if p_dias_sin_movimiento > 60 then
    return 'muerto';
  end if;
  if p_stock_minimo > 0 and v_disponible < p_stock_minimo then
    return 'bajo';
  end if;
  if p_en_transito then
    return 'en_transito';
  end if;
  if p_en_consignacion then
    return 'consignacion';
  end if;
  return 'sano';
end;
$$;

create or replace function proof.refresh_sku_estado(p_sku_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.skus%rowtype;
begin
  select * into r from public.skus where id = p_sku_id;
  if not found then
    return;
  end if;

  update public.skus
  set
    estado = proof.calcular_estado_sku(
      r.stock_total,
      r.stock_reservado,
      r.stock_minimo,
      r.dias_sin_movimiento,
      r.en_transito,
      r.en_consignacion,
      r.botellas_por_caja
    ),
    updated_at = now()
  where id = p_sku_id;
end;
$$;

create or replace function proof.trg_skus_refresh_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.estado := proof.calcular_estado_sku(
    new.stock_total,
    new.stock_reservado,
    new.stock_minimo,
    new.dias_sin_movimiento,
    new.en_transito,
    new.en_consignacion,
    new.botellas_por_caja
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists skus_refresh_estado on public.skus;
create trigger skus_refresh_estado
  before insert or update of
    stock_total, stock_reservado, stock_minimo, dias_sin_movimiento,
    en_transito, en_consignacion, botellas_por_caja
  on public.skus
  for each row
  execute function proof.trg_skus_refresh_estado();

-- Realtime: notificar cambio de stock disponible
create or replace function proof.trg_skus_notify_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (
    old.stock_total is distinct from new.stock_total
    or old.stock_reservado is distinct from new.stock_reservado
  ) then
    perform pg_notify(
      'proof_sku_stock',
      json_build_object(
        'id', new.id,
        'clerk_id', new.clerk_id,
        'stock_total', new.stock_total,
        'stock_reservado', new.stock_reservado,
        'stock_disponible', new.stock_disponible,
        'estado', new.estado
      )::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists skus_notify_stock on public.skus;
create trigger skus_notify_stock
  after update of stock_total, stock_reservado on public.skus
  for each row
  execute function proof.trg_skus_notify_stock();

-- -----------------------------------------------------------------------------
-- Secuencias · códigos SKU / pedido / recepción
-- -----------------------------------------------------------------------------
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
    v_prefix := '';
  elsif p_kind = 'recepcion' then
    update public.proof_sequences
    set recepcion_seq = recepcion_seq + 1
    where clerk_id = p_clerk_id and profile_type_v2 = p_profile_type_v2
    returning recepcion_seq into v_next;
    v_prefix := 'REC';
  else
    raise exception 'unknown sequence kind: %', p_kind;
  end if;

  if p_kind = 'pedido' then
    return '#' || lpad(v_next::text, 4, '0');
  end if;
  return v_prefix || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- -----------------------------------------------------------------------------
-- Pedidos · transiciones ACID
-- -----------------------------------------------------------------------------
create or replace function proof.recalc_pedido_total(p_pedido_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.pedidos p
  set
    total = coalesce((
      select sum(ip.subtotal)
      from public.items_pedido ip
      where ip.pedido_id = p_pedido_id
    ), 0),
    updated_at = now()
  where p.id = p_pedido_id;
$$;

create or replace function proof.confirmar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_item record;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado para confirmar este pedido';
  end if;

  if v_pedido.estado <> 'borrador' then
    raise exception 'Solo pedidos en borrador pueden confirmarse (actual: %)', v_pedido.estado;
  end if;

  perform set_config('proof.allow_stock_reservado_mutation', '1', true);

  for v_item in
    select ip.sku_id, ip.cantidad, ip.id as item_id
    from public.items_pedido ip
    where ip.pedido_id = p_pedido_id
    for update
  loop
    update public.skus s
    set stock_reservado = s.stock_reservado + v_item.cantidad
    where s.id = v_item.sku_id;
    if not found then
      raise exception 'SKU no encontrado para ítem %', v_item.item_id;
    end if;
  end loop;

  update public.pedidos
  set estado = 'confirmado', updated_at = now()
  where id = p_pedido_id
  returning * into v_pedido;

  perform proof.recalc_pedido_total(p_pedido_id);
  return v_pedido;
end;
$$;

create or replace function proof.cancelar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_item record;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_pedido.estado = 'cancelado' then
    return v_pedido;
  end if;

  if v_pedido.estado in ('confirmado', 'preparando', 'en_ruta', 'parcial') then
    perform set_config('proof.allow_stock_reservado_mutation', '1', true);
    for v_item in
      select ip.sku_id, ip.cantidad
      from public.items_pedido ip
      where ip.pedido_id = p_pedido_id
    loop
      update public.skus s
      set stock_reservado = greatest(0, s.stock_reservado - v_item.cantidad)
      where s.id = v_item.sku_id;
    end loop;
  end if;

  update public.pedidos
  set estado = 'cancelado', updated_at = now()
  where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

create or replace function proof.entregar_pedido(
  p_pedido_id uuid,
  p_parcial boolean default false
)
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
  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_pedido.estado not in ('confirmado', 'preparando', 'en_ruta', 'parcial') then
    raise exception 'Estado inválido para entrega: %', v_pedido.estado;
  end if;

  v_nuevo_estado := case when p_parcial then 'parcial'::public.estado_pedido else 'entregado'::public.estado_pedido end;

  perform set_config('proof.allow_stock_reservado_mutation', '1', true);

  for v_item in
    select ip.sku_id, ip.cantidad
    from public.items_pedido ip
    where ip.pedido_id = p_pedido_id
  loop
    update public.skus s
    set
      stock_reservado = greatest(0, s.stock_reservado - v_item.cantidad),
      stock_total = greatest(0, s.stock_total - v_item.cantidad),
      ultimo_movimiento = now()
    where s.id = v_item.sku_id;
  end loop;

  update public.pedidos
  set estado = v_nuevo_estado, updated_at = now()
  where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

-- -----------------------------------------------------------------------------
-- Recepción · confirmar incrementa stock
-- -----------------------------------------------------------------------------
create or replace function proof.confirmar_recepcion(
  p_recepcion_id uuid,
  p_registrar_deuda boolean default true
)
returns public.recepciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.recepciones%rowtype;
  v_item record;
  v_deuda_id uuid;
begin
  select * into v_rec from public.recepciones where id = p_recepcion_id for update;
  if not found then
    raise exception 'Recepción no encontrada: %', p_recepcion_id;
  end if;

  if not proof.row_belongs_to_requester(v_rec.clerk_id, v_rec.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_rec.estado = 'confirmada' then
    return v_rec;
  end if;

  for v_item in
    select ir.sku_id, ir.cantidad_recibida, ir.lote, ir.condicion
    from public.items_recepcion ir
    where ir.recepcion_id = p_recepcion_id
      and ir.sku_id is not null
      and ir.cantidad_recibida > 0
  loop
    update public.skus s
    set
      stock_total = s.stock_total + v_item.cantidad_recibida,
      lote = case when v_item.lote <> '' then v_item.lote else s.lote end,
      ultimo_movimiento = now(),
      en_transito = false
    where s.id = v_item.sku_id;
  end loop;

  if p_registrar_deuda and v_rec.deuda_registrada > 0 then
    insert into public.deudas_productores (
      productor, monto, tipo, fecha_vencimiento, estado,
      skus_asociados, clerk_id, profile_type_v2
    )
    values (
      v_rec.productor,
      v_rec.deuda_registrada,
      'credito',
      current_date + 30,
      'al_corriente',
      coalesce((
        select array_agg(distinct ir.sku_id) filter (where ir.sku_id is not null)
        from public.items_recepcion ir
        where ir.recepcion_id = p_recepcion_id
      ), '{}'),
      v_rec.clerk_id,
      v_rec.profile_type_v2
    )
    returning id into v_deuda_id;
  end if;

  update public.recepciones
  set
    estado = case
      when exists (
        select 1 from public.discrepancias d where d.recepcion_id = p_recepcion_id
      ) then 'con_discrepancias'::public.estado_recepcion
      else 'confirmada'::public.estado_recepcion
    end,
    updated_at = now()
  where id = p_recepcion_id
  returning * into v_rec;

  return v_rec;
end;
$$;

-- -----------------------------------------------------------------------------
-- Crédito · mantenimiento de cuentas
-- -----------------------------------------------------------------------------
create or replace function proof.refresh_cuenta_cliente(p_cuenta_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.cuentas_clientes%rowtype;
  v_dias integer;
  v_pedido_hoy boolean;
begin
  select * into r from public.cuentas_clientes where id = p_cuenta_id;
  if not found then return; end if;

  v_dias := case
    when r.saldo_pendiente > 0 and r.fecha_vencimiento is not null
      then greatest(0, (current_date - r.fecha_vencimiento))
    else 0
  end;

  select exists (
    select 1
    from public.pedidos p
    where p.cliente_id = r.cliente_id
      and p.clerk_id = r.clerk_id
      and p.profile_type_v2 = r.profile_type_v2
      and p.fecha_entrega = current_date
      and p.estado in ('confirmado', 'preparando', 'en_ruta', 'parcial')
  ) into v_pedido_hoy;

  update public.cuentas_clientes
  set
    dias_vencido = v_dias,
    pedido_activo_hoy = v_pedido_hoy,
    estado = case
      when r.saldo_pendiente <= 0 then 'vigente'::public.estado_cuenta_cliente
      when v_dias = 0 then 'vigente'::public.estado_cuenta_cliente
      when v_dias between 1 and 7 then 'en_riesgo'::public.estado_cuenta_cliente
      when v_dias > 30 then 'incobrable'::public.estado_cuenta_cliente
      when v_dias > 0 then 'vencido'::public.estado_cuenta_cliente
      else r.estado
    end,
    updated_at = now()
  where id = p_cuenta_id;
end;
$$;

create or replace function proof.trg_pedidos_refresh_cuentas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform proof.refresh_cuenta_cliente(cc.id)
  from public.cuentas_clientes cc
  where cc.cliente_id = coalesce(new.cliente_id, old.cliente_id)
    and cc.clerk_id = coalesce(new.clerk_id, old.clerk_id)
    and cc.profile_type_v2 = coalesce(new.profile_type_v2, old.profile_type_v2);
  return coalesce(new, old);
end;
$$;

drop trigger if exists pedidos_refresh_cuentas on public.pedidos;
create trigger pedidos_refresh_cuentas
  after insert or update of estado, fecha_entrega, cliente_id or delete
  on public.pedidos
  for each row
  execute function proof.trg_pedidos_refresh_cuentas();

-- -----------------------------------------------------------------------------
-- Job diario · dias_sin_movimiento, rotación, dias_vencido, pedido_activo_hoy
-- -----------------------------------------------------------------------------
create or replace function proof.run_daily_maintenance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SKUs: días sin movimiento
  update public.skus s
  set
    dias_sin_movimiento = case
      when s.ultimo_movimiento is null then 999
      else greatest(0, (current_date - (s.ultimo_movimiento at time zone 'UTC')::date))
    end,
    updated_at = now();

  -- SKUs: rotación 30d heurística (ventas en movimientos dist o pedidos entregados)
  update public.skus s
  set rotacion_30d = sub.rotacion
  from (
    select
      sk.id,
      case
        when coalesce(m.out_30d, 0) = 0 then 'ninguna'::public.rotacion_30d
        when m.out_30d >= sk.stock_total * 2 then 'muy_alta'::public.rotacion_30d
        when m.out_30d >= sk.stock_total then 'alta'::public.rotacion_30d
        when m.out_30d >= sk.stock_total * 0.3 then 'media'::public.rotacion_30d
        when m.out_30d >= sk.stock_total * 0.1 then 'baja'::public.rotacion_30d
        else 'ninguna'::public.rotacion_30d
      end as rotacion
    from public.skus sk
    left join lateral (
      select sum(
        dm.cases * coalesce(dp.bottles_per_case, sk.botellas_por_caja) + dm.loose_units
      )::integer as out_30d
      from public.dist_movements dm
      left join public.dist_products dp on dp.id = dm.product_id
      where dm.product_id = sk.dist_product_id
        and dm.clerk_id = sk.clerk_id
        and dm.profile_type_v2 = sk.profile_type_v2
        and dm.movement_type in ('venta', 'merma', 'donacion')
        and dm.created_at >= (current_timestamp - interval '30 days')
    ) m on true
  ) sub
  where s.id = sub.id;

  -- SKUs: recalcular estado tras días/rotación
  perform proof.refresh_sku_estado(s.id) from public.skus s;

  -- Deudas productores: estados por vencimiento
  update public.deudas_productores d
  set
    estado = case
      when d.fecha_vencimiento < current_date then 'vencido'::public.estado_deuda_productor
      when d.fecha_vencimiento <= current_date + 7 then 'proximo'::public.estado_deuda_productor
      else 'al_corriente'::public.estado_deuda_productor
    end,
    updated_at = now();

  -- Cuentas clientes
  perform proof.refresh_cuenta_cliente(c.id) from public.cuentas_clientes c;
end;
$$;

-- pg_cron: 06:00 UTC diario (ajustar TZ en dashboard Supabase si aplica)
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('proof_daily_maintenance');
    perform cron.schedule(
      'proof_daily_maintenance',
      '0 6 * * *',
      $$select proof.run_daily_maintenance();$$
    );
  end if;
exception
  when others then
    raise notice 'pg_cron schedule omitido: %', sqlerrm;
end;
$cron$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.skus enable row level security;
alter table public.pedidos enable row level security;
alter table public.items_pedido enable row level security;
alter table public.recepciones enable row level security;
alter table public.items_recepcion enable row level security;
alter table public.discrepancias enable row level security;
alter table public.deudas_productores enable row level security;
alter table public.cuentas_clientes enable row level security;
alter table public.proof_sequences enable row level security;

-- SKUs
drop policy if exists skus_select on public.skus;
create policy skus_select on public.skus for select
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists skus_insert on public.skus;
create policy skus_insert on public.skus for insert
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists skus_update on public.skus;
create policy skus_update on public.skus for update
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists skus_delete on public.skus;
create policy skus_delete on public.skus for delete
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

-- Pedidos
drop policy if exists pedidos_select on public.pedidos;
create policy pedidos_select on public.pedidos for select
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists pedidos_insert on public.pedidos;
create policy pedidos_insert on public.pedidos for insert
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists pedidos_update on public.pedidos;
create policy pedidos_update on public.pedidos for update
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists pedidos_delete on public.pedidos;
create policy pedidos_delete on public.pedidos for delete
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

-- Items pedido (vía pedido padre)
drop policy if exists items_pedido_select on public.items_pedido;
create policy items_pedido_select on public.items_pedido for select
  using (exists (
    select 1 from public.pedidos p
    where p.id = pedido_id
      and proof.row_belongs_to_requester(p.clerk_id, p.profile_type_v2)
  ));

drop policy if exists items_pedido_insert on public.items_pedido;
create policy items_pedido_insert on public.items_pedido for insert
  with check (exists (
    select 1 from public.pedidos p
    where p.id = pedido_id
      and proof.row_belongs_to_requester(p.clerk_id, p.profile_type_v2)
  ));

drop policy if exists items_pedido_update on public.items_pedido;
create policy items_pedido_update on public.items_pedido for update
  using (exists (
    select 1 from public.pedidos p
    where p.id = pedido_id
      and proof.row_belongs_to_requester(p.clerk_id, p.profile_type_v2)
  ));

drop policy if exists items_pedido_delete on public.items_pedido;
create policy items_pedido_delete on public.items_pedido for delete
  using (exists (
    select 1 from public.pedidos p
    where p.id = pedido_id
      and proof.row_belongs_to_requester(p.clerk_id, p.profile_type_v2)
  ));

-- Recepciones
drop policy if exists recepciones_all on public.recepciones;
create policy recepciones_all on public.recepciones for all
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists items_recepcion_all on public.items_recepcion;
create policy items_recepcion_all on public.items_recepcion for all
  using (exists (
    select 1 from public.recepciones r
    where r.id = recepcion_id
      and proof.row_belongs_to_requester(r.clerk_id, r.profile_type_v2)
  ))
  with check (exists (
    select 1 from public.recepciones r
    where r.id = recepcion_id
      and proof.row_belongs_to_requester(r.clerk_id, r.profile_type_v2)
  ));

drop policy if exists discrepancias_all on public.discrepancias;
create policy discrepancias_all on public.discrepancias for all
  using (exists (
    select 1 from public.recepciones r
    where r.id = recepcion_id
      and proof.row_belongs_to_requester(r.clerk_id, r.profile_type_v2)
  ))
  with check (exists (
    select 1 from public.recepciones r
    where r.id = recepcion_id
      and proof.row_belongs_to_requester(r.clerk_id, r.profile_type_v2)
  ));

-- Deudas / cuentas
drop policy if exists deudas_productores_all on public.deudas_productores;
create policy deudas_productores_all on public.deudas_productores for all
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists cuentas_clientes_all on public.cuentas_clientes;
create policy cuentas_clientes_all on public.cuentas_clientes for all
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists proof_sequences_all on public.proof_sequences;
create policy proof_sequences_all on public.proof_sequences for all
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

-- -----------------------------------------------------------------------------
-- Grants (Data API)
-- -----------------------------------------------------------------------------
grant usage on schema proof to authenticated, anon, service_role;
grant execute on all functions in schema proof to authenticated, service_role;

grant select, insert, update, delete on public.skus to authenticated, service_role;
grant select, insert, update, delete on public.pedidos to authenticated, service_role;
grant select, insert, update, delete on public.items_pedido to authenticated, service_role;
grant select, insert, update, delete on public.recepciones to authenticated, service_role;
grant select, insert, update, delete on public.items_recepcion to authenticated, service_role;
grant select, insert, update, delete on public.discrepancias to authenticated, service_role;
grant select, insert, update, delete on public.deudas_productores to authenticated, service_role;
grant select, insert, update, delete on public.cuentas_clientes to authenticated, service_role;
grant select, insert, update, delete on public.proof_sequences to authenticated, service_role;

grant usage on type public.categoria_sku to authenticated, service_role;
grant usage on type public.estado_sku to authenticated, service_role;
grant usage on type public.rotacion_30d to authenticated, service_role;
grant usage on type public.estado_pedido to authenticated, service_role;
grant usage on type public.estado_recepcion to authenticated, service_role;
grant usage on type public.condicion_item_recepcion to authenticated, service_role;
grant usage on type public.tipo_discrepancia to authenticated, service_role;
grant usage on type public.tipo_deuda_productor to authenticated, service_role;
grant usage on type public.estado_deuda_productor to authenticated, service_role;
grant usage on type public.estado_cuenta_cliente to authenticated, service_role;

-- Realtime · stock vivo
do $realtime$
begin
  alter publication supabase_realtime add table public.skus;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'publicación supabase_realtime no disponible en este entorno';
end;
$realtime$;

-- Evita reservas manuales fuera de proof.confirmar_pedido / entregar / cancelar
create or replace function proof.trg_skus_guard_stock_reservado()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
    and old.stock_reservado is distinct from new.stock_reservado
    and coalesce(current_setting('proof.allow_stock_reservado_mutation', true), '') <> '1'
  then
    raise exception
      'stock_reservado solo se modifica vía proof.confirmar_pedido, proof.cancelar_pedido o proof.entregar_pedido';
  end if;
  return new;
end;
$$;

drop trigger if exists skus_guard_stock_reservado on public.skus;
create trigger skus_guard_stock_reservado
  before update of stock_reservado on public.skus
  for each row
  execute function proof.trg_skus_guard_stock_reservado();
