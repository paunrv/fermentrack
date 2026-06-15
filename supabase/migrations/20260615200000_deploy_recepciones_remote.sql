-- =============================================================================
-- PROOF · Recepciones — despliegue aditivo en remoto
-- Tablas, storage, RLS y confirmar_recepcion (legacy OC + OC distribuidor)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
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
  alter type public.estado_deuda_productor add value if not exists 'pagado';
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estado_orden_compra as enum (
    'borrador', 'enviada', 'recibida', 'parcial'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Recepciones
-- -----------------------------------------------------------------------------
create table if not exists public.recepciones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  productor text not null,
  bodega_destino text not null default 'Principal',
  orden_compra_id uuid,
  orden_compra_distribuidor_id uuid references public.ordenes_compra_distribuidor(id) on delete set null,
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
create index if not exists recepciones_orden_compra_id_idx on public.recepciones (orden_compra_id);
create index if not exists recepciones_orden_compra_distribuidor_id_idx
  on public.recepciones (orden_compra_distribuidor_id)
  where orden_compra_distribuidor_id is not null;
create index if not exists items_recepcion_recepcion_id_idx on public.items_recepcion (recepcion_id);
create index if not exists discrepancias_recepcion_id_idx on public.discrepancias (recepcion_id);

-- -----------------------------------------------------------------------------
-- Deudas a productores
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
-- Órdenes de compra legacy (selector recepción)
-- -----------------------------------------------------------------------------
create table if not exists public.ordenes_compra (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  productor_id text not null default '',
  estado public.estado_orden_compra not null default 'borrador',
  fecha_esperada date,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items_orden_compra (
  id uuid primary key default gen_random_uuid(),
  orden_compra_id uuid not null references public.ordenes_compra(id) on delete cascade,
  sku_id uuid not null references public.skus(id) on delete restrict,
  cantidad_esperada integer not null check (cantidad_esperada > 0),
  precio_unitario numeric(12, 2) not null default 0 check (precio_unitario >= 0),
  created_at timestamptz not null default now(),
  unique (orden_compra_id, sku_id)
);

create index if not exists ordenes_compra_scope_idx on public.ordenes_compra (clerk_id, profile_type_v2);
create index if not exists ordenes_compra_estado_idx on public.ordenes_compra (estado);
create index if not exists items_orden_compra_orden_idx on public.items_orden_compra (orden_compra_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recepciones_orden_compra_id_fkey'
  ) then
    alter table public.recepciones
      add constraint recepciones_orden_compra_id_fkey
      foreign key (orden_compra_id) references public.ordenes_compra(id) on delete set null;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Storage bucket recepciones (privado)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recepciones', 'recepciones', false)
on conflict (id) do update set public = false;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recepciones_owner_select'
  ) then
    create policy recepciones_owner_select on storage.objects
      for select
      using (
        bucket_id = 'recepciones'
        and (storage.foldername(name))[1] = proof.current_clerk_id()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recepciones_owner_insert'
  ) then
    create policy recepciones_owner_insert on storage.objects
      for insert
      with check (
        bucket_id = 'recepciones'
        and (storage.foldername(name))[1] = proof.current_clerk_id()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recepciones_owner_update'
  ) then
    create policy recepciones_owner_update on storage.objects
      for update
      using (
        bucket_id = 'recepciones'
        and (storage.foldername(name))[1] = proof.current_clerk_id()
      )
      with check (
        bucket_id = 'recepciones'
        and (storage.foldername(name))[1] = proof.current_clerk_id()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recepciones_owner_delete'
  ) then
    create policy recepciones_owner_delete on storage.objects
      for delete
      using (
        bucket_id = 'recepciones'
        and (storage.foldername(name))[1] = proof.current_clerk_id()
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.recepciones enable row level security;
alter table public.items_recepcion enable row level security;
alter table public.discrepancias enable row level security;
alter table public.deudas_productores enable row level security;
alter table public.ordenes_compra enable row level security;
alter table public.items_orden_compra enable row level security;

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

drop policy if exists deudas_productores_all on public.deudas_productores;
create policy deudas_productores_all on public.deudas_productores for all
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists ordenes_compra_scope on public.ordenes_compra;
create policy ordenes_compra_scope on public.ordenes_compra
  for all
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists items_orden_compra_scope on public.items_orden_compra;
create policy items_orden_compra_scope on public.items_orden_compra
  for all
  using (
    exists (
      select 1 from public.ordenes_compra oc
      where oc.id = items_orden_compra.orden_compra_id
        and proof.row_belongs_to_requester(oc.clerk_id, oc.profile_type_v2)
    )
  )
  with check (
    exists (
      select 1 from public.ordenes_compra oc
      where oc.id = items_orden_compra.orden_compra_id
        and proof.row_belongs_to_requester(oc.clerk_id, oc.profile_type_v2)
    )
  );

-- -----------------------------------------------------------------------------
-- confirmar_recepcion: stock + deuda + OC legacy / OC distribuidor
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
  v_oc_tiene_discrep boolean;
  v_oc_item record;
  v_recibido integer;
  v_lineas jsonb := '[]'::jsonb;
  v_nueva integer;
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

  if v_rec.orden_compra_distribuidor_id is not null then
    for v_oc_item in
      select
        i.id,
        i.sku_id,
        i.producto_nombre,
        coalesce(i.cantidad_recibida, 0) as prev_rec
      from public.items_orden_compra_distribuidor i
      where i.orden_id = v_rec.orden_compra_distribuidor_id
    loop
      select coalesce(sum(ir.cantidad_recibida), 0) into v_recibido
      from public.items_recepcion ir
      left join public.skus s on s.id = ir.sku_id
      where ir.recepcion_id = p_recepcion_id
        and ir.cantidad_recibida > 0
        and (
          (v_oc_item.sku_id is not null and ir.sku_id = v_oc_item.sku_id)
          or lower(trim(coalesce(s.nombre, ''))) = lower(trim(v_oc_item.producto_nombre))
        );

      if v_recibido > 0 then
        v_nueva := v_oc_item.prev_rec + v_recibido;
        v_lineas := v_lineas || jsonb_build_array(
          jsonb_build_object(
            'item_id', v_oc_item.id,
            'cantidad_recibida', v_nueva
          )
        );
      end if;
    end loop;

    if jsonb_array_length(v_lineas) > 0 then
      perform proof.confirmar_llegada_orden_compra_distribuidor(
        v_rec.orden_compra_distribuidor_id,
        v_lineas
      );
    end if;
  else
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
  end if;

  if
    p_registrar_deuda
    and v_rec.deuda_registrada > 0
    and v_rec.orden_compra_distribuidor_id is null
  then
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

  if v_rec.orden_compra_id is not null then
    select exists (
      select 1
      from public.items_orden_compra ioc
      left join public.items_recepcion ir
        on ir.recepcion_id = p_recepcion_id and ir.sku_id = ioc.sku_id
      where ioc.orden_compra_id = v_rec.orden_compra_id
        and coalesce(ir.cantidad_recibida, 0) <> ioc.cantidad_esperada
    ) into v_oc_tiene_discrep;

    update public.ordenes_compra
    set
      estado = case
        when v_oc_tiene_discrep then 'parcial'::public.estado_orden_compra
        else 'recibida'::public.estado_orden_compra
      end,
      updated_at = now()
    where id = v_rec.orden_compra_id
      and estado in ('borrador', 'enviada', 'parcial');
  end if;

  return v_rec;
end;
$$;

create or replace function public.confirmar_recepcion(
  p_recepcion_id uuid,
  p_registrar_deuda boolean default true
)
returns public.recepciones
language sql
security definer
set search_path = public, proof
as $$ select proof.confirmar_recepcion(p_recepcion_id, p_registrar_deuda); $$;

grant execute on function public.confirmar_recepcion(uuid, boolean) to authenticated, service_role;

grant select, insert, update, delete on public.recepciones to authenticated, service_role;
grant select, insert, update, delete on public.items_recepcion to authenticated, service_role;
grant select, insert, update, delete on public.discrepancias to authenticated, service_role;
grant select, insert, update, delete on public.deudas_productores to authenticated, service_role;
grant select, insert, update, delete on public.ordenes_compra to authenticated, service_role;
grant select, insert, update, delete on public.items_orden_compra to authenticated, service_role;
