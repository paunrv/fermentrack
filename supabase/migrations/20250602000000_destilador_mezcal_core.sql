-- =============================================================================
-- PROOF · Destilador (Mezcal) — núcleo de datos
-- Tablas independientes del distribuidor. RLS por clerk_id (JWT sub).
-- Aplicar solo tras revisión (producción directa).
-- =============================================================================

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
