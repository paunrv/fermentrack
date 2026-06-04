-- =============================================================================
-- PROOF · Destilador — APLICAR TODO (SQL Editor Supabase)
-- Orden: (1) core (2) confirmar_llegada (3) cerrar_corrida (4) smoke
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 1/4 · 20250602000000_destilador_mezcal_core.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- PROOF · Destilador (Mezcal) — núcleo de datos
-- Tablas independientes del distribuidor. RLS por clerk_id (JWT sub).
-- Aplicar solo tras revisión (producción directa).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bootstrap schema proof (si el proyecto aún no tiene distribuidor core)
-- -----------------------------------------------------------------------------
create schema if not exists proof;

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

grant usage on schema proof to authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- Helpers RLS (no exige profile_type_v2 = distributor)
-- -----------------------------------------------------------------------------
create or replace function proof.destilador_row_owned(p_clerk_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select proof.is_super_user()
    or p_clerk_id = proof.current_clerk_id();
$$;

-- -----------------------------------------------------------------------------
-- Secuencias legibles por destilador
-- -----------------------------------------------------------------------------
create table if not exists public.destilador_sequences (
  clerk_id text primary key,
  lote_seq integer not null default 0,
  pedido_seq integer not null default 0,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.dest_bodega_tipo as enum ('principal', 'secundaria');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_viaje_estado as enum (
    'en_negociacion', 'confirmado', 'en_transito', 'recibido'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_lote_estado as enum (
    'en_bodega_crudo', 'en_produccion', 'terminado', 'vendido_parcial'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_formato_botella as enum ('750ml', '500ml', '200ml');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_corrida_modo as enum ('equipo', 'manual');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_corrida_estado as enum ('activa', 'completada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_etiqueta_tipo as enum ('frontal', 'contraetiqueta', 'collarin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_caja_estado as enum ('en_bodega', 'en_pedido', 'entregada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_botella_estado as enum ('en_caja', 'vendida');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_movimiento_tipo as enum (
    'entrada', 'salida', 'traslado', 'auditoria'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_movimiento_metodo as enum (
    'manual', 'escaneo_camara', 'pistola_bluetooth'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_cliente_tipo as enum (
    'restaurante', 'tienda', 'directo', 'granel'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_condicion_pago as enum ('contado', '30_dias', '60_dias');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_pedido_estado as enum (
    'cotizacion', 'confirmado', 'entregado', 'cobrado', 'cancelado'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_item_tipo as enum ('botella', 'granel');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dest_membresia as enum ('basico', 'profesional', 'premium');
exception when duplicate_object then null;
end $$;

-- Membresía en perfil (feature gating UI)
alter table public.profiles
  add column if not exists destilador_membresia public.dest_membresia;

-- -----------------------------------------------------------------------------
-- 01 bodegas
-- -----------------------------------------------------------------------------
create table if not exists public.bodegas (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  nombre text not null,
  ciudad text not null default '',
  tipo public.dest_bodega_tipo not null default 'principal',
  es_embotellado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bodegas_one_embotellado_per_clerk
  on public.bodegas (clerk_id)
  where es_embotellado = true;

create index if not exists bodegas_clerk_idx on public.bodegas (clerk_id);

-- -----------------------------------------------------------------------------
-- 02 viajes
-- -----------------------------------------------------------------------------
create table if not exists public.viajes (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  fecha date not null default current_date,
  region text not null default '',
  comunidad text not null default '',
  palenquero_nombre text not null default '',
  palenquero_contacto text not null default '',
  costo_flete numeric(14, 2) not null default 0 check (costo_flete >= 0),
  estado public.dest_viaje_estado not null default 'en_negociacion',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viajes_clerk_estado_idx on public.viajes (clerk_id, estado);

-- -----------------------------------------------------------------------------
-- 03 productos_viaje
-- -----------------------------------------------------------------------------
create table if not exists public.productos_viaje (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  viaje_id uuid not null references public.viajes (id) on delete cascade,
  tipo_agave text not null,
  litros_acordados numeric(12, 1) not null check (litros_acordados > 0),
  precio_por_litro numeric(14, 2) not null check (precio_por_litro >= 0),
  anticipo_pagado numeric(14, 2) not null default 0 check (anticipo_pagado >= 0),
  total_acordado numeric(14, 2) generated always as (
    round(litros_acordados * precio_por_litro, 2)
  ) stored,
  saldo_pendiente numeric(14, 2) generated always as (
    greatest(round(litros_acordados * precio_por_litro, 2) - anticipo_pagado, 0)
  ) stored,
  litros_salida numeric(12, 1),
  litros_recibidos numeric(12, 1),
  merma_litros numeric(12, 1) generated always as (
    case
      when litros_salida is not null and litros_recibidos is not null
        then litros_salida - litros_recibidos
      else null
    end
  ) stored,
  flete_proporcional numeric(14, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists productos_viaje_viaje_idx on public.productos_viaje (viaje_id);

-- -----------------------------------------------------------------------------
-- 04 lotes
-- -----------------------------------------------------------------------------
create table if not exists public.lotes (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  numero_lote text not null,
  viaje_id uuid not null references public.viajes (id) on delete restrict,
  producto_viaje_id uuid not null references public.productos_viaje (id) on delete restrict,
  tipo_agave text not null,
  maestro text not null default '',
  comunidad text not null default '',
  fecha_recepcion date not null default current_date,
  abv numeric(5, 2) check (abv is null or (abv > 0 and abv <= 100)),
  litros_recibidos numeric(12, 1) not null check (litros_recibidos > 0),
  litros_disponibles_granel numeric(12, 1) not null check (litros_disponibles_granel >= 0),
  estado public.dest_lote_estado not null default 'en_bodega_crudo',
  bodega_id uuid not null references public.bodegas (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_id, numero_lote)
);

create index if not exists lotes_clerk_estado_idx on public.lotes (clerk_id, estado);
create index if not exists lotes_bodega_idx on public.lotes (bodega_id);

-- -----------------------------------------------------------------------------
-- 05 corridas_embotellado
-- -----------------------------------------------------------------------------
create or replace function public.dest_formato_litros(p_formato public.dest_formato_botella)
returns numeric
language sql
immutable
as $$
  select case p_formato
    when '750ml' then 0.75
    when '500ml' then 0.5
    when '200ml' then 0.2
  end;
$$;

create table if not exists public.corridas_embotellado (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  lote_id uuid not null references public.lotes (id) on delete restrict,
  bodega_id uuid not null references public.bodegas (id) on delete restrict,
  formato_botella public.dest_formato_botella not null,
  litros_asignados numeric(12, 1) not null check (litros_asignados > 0),
  modo public.dest_corrida_modo not null,
  costo_corrida numeric(14, 2),
  personas integer,
  horas_estimadas numeric(8, 2),
  horas_reales numeric(8, 2),
  tarifa_hora numeric(14, 2),
  botellas_producidas integer not null default 0 check (botellas_producidas >= 0),
  botellas_defectuosas integer not null default 0 check (botellas_defectuosas >= 0),
  litros_usados numeric(12, 3) generated always as (
    botellas_producidas * public.dest_formato_litros(formato_botella)
  ) stored,
  merma_litros numeric(12, 3) generated always as (
    litros_asignados - (botellas_producidas * public.dest_formato_litros(formato_botella))
  ) stored,
  merma_porcentaje numeric(8, 2) generated always as (
    case
      when litros_asignados > 0 then round(
        100.0 * (
          litros_asignados
          - (botellas_producidas * public.dest_formato_litros(formato_botella))
        ) / litros_asignados,
        2
      )
      else 0
    end
  ) stored,
  costo_real_por_botella numeric(14, 4),
  foto_lote_url text,
  cajas_contadas_vision integer,
  cajas_confirmadas integer,
  estado public.dest_corrida_estado not null default 'activa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists corridas_clerk_estado_idx
  on public.corridas_embotellado (clerk_id, estado);
create index if not exists corridas_lote_idx on public.corridas_embotellado (lote_id);

-- -----------------------------------------------------------------------------
-- 06 stock_botellas_vacias
-- -----------------------------------------------------------------------------
create table if not exists public.stock_botellas_vacias (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  formato public.dest_formato_botella not null,
  cantidad_disponible integer not null default 0 check (cantidad_disponible >= 0),
  costo_unitario numeric(14, 2) not null default 0 check (costo_unitario >= 0),
  bodega_id uuid not null references public.bodegas (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_id, bodega_id, formato)
);

-- -----------------------------------------------------------------------------
-- 07 expresiones_producto
-- -----------------------------------------------------------------------------
create table if not exists public.expresiones_producto (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  nombre text not null,
  etiqueta_frontal_id uuid,
  contraetiqueta_id uuid,
  collarin_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_id, nombre)
);

-- -----------------------------------------------------------------------------
-- 08 stock_etiquetas
-- -----------------------------------------------------------------------------
create table if not exists public.stock_etiquetas (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  nombre text not null,
  tipo public.dest_etiqueta_tipo not null,
  cantidad_disponible integer not null default 0 check (cantidad_disponible >= 0),
  costo_unitario numeric(14, 2) not null default 0 check (costo_unitario >= 0),
  bodega_id uuid not null references public.bodegas (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_etiquetas_clerk_bodega_idx
  on public.stock_etiquetas (clerk_id, bodega_id);

-- FKs expresiones → stock_etiquetas (después de crear stock_etiquetas)
alter table public.expresiones_producto
  drop constraint if exists expresiones_etiqueta_frontal_fk;
alter table public.expresiones_producto
  add constraint expresiones_etiqueta_frontal_fk
  foreign key (etiqueta_frontal_id) references public.stock_etiquetas (id) on delete set null;

alter table public.expresiones_producto
  drop constraint if exists expresiones_contraetiqueta_fk;
alter table public.expresiones_producto
  add constraint expresiones_contraetiqueta_fk
  foreign key (contraetiqueta_id) references public.stock_etiquetas (id) on delete set null;

alter table public.expresiones_producto
  drop constraint if exists expresiones_collarin_fk;
alter table public.expresiones_producto
  add constraint expresiones_collarin_fk
  foreign key (collarin_id) references public.stock_etiquetas (id) on delete set null;

-- -----------------------------------------------------------------------------
-- 09 cajas
-- -----------------------------------------------------------------------------
create table if not exists public.cajas (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  codigo_qr text not null,
  lote_id uuid not null references public.lotes (id) on delete restrict,
  corrida_id uuid not null references public.corridas_embotellado (id) on delete restrict,
  formato_botella public.dest_formato_botella not null,
  cantidad_botellas integer not null default 12 check (cantidad_botellas > 0),
  bodega_id uuid not null references public.bodegas (id) on delete restrict,
  estado public.dest_caja_estado not null default 'en_bodega',
  timestamp_entrada timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (codigo_qr)
);

create index if not exists cajas_clerk_bodega_estado_idx
  on public.cajas (clerk_id, bodega_id, estado);

-- -----------------------------------------------------------------------------
-- 10 botellas (Premium)
-- -----------------------------------------------------------------------------
create table if not exists public.botellas (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  codigo_qr text not null unique,
  caja_id uuid not null references public.cajas (id) on delete cascade,
  lote_id uuid not null references public.lotes (id) on delete restrict,
  estado public.dest_botella_estado not null default 'en_caja',
  created_at timestamptz not null default now()
);

create index if not exists botellas_caja_idx on public.botellas (caja_id);

-- -----------------------------------------------------------------------------
-- 11 movimientos_inventario (inmutable)
-- -----------------------------------------------------------------------------
create table if not exists public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  tipo public.dest_movimiento_tipo not null,
  caja_id uuid references public.cajas (id) on delete restrict,
  botella_id uuid references public.botellas (id) on delete restrict,
  bodega_origen_id uuid references public.bodegas (id) on delete restrict,
  bodega_destino_id uuid references public.bodegas (id) on delete restrict,
  pedido_id uuid,
  tiene_pedido boolean not null default false,
  metodo public.dest_movimiento_metodo not null default 'manual',
  timestamp timestamptz not null default now(),
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists movimientos_inventario_clerk_ts_idx
  on public.movimientos_inventario (clerk_id, timestamp desc);

-- -----------------------------------------------------------------------------
-- 12 pedidos_destilador
-- -----------------------------------------------------------------------------
create table if not exists public.pedidos_destilador (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  numero_pedido text not null,
  cliente_nombre text not null,
  cliente_tipo public.dest_cliente_tipo not null default 'directo',
  fecha_pedido date not null default current_date,
  fecha_entrega date,
  condicion_pago public.dest_condicion_pago not null default 'contado',
  fecha_vencimiento date,
  total_acordado numeric(14, 2) not null default 0 check (total_acordado >= 0),
  anticipo numeric(14, 2) not null default 0 check (anticipo >= 0),
  saldo_pendiente numeric(14, 2) generated always as (
    greatest(total_acordado - anticipo, 0)
  ) stored,
  estado public.dest_pedido_estado not null default 'cotizacion',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_id, numero_pedido)
);

create index if not exists pedidos_destilador_clerk_estado_idx
  on public.pedidos_destilador (clerk_id, estado);

alter table public.movimientos_inventario
  drop constraint if exists movimientos_pedido_dest_fk;
alter table public.movimientos_inventario
  add constraint movimientos_pedido_dest_fk
  foreign key (pedido_id) references public.pedidos_destilador (id) on delete restrict;

-- -----------------------------------------------------------------------------
-- 13 items_pedido_destilador
-- -----------------------------------------------------------------------------
create table if not exists public.items_pedido_destilador (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  pedido_id uuid not null references public.pedidos_destilador (id) on delete cascade,
  lote_id uuid not null references public.lotes (id) on delete restrict,
  tipo public.dest_item_tipo not null,
  formato public.dest_formato_botella,
  cantidad numeric(12, 2) not null check (cantidad > 0),
  precio_unitario numeric(14, 2) not null check (precio_unitario >= 0),
  subtotal numeric(14, 2) generated always as (round(cantidad * precio_unitario, 2)) stored,
  created_at timestamptz not null default now(),
  check (
    (tipo = 'botella' and formato is not null)
    or (tipo = 'granel' and formato is null)
  )
);

create index if not exists items_pedido_dest_pedido_idx
  on public.items_pedido_destilador (pedido_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.destilador_sequences enable row level security;
alter table public.bodegas enable row level security;
alter table public.viajes enable row level security;
alter table public.productos_viaje enable row level security;
alter table public.lotes enable row level security;
alter table public.corridas_embotellado enable row level security;
alter table public.stock_botellas_vacias enable row level security;
alter table public.expresiones_producto enable row level security;
alter table public.stock_etiquetas enable row level security;
alter table public.cajas enable row level security;
alter table public.botellas enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.pedidos_destilador enable row level security;
alter table public.items_pedido_destilador enable row level security;

-- Políticas genéricas por tabla con clerk_id
do $pol$
declare
  t text;
  tables text[] := array[
    'destilador_sequences',
    'bodegas',
    'viajes',
    'productos_viaje',
    'lotes',
    'corridas_embotellado',
    'stock_botellas_vacias',
    'expresiones_producto',
    'stock_etiquetas',
    'cajas',
    'botellas',
    'pedidos_destilador',
    'items_pedido_destilador'
  ];
begin
  foreach t in array tables loop
    execute format(
      'drop policy if exists %I_select on public.%I',
      t, t
    );
    execute format(
      'create policy %I_select on public.%I for select using (proof.destilador_row_owned(clerk_id))',
      t, t
    );
    execute format(
      'drop policy if exists %I_insert on public.%I',
      t, t
    );
    execute format(
      'create policy %I_insert on public.%I for insert with check (proof.destilador_row_owned(clerk_id))',
      t, t
    );
    execute format(
      'drop policy if exists %I_update on public.%I',
      t, t
    );
    execute format(
      'create policy %I_update on public.%I for update using (proof.destilador_row_owned(clerk_id)) with check (proof.destilador_row_owned(clerk_id))',
      t, t
    );
    execute format(
      'drop policy if exists %I_delete on public.%I',
      t, t
    );
    execute format(
      'create policy %I_delete on public.%I for delete using (proof.destilador_row_owned(clerk_id))',
      t, t
    );
  end loop;
end;
$pol$;

-- movimientos_inventario: solo SELECT + INSERT
drop policy if exists movimientos_inventario_select on public.movimientos_inventario;
create policy movimientos_inventario_select on public.movimientos_inventario
  for select using (proof.destilador_row_owned(clerk_id));

drop policy if exists movimientos_inventario_insert on public.movimientos_inventario;
create policy movimientos_inventario_insert on public.movimientos_inventario
  for insert with check (proof.destilador_row_owned(clerk_id));

revoke update, delete on public.movimientos_inventario from authenticated, anon;

-- -----------------------------------------------------------------------------
-- Storage · fotos de corrida
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lotes-produccion',
  'lotes-produccion',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists lotes_produccion_select on storage.objects;
create policy lotes_produccion_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lotes-produccion'
    and proof.destilador_row_owned((storage.foldername(name))[1])
  );

drop policy if exists lotes_produccion_insert on storage.objects;
create policy lotes_produccion_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lotes-produccion'
    and proof.destilador_row_owned((storage.foldername(name))[1])
  );

drop policy if exists lotes_produccion_update on storage.objects;
create policy lotes_produccion_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'lotes-produccion'
    and proof.destilador_row_owned((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'lotes-produccion'
    and proof.destilador_row_owned((storage.foldername(name))[1])
  );

drop policy if exists lotes_produccion_delete on storage.objects;
create policy lotes_produccion_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lotes-produccion'
    and proof.destilador_row_owned((storage.foldername(name))[1])
  );

grant execute on all functions in schema proof to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 2/4 · 20250602000100_destilador_confirmar_llegada.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- PROOF · Destilador — confirmar llegada + secuencia LOTE-NNN
-- Requiere: 20250602000000_destilador_mezcal_core.sql
-- =============================================================================

create or replace function proof.dest_next_numero_lote(p_clerk_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if not proof.destilador_row_owned(p_clerk_id) then
    raise exception 'forbidden';
  end if;

  insert into public.destilador_sequences (clerk_id)
  values (p_clerk_id)
  on conflict (clerk_id) do nothing;

  update public.destilador_sequences
  set lote_seq = lote_seq + 1, updated_at = now()
  where clerk_id = p_clerk_id
  returning lote_seq into v_next;

  return 'LOTE-' || lpad(v_next::text, 3, '0');
end;
$$;

create or replace function proof.dest_ensure_bodega_principal(p_clerk_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not proof.destilador_row_owned(p_clerk_id) then
    raise exception 'forbidden';
  end if;

  select id into v_id
  from public.bodegas
  where clerk_id = p_clerk_id
    and tipo = 'principal'
    and es_embotellado = false
  order by created_at
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.bodegas (clerk_id, nombre, ciudad, tipo, es_embotellado)
  values (p_clerk_id, 'Bodega principal', '', 'principal', false)
  returning id into v_id;

  return v_id;
end;
$$;

-- p_lineas: [{ "producto_viaje_id": "uuid", "litros_salida": n, "litros_recibidos": n, "abv": n|null }]
create or replace function proof.confirmar_llegada_destilador(
  p_viaje_id uuid,
  p_lineas jsonb
)
returns table (
  lote_id uuid,
  numero_lote text,
  producto_viaje_id uuid,
  tipo_agave text,
  litros_recibidos numeric,
  flete_proporcional numeric,
  merma_litros numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viaje public.viajes%rowtype;
  v_clerk text;
  v_bodega_id uuid;
  v_total_litros numeric;
  v_elem jsonb;
  v_pv_id uuid;
  v_salida numeric;
  v_recibidos numeric;
  v_abv numeric;
  v_pv public.productos_viaje%rowtype;
  v_flete_prop numeric;
  v_numero text;
  v_lote_id uuid;
  v_merma numeric;
begin
  v_clerk := proof.current_clerk_id();
  if v_clerk is null or v_clerk = '' then
    raise exception 'clerk_id requerido en JWT';
  end if;

  select * into v_viaje
  from public.viajes
  where id = p_viaje_id;

  if not found then
    raise exception 'viaje no encontrado';
  end if;

  if not proof.destilador_row_owned(v_viaje.clerk_id) then
    raise exception 'forbidden';
  end if;

  if v_viaje.estado = 'recibido' then
    raise exception 'el viaje ya fue recibido';
  end if;

  if v_viaje.estado not in ('confirmado', 'en_transito') then
    raise exception 'el viaje debe estar confirmado o en tránsito para recibir';
  end if;

  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'p_lineas debe ser un arreglo no vacío';
  end if;

  select coalesce(sum(litros_acordados), 0) into v_total_litros
  from public.productos_viaje
  where viaje_id = p_viaje_id
    and clerk_id = v_viaje.clerk_id;

  if v_total_litros <= 0 then
    raise exception 'el viaje no tiene litros acordados';
  end if;

  v_bodega_id := proof.dest_ensure_bodega_principal(v_viaje.clerk_id);

  for v_elem in select * from jsonb_array_elements(p_lineas) loop
    v_pv_id := (v_elem ->> 'producto_viaje_id')::uuid;
    v_salida := (v_elem ->> 'litros_salida')::numeric;
    v_recibidos := (v_elem ->> 'litros_recibidos')::numeric;
    v_abv := nullif(v_elem ->> 'abv', '')::numeric;

    if v_pv_id is null or v_salida is null or v_recibidos is null then
      raise exception 'cada línea requiere producto_viaje_id, litros_salida y litros_recibidos';
    end if;

    if v_salida < 0 or v_recibidos < 0 then
      raise exception 'litros no pueden ser negativos';
    end if;

    select * into v_pv
    from public.productos_viaje
    where id = v_pv_id
      and viaje_id = p_viaje_id
      and clerk_id = v_viaje.clerk_id;

    if not found then
      raise exception 'producto_viaje % no pertenece al viaje', v_pv_id;
    end if;

    v_flete_prop := round(
      v_viaje.costo_flete * v_pv.litros_acordados / v_total_litros,
      2
    );

    update public.productos_viaje
    set
      litros_salida = v_salida,
      litros_recibidos = v_recibidos,
      flete_proporcional = v_flete_prop,
      updated_at = now()
    where id = v_pv_id;

    v_merma := v_salida - v_recibidos;
    v_numero := proof.dest_next_numero_lote(v_viaje.clerk_id);

    insert into public.lotes (
      clerk_id,
      numero_lote,
      viaje_id,
      producto_viaje_id,
      tipo_agave,
      maestro,
      comunidad,
      fecha_recepcion,
      abv,
      litros_recibidos,
      litros_disponibles_granel,
      estado,
      bodega_id
    )
    values (
      v_viaje.clerk_id,
      v_numero,
      p_viaje_id,
      v_pv_id,
      v_pv.tipo_agave,
      v_viaje.palenquero_nombre,
      v_viaje.comunidad,
      current_date,
      v_abv,
      v_recibidos,
      v_recibidos,
      'en_bodega_crudo',
      v_bodega_id
    )
    returning id into v_lote_id;

    lote_id := v_lote_id;
    numero_lote := v_numero;
    producto_viaje_id := v_pv_id;
    tipo_agave := v_pv.tipo_agave;
    litros_recibidos := v_recibidos;
    flete_proporcional := v_flete_prop;
    merma_litros := v_merma;
    return next;
  end loop;

  update public.viajes
  set estado = 'recibido', updated_at = now()
  where id = p_viaje_id;
end;
$$;

create or replace function public.confirmar_llegada_destilador(
  p_viaje_id uuid,
  p_lineas jsonb
)
returns table (
  lote_id uuid,
  numero_lote text,
  producto_viaje_id uuid,
  tipo_agave text,
  litros_recibidos numeric,
  flete_proporcional numeric,
  merma_litros numeric
)
language sql
security definer
set search_path = public
as $$
  select *
  from proof.confirmar_llegada_destilador(p_viaje_id, p_lineas);
$$;

grant execute on function public.confirmar_llegada_destilador(uuid, jsonb) to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 3/4 · 20250602000200_destilador_cerrar_corrida.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- PROOF · Destilador — cerrar corrida de embotellado
-- =============================================================================

create or replace function proof.cerrar_corrida_destilador(
  p_corrida_id uuid,
  p_botellas_producidas integer,
  p_botellas_defectuosas integer default 0
)
returns table (
  corrida_id uuid,
  lote_id uuid,
  numero_lote text,
  costo_real_por_botella numeric,
  cajas_generadas integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_corrida public.corridas_embotellado%rowtype;
  v_lote public.lotes%rowtype;
  v_pv public.productos_viaje%rowtype;
  v_clerk text;
  v_costo_mezcal numeric;
  v_costo_op numeric;
  v_costo_total numeric;
  v_costo_real numeric;
  v_cajas int;
  v_resto int;
  v_por_caja int := 12;
  v_i int;
  v_qr text;
  v_bodega_emb uuid;
begin
  v_clerk := proof.current_clerk_id();
  if v_clerk is null or v_clerk = '' then
    raise exception 'clerk_id requerido en JWT';
  end if;

  select * into v_corrida from public.corridas_embotellado where id = p_corrida_id;
  if not found then raise exception 'corrida no encontrada'; end if;
  if not proof.destilador_row_owned(v_corrida.clerk_id) then raise exception 'forbidden'; end if;
  if v_corrida.estado <> 'activa' then raise exception 'la corrida no está activa'; end if;
  if p_botellas_producidas < 0 or p_botellas_defectuosas < 0 then
    raise exception 'botellas inválidas';
  end if;

  select * into v_lote from public.lotes where id = v_corrida.lote_id;
  select * into v_pv from public.productos_viaje where id = v_lote.producto_viaje_id;

  v_costo_mezcal := 0;
  if v_pv.litros_recibidos > 0 then
    v_costo_mezcal := (
      v_pv.precio_por_litro
      + coalesce(v_pv.flete_proporcional, 0) / v_pv.litros_recibidos
    ) * (p_botellas_producidas * public.dest_formato_litros(v_corrida.formato_botella));
  end if;

  if v_corrida.modo = 'equipo' then
    v_costo_op := coalesce(v_corrida.costo_corrida, 0);
  else
    v_costo_op := coalesce(v_corrida.personas, 1)
      * coalesce(v_corrida.horas_reales, v_corrida.horas_estimadas, 0)
      * coalesce(v_corrida.tarifa_hora, 0);
  end if;

  v_costo_total := v_costo_mezcal + v_costo_op;
  v_costo_real := case
    when p_botellas_producidas > 0 then round(v_costo_total / p_botellas_producidas, 4)
    else null
  end;

  update public.corridas_embotellado
  set
    botellas_producidas = p_botellas_producidas,
    botellas_defectuosas = p_botellas_defectuosas,
    costo_real_por_botella = v_costo_real,
    estado = 'completada',
    updated_at = now()
  where id = p_corrida_id;

  update public.stock_botellas_vacias
  set
    cantidad_disponible = greatest(cantidad_disponible - p_botellas_producidas - p_botellas_defectuosas, 0),
    updated_at = now()
  where clerk_id = v_corrida.clerk_id
    and bodega_id = v_corrida.bodega_id
    and formato = v_corrida.formato_botella;

  select id into v_bodega_emb
  from public.bodegas
  where clerk_id = v_corrida.clerk_id and es_embotellado = true
  limit 1;
  if v_bodega_emb is null then
    v_bodega_emb := v_corrida.bodega_id;
  end if;

  v_cajas := ceil(p_botellas_producidas::numeric / v_por_caja);
  v_resto := p_botellas_producidas;

  for v_i in 1..greatest(v_cajas, 0) loop
    v_qr := 'CAJA-' || replace(gen_random_uuid()::text, '-', '');
    insert into public.cajas (
      clerk_id, codigo_qr, lote_id, corrida_id, formato_botella,
      cantidad_botellas, bodega_id, estado
    )
    values (
      v_corrida.clerk_id,
      v_qr,
      v_corrida.lote_id,
      p_corrida_id,
      v_corrida.formato_botella,
      least(v_por_caja, v_resto),
      v_bodega_emb,
      'en_bodega'
    );
    v_resto := v_resto - v_por_caja;
  end loop;

  update public.lotes
  set
    estado = case
      when litros_disponibles_granel <= 0 then 'terminado'::public.dest_lote_estado
      else 'vendido_parcial'::public.dest_lote_estado
    end,
    updated_at = now()
  where id = v_corrida.lote_id;

  corrida_id := p_corrida_id;
  lote_id := v_corrida.lote_id;
  numero_lote := v_lote.numero_lote;
  costo_real_por_botella := v_costo_real;
  cajas_generadas := greatest(v_cajas, 0);
  return next;
end;
$$;

create or replace function public.cerrar_corrida_destilador(
  p_corrida_id uuid,
  p_botellas_producidas integer,
  p_botellas_defectuosas integer default 0
)
returns table (
  corrida_id uuid,
  lote_id uuid,
  numero_lote text,
  costo_real_por_botella numeric,
  cajas_generadas integer
)
language sql
security definer
set search_path = public
as $$
  select * from proof.cerrar_corrida_destilador(
    p_corrida_id, p_botellas_producidas, p_botellas_defectuosas
  );
$$;

grant execute on function public.cerrar_corrida_destilador(uuid, integer, integer) to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 4/4 · scripts/destilador-post-apply-smoke.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- Smoke test tras aplicar migraciones Destilador (ejecutar como postgres / service role)
-- Sustituir :clerk_id por un clerk_id real con perfil distiller.

-- 1) Tablas creadas
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'bodegas', 'viajes', 'productos_viaje', 'lotes', 'pedidos_destilador'
  )
order by 1;

-- 2) RPC existe
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('proof', 'public')
  and proname in ('destilador_row_owned', 'confirmar_llegada_destilador', 'dest_next_numero_lote');

-- 3) Flujo mínimo (descomentar y poner clerk_id)
/*
\set clerk_id 'user_xxx'

insert into viajes (clerk_id, region, palenquero_nombre, costo_flete, estado)
values (:'clerk_id', 'Oaxaca', 'Test Palenque', 5000, 'en_transito')
returning id;

-- usar viaje_id devuelto:
insert into productos_viaje (clerk_id, viaje_id, tipo_agave, litros_acordados, precio_por_litro)
values (:'clerk_id', '<viaje_id>', 'Espadín', 200, 350);

select * from proof.confirmar_llegada_destilador(
  '<viaje_id>'::uuid,
  jsonb_build_array(
    jsonb_build_object(
      'producto_viaje_id', (select id from productos_viaje where viaje_id = '<viaje_id>' limit 1),
      'litros_salida', 200,
      'litros_recibidos', 195,
      'abv', 48
    )
  )
);

select numero_lote, tipo_agave, litros_recibidos, estado from lotes where viaje_id = '<viaje_id>';
*/

-- -----------------------------------------------------------------------------
-- Agente destilador: campos aditivos (20250603000000)
-- -----------------------------------------------------------------------------
alter table public.corridas_embotellado
  add column if not exists fecha_embotellado date;

alter table public.lotes
  add column if not exists precio_venta numeric(14, 2)
    check (precio_venta is null or precio_venta >= 0);

alter table public.lotes
  add column if not exists nota text;

alter table public.lotes
  add column if not exists fecha_embotellado_programada date;

comment on column public.corridas_embotellado.fecha_embotellado is 'Fecha programada/real de embotellado (agente PROOF)';
comment on column public.lotes.precio_venta is 'Precio de venta referencia del lote';
comment on column public.lotes.nota is 'Nota libre del lote';
comment on column public.lotes.fecha_embotellado_programada is 'Fecha programada de embotellado (agente PROOF)';
