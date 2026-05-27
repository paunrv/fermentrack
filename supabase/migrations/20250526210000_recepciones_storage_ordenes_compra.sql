-- Recepciones: Storage privado + órdenes de compra + FK recepciones.orden_compra_id

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
-- Órdenes de compra
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.estado_orden_compra as enum (
    'borrador', 'enviada', 'recibida', 'parcial'
  );
exception when duplicate_object then null;
end $$;

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

-- recepciones.orden_compra_id → uuid FK (reemplaza text legacy)
alter table public.recepciones drop column if exists orden_compra_id;
alter table public.recepciones
  add column if not exists orden_compra_id uuid references public.ordenes_compra(id) on delete set null;

create index if not exists recepciones_orden_compra_id_idx on public.recepciones (orden_compra_id);

-- RLS órdenes de compra
alter table public.ordenes_compra enable row level security;
alter table public.items_orden_compra enable row level security;

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
-- confirmar_recepcion: actualizar estado OC
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
