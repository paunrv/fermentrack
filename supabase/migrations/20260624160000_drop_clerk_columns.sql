-- Clerk → Supabase Auth (fase 2 · limpieza final)
-- Prerequisito: 20260624120000 aplicada y user_id poblado por la app.
-- Si DROP auth_has_staff_access_to_scope(text,text) falla con 2BP01, ejecutar antes:
--   scripts/prereq-drop-clerk-columns.sql
-- Elimina columnas clerk_id del distribuidor (21 tablas raíz).
-- NO toca: profiles_clerk_legacy/proof_profiles, destilador, winemaker.

begin;

-- -----------------------------------------------------------------------------
-- 1. Backfill user_id desde clerk_id (UUID legacy de Supabase Auth)
-- -----------------------------------------------------------------------------
do $backfill_user_id$
declare
  tbl text;
begin
  foreach tbl in array array[
    'skus', 'pedidos', 'recepciones', 'proof_sequences', 'deudas_productores',
    'cuentas_clientes', 'cuentas_por_pagar', 'cuentas_por_cobrar', 'pagos',
    'pagos_proveedor', 'pagos_cliente', 'movimientos_stock',
    'clientes', 'clients', 'client_etiquetas', 'trabajadores', 'cajas_distribuidor',
    'ordenes_compra', 'ordenes_compra_distribuidor', 'remisiones_distribuidor', 'kpi_config'
  ]
  loop
    execute format(
      $sql$
        update public.%I
        set user_id = clerk_id::uuid
        where user_id is null
          and clerk_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      $sql$,
      tbl
    );
  end loop;
end;
$backfill_user_id$;

-- -----------------------------------------------------------------------------
-- 2. Abortar si quedan filas sin user_id
-- -----------------------------------------------------------------------------
do $assert_user_id$
declare
  tbl text;
  missing bigint;
begin
  foreach tbl in array array[
    'skus', 'pedidos', 'recepciones', 'proof_sequences', 'deudas_productores',
    'cuentas_clientes', 'cuentas_por_pagar', 'cuentas_por_cobrar', 'pagos',
    'pagos_proveedor', 'pagos_cliente', 'movimientos_stock',
    'clientes', 'clients', 'client_etiquetas', 'trabajadores', 'cajas_distribuidor',
    'ordenes_compra', 'ordenes_compra_distribuidor', 'remisiones_distribuidor', 'kpi_config'
  ]
  loop
    execute format('select count(*) from public.%I where user_id is null', tbl) into missing;
    if missing > 0 then
      raise exception 'drop_clerk_columns: % tiene % filas con user_id null — backfill antes de continuar', tbl, missing;
    end if;
  end loop;
end;
$assert_user_id$;

-- -----------------------------------------------------------------------------
-- 3. trabajadores: clerk_user_id / patron_clerk_id / clerk_id → user_id / patron_user_id
-- -----------------------------------------------------------------------------
update public.trabajadores
set user_id = clerk_user_id::uuid
where user_id is null
  and clerk_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

alter table public.trabajadores
  add column if not exists patron_user_id uuid;

update public.trabajadores
set patron_user_id = user_id
where rol = 'patron' and patron_user_id is null;

update public.trabajadores t
set patron_user_id = p.user_id
from public.trabajadores p
where t.rol <> 'patron'
  and t.patron_user_id is null
  and t.patron_clerk_id = p.clerk_user_id;

alter table public.trabajadores drop constraint if exists trabajadores_patron_clerk_id_fkey;
alter table public.trabajadores drop constraint if exists trabajadores_patron_self;
alter table public.trabajadores drop constraint if exists trabajadores_patron_scope;
alter table public.trabajadores drop constraint if exists trabajadores_staff_scope;

drop index if exists public.trabajadores_scope_idx;
drop index if exists public.trabajadores_patron_clerk_id_idx;
drop index if exists public.trabajadores_clerk_user_id_idx;

create unique index if not exists trabajadores_user_id_key on public.trabajadores (user_id);

alter table public.trabajadores
  add constraint trabajadores_patron_user_id_fkey
  foreign key (patron_user_id) references public.trabajadores (user_id)
  deferrable initially deferred;

alter table public.trabajadores
  add constraint trabajadores_patron_self check (
    rol <> 'patron' or user_id = patron_user_id
  );

alter table public.trabajadores
  add constraint trabajadores_staff_scope check (
    rol = 'patron' or patron_user_id is not null
  );

create index if not exists trabajadores_scope_idx
  on public.trabajadores (user_id, profile_type_v2);
create index if not exists trabajadores_patron_user_id_idx
  on public.trabajadores (patron_user_id);

-- -----------------------------------------------------------------------------
-- 4. DROP políticas RLS que referencian clerk_id
-- -----------------------------------------------------------------------------
do $drop_root_policies$
declare
  pol record;
  tbl text;
begin
  foreach tbl in array array[
    'skus', 'pedidos', 'recepciones', 'proof_sequences', 'deudas_productores',
    'cuentas_clientes', 'cuentas_por_pagar', 'cuentas_por_cobrar', 'pagos',
    'pagos_proveedor', 'pagos_cliente', 'movimientos_stock',
    'clientes', 'clients', 'client_etiquetas', 'trabajadores', 'cajas_distribuidor',
    'ordenes_compra', 'ordenes_compra_distribuidor', 'remisiones_distribuidor', 'kpi_config'
  ]
  loop
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
    end loop;
  end loop;
end;
$drop_root_policies$;

do $drop_child_policies$
declare
  pol record;
  tbl text;
begin
  foreach tbl in array array[
    'items_pedido', 'items_recepcion', 'discrepancias',
    'items_orden_compra', 'items_orden_compra_distribuidor',
    'pagos_pedidos', 'eventos_caja'
  ]
  loop
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
    end loop;
  end loop;
end;
$drop_child_policies$;

-- -----------------------------------------------------------------------------
-- 4b. Tablas fuera del listado §4 (M2/M7) — desvincular overload (text,text)
-- -----------------------------------------------------------------------------
update public.movimientos_sku m
set user_id = s.user_id
from public.skus s
where m.user_id is null
  and m.sku_id = s.id
  and s.user_id is not null;

drop policy if exists movimientos_sku_select on public.movimientos_sku;
drop policy if exists movimientos_sku_insert on public.movimientos_sku;
drop policy if exists movimientos_sku_update on public.movimientos_sku;
drop policy if exists movimientos_sku_delete on public.movimientos_sku;

create policy movimientos_sku_select on public.movimientos_sku for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy movimientos_sku_insert on public.movimientos_sku for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy movimientos_sku_update on public.movimientos_sku for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy movimientos_sku_delete on public.movimientos_sku for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

drop policy if exists proof_profiles_select on public.proof_profiles;
drop policy if exists proof_profiles_update on public.proof_profiles;

create policy proof_profiles_select on public.proof_profiles for select
  using (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy proof_profiles_update on public.proof_profiles for update
  using (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
  );

create or replace function proof.sku_image_path_owned(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, proof
as $$
  select exists (
    select 1
    from public.skus s
    where (storage.foldername(object_name))[1] = 'skus'
      and s.id::text = (storage.foldername(object_name))[2]
      and (
        s.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(s.user_id, s.profile_type_v2)
      )
  );
$$;

grant execute on function proof.sku_image_path_owned(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. Helper staff: clerk_id → user_id del scope
-- -----------------------------------------------------------------------------
drop function if exists proof.auth_has_staff_access_to_scope(text, text);

create or replace function proof.auth_has_staff_access_to_scope(
  p_scope_user_id uuid,
  p_profile_type_v2 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trabajadores t
    where t.user_id = auth.uid()
      and t.profile_type_v2 = p_profile_type_v2
      and t.activo = true
      and (
        (t.rol = 'patron' and t.user_id = p_scope_user_id)
        or (t.rol <> 'patron' and t.patron_user_id = p_scope_user_id)
      )
  );
$$;

grant execute on function proof.auth_has_staff_access_to_scope(uuid, text)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. RLS recreada sin clerk_id
-- -----------------------------------------------------------------------------
-- skus
create policy skus_select on public.skus for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy skus_insert on public.skus for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy skus_update on public.skus for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy skus_delete on public.skus for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- pedidos
create policy pedidos_select on public.pedidos for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy pedidos_insert on public.pedidos for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy pedidos_update on public.pedidos for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy pedidos_delete on public.pedidos for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- recepciones
create policy recepciones_all on public.recepciones for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- proof_sequences
create policy proof_sequences_select on public.proof_sequences for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy proof_sequences_all on public.proof_sequences for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- deudas_productores
create policy deudas_productores_all on public.deudas_productores for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- cuentas_clientes
create policy cuentas_clientes_all on public.cuentas_clientes for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- cuentas_por_pagar
create policy cuentas_por_pagar_select on public.cuentas_por_pagar for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy cuentas_por_pagar_insert on public.cuentas_por_pagar for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy cuentas_por_pagar_update on public.cuentas_por_pagar for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- cuentas_por_cobrar
create policy cuentas_por_cobrar_select on public.cuentas_por_cobrar for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy cuentas_por_cobrar_insert on public.cuentas_por_cobrar for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy cuentas_por_cobrar_update on public.cuentas_por_cobrar for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- pagos
create policy pagos_select on public.pagos for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy pagos_insert on public.pagos for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy pagos_update on public.pagos for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- pagos_proveedor
create policy pagos_proveedor_select on public.pagos_proveedor for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy pagos_proveedor_insert on public.pagos_proveedor for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- pagos_cliente
create policy pagos_cliente_select on public.pagos_cliente for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy pagos_cliente_insert on public.pagos_cliente for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- movimientos_stock (SELECT + INSERT, inmutable)
create policy movimientos_stock_select on public.movimientos_stock for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy movimientos_stock_insert on public.movimientos_stock for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- clientes
create policy clientes_select on public.clientes for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy clientes_insert on public.clientes for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy clientes_update on public.clientes for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- clients (sin RLS previo)
alter table public.clients enable row level security;

create policy clients_select on public.clients for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy clients_insert on public.clients for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy clients_update on public.clients for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy clients_delete on public.clients for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- client_etiquetas
create policy client_etiquetas_all on public.client_etiquetas for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- trabajadores (patrón patron / staff vía user_id)
create policy trabajadores_select on public.trabajadores for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.trabajadores patron
      where patron.user_id = auth.uid()
        and patron.rol = 'patron'
        and patron.activo = true
        and trabajadores.patron_user_id = patron.user_id
        and trabajadores.profile_type_v2 = patron.profile_type_v2
    )
  );
create policy trabajadores_insert on public.trabajadores for insert
  with check (
    exists (
      select 1
      from public.trabajadores patron
      where patron.user_id = auth.uid()
        and patron.rol = 'patron'
        and patron.activo = true
        and trabajadores.patron_user_id = patron.user_id
        and trabajadores.profile_type_v2 = patron.profile_type_v2
    )
  );
create policy trabajadores_update on public.trabajadores for update
  using (
    exists (
      select 1
      from public.trabajadores patron
      where patron.user_id = auth.uid()
        and patron.rol = 'patron'
        and patron.activo = true
        and trabajadores.patron_user_id = patron.user_id
        and trabajadores.profile_type_v2 = patron.profile_type_v2
    )
  )
  with check (
    exists (
      select 1
      from public.trabajadores patron
      where patron.user_id = auth.uid()
        and patron.rol = 'patron'
        and patron.activo = true
        and trabajadores.patron_user_id = patron.user_id
        and trabajadores.profile_type_v2 = patron.profile_type_v2
    )
  );

-- cajas_distribuidor
create policy cajas_distribuidor_select on public.cajas_distribuidor for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy cajas_distribuidor_insert on public.cajas_distribuidor for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy cajas_distribuidor_update on public.cajas_distribuidor for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- ordenes_compra
create policy ordenes_compra_scope on public.ordenes_compra for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- ordenes_compra_distribuidor
create policy ordenes_compra_dist_select on public.ordenes_compra_distribuidor for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy ordenes_compra_dist_insert on public.ordenes_compra_distribuidor for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy ordenes_compra_dist_update on public.ordenes_compra_distribuidor for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );
create policy ordenes_compra_dist_delete on public.ordenes_compra_distribuidor for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- remisiones_distribuidor
create policy remisiones_distribuidor_all on public.remisiones_distribuidor for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(user_id, profile_type_v2)
  );

-- kpi_config (sin staff; antes incluía is_super_user vía Clerk)
create policy kpi_config_select on public.kpi_config for select
  using (user_id = auth.uid());
create policy kpi_config_insert on public.kpi_config for insert
  with check (user_id = auth.uid());
create policy kpi_config_update on public.kpi_config for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy kpi_config_delete on public.kpi_config for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 7. Tablas hijas · RLS vía EXISTS en padre (sin clerk_id directo)
-- -----------------------------------------------------------------------------

-- items_pedido → pedidos
create policy items_pedido_all on public.items_pedido for all
  using (exists (
    select 1
    from public.pedidos p
    where p.id = items_pedido.pedido_id
      and (
        p.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(p.user_id, p.profile_type_v2)
      )
  ))
  with check (exists (
    select 1
    from public.pedidos p
    where p.id = items_pedido.pedido_id
      and (
        p.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(p.user_id, p.profile_type_v2)
      )
  ));

-- items_recepcion → recepciones
create policy items_recepcion_all on public.items_recepcion for all
  using (exists (
    select 1
    from public.recepciones r
    where r.id = items_recepcion.recepcion_id
      and (
        r.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(r.user_id, r.profile_type_v2)
      )
  ))
  with check (exists (
    select 1
    from public.recepciones r
    where r.id = items_recepcion.recepcion_id
      and (
        r.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(r.user_id, r.profile_type_v2)
      )
  ));

-- discrepancias → recepciones
create policy discrepancias_all on public.discrepancias for all
  using (exists (
    select 1
    from public.recepciones r
    where r.id = discrepancias.recepcion_id
      and (
        r.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(r.user_id, r.profile_type_v2)
      )
  ))
  with check (exists (
    select 1
    from public.recepciones r
    where r.id = discrepancias.recepcion_id
      and (
        r.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(r.user_id, r.profile_type_v2)
      )
  ));

-- items_orden_compra → ordenes_compra
create policy items_orden_compra_scope on public.items_orden_compra for all
  using (exists (
    select 1
    from public.ordenes_compra oc
    where oc.id = items_orden_compra.orden_compra_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.user_id, oc.profile_type_v2)
      )
  ))
  with check (exists (
    select 1
    from public.ordenes_compra oc
    where oc.id = items_orden_compra.orden_compra_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.user_id, oc.profile_type_v2)
      )
  ));

-- items_orden_compra_distribuidor → ordenes_compra_distribuidor
create policy items_orden_compra_dist_select on public.items_orden_compra_distribuidor for select
  using (exists (
    select 1
    from public.ordenes_compra_distribuidor oc
    where oc.id = items_orden_compra_distribuidor.orden_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.user_id, oc.profile_type_v2)
      )
  ));
create policy items_orden_compra_dist_insert on public.items_orden_compra_distribuidor for insert
  with check (exists (
    select 1
    from public.ordenes_compra_distribuidor oc
    where oc.id = items_orden_compra_distribuidor.orden_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.user_id, oc.profile_type_v2)
      )
  ));
create policy items_orden_compra_dist_update on public.items_orden_compra_distribuidor for update
  using (exists (
    select 1
    from public.ordenes_compra_distribuidor oc
    where oc.id = items_orden_compra_distribuidor.orden_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.user_id, oc.profile_type_v2)
      )
  ))
  with check (exists (
    select 1
    from public.ordenes_compra_distribuidor oc
    where oc.id = items_orden_compra_distribuidor.orden_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.user_id, oc.profile_type_v2)
      )
  ));
create policy items_orden_compra_dist_delete on public.items_orden_compra_distribuidor for delete
  using (exists (
    select 1
    from public.ordenes_compra_distribuidor oc
    where oc.id = items_orden_compra_distribuidor.orden_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.user_id, oc.profile_type_v2)
      )
  ));

-- pagos_pedidos → pagos
create policy pagos_pedidos_select on public.pagos_pedidos for select
  using (exists (
    select 1
    from public.pagos p
    where p.id = pagos_pedidos.pago_id
      and (
        p.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(p.user_id, p.profile_type_v2)
      )
  ));
create policy pagos_pedidos_insert on public.pagos_pedidos for insert
  with check (exists (
    select 1
    from public.pagos p
    where p.id = pagos_pedidos.pago_id
      and (
        p.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(p.user_id, p.profile_type_v2)
      )
  ));

-- eventos_caja → cajas_distribuidor
create policy eventos_caja_select on public.eventos_caja for select
  using (exists (
    select 1
    from public.cajas_distribuidor c
    where c.id = eventos_caja.caja_id
      and (
        c.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(c.user_id, c.profile_type_v2)
      )
  ));
create policy eventos_caja_insert on public.eventos_caja for insert
  with check (exists (
    select 1
    from public.cajas_distribuidor c
    where c.id = eventos_caja.caja_id
      and (
        c.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(c.user_id, c.profile_type_v2)
      )
  ));

-- -----------------------------------------------------------------------------
-- 7. Índices scope: clerk_id → user_id
-- (PK/UNIQUE → ver 20260626160000_migrate_distribuidor_constraints.sql)
-- -----------------------------------------------------------------------------
drop index if exists public.kpi_config_slot_unique;
create unique index kpi_config_slot_unique
  on public.kpi_config (user_id, profile_type, slot, scope_id)
  nulls not distinct;

drop index if exists public.skus_scope_idx;
create index skus_scope_idx on public.skus (user_id, profile_type_v2);

drop index if exists public.pedidos_scope_idx;
create index pedidos_scope_idx on public.pedidos (user_id, profile_type_v2);

drop index if exists public.pedidos_fecha_entrega_hoy_idx;
create index pedidos_fecha_entrega_hoy_idx on public.pedidos (user_id, profile_type_v2, fecha_entrega)
  where estado in ('confirmado', 'preparando', 'en_ruta', 'parcial');

drop index if exists public.recepciones_scope_idx;
create index recepciones_scope_idx on public.recepciones (user_id, profile_type_v2);

drop index if exists public.deudas_productores_scope_idx;
create index deudas_productores_scope_idx on public.deudas_productores (user_id, profile_type_v2);

drop index if exists public.cuentas_clientes_scope_idx;
create index cuentas_clientes_scope_idx on public.cuentas_clientes (user_id, profile_type_v2);

drop index if exists public.client_etiquetas_scope_idx;
create index client_etiquetas_scope_idx on public.client_etiquetas (user_id, profile_type_v2);

drop index if exists public.clients_scope_idx;
create index clients_scope_idx on public.clients (user_id, profile_type_v2);

drop index if exists public.ordenes_compra_scope_idx;
create index ordenes_compra_scope_idx on public.ordenes_compra (user_id, profile_type_v2);

-- -----------------------------------------------------------------------------
-- 8. DROP columnas clerk_id + NOT NULL en user_id
-- -----------------------------------------------------------------------------
do $drop_clerk_cols$
declare
  tbl text;
begin
  foreach tbl in array array[
    'skus', 'pedidos', 'recepciones', 'proof_sequences', 'deudas_productores',
    'cuentas_clientes', 'cuentas_por_pagar', 'cuentas_por_cobrar', 'pagos',
    'pagos_proveedor', 'pagos_cliente', 'movimientos_stock',
    'clientes', 'clients', 'client_etiquetas', 'cajas_distribuidor',
    'ordenes_compra', 'ordenes_compra_distribuidor', 'remisiones_distribuidor', 'kpi_config'
  ]
  loop
    execute format('alter table public.%I drop column if exists clerk_id', tbl);
    execute format('alter table public.%I alter column user_id set not null', tbl);
  end loop;
end;
$drop_clerk_cols$;

alter table public.trabajadores drop column if exists clerk_user_id;
alter table public.trabajadores drop column if exists patron_clerk_id;
alter table public.trabajadores drop column if exists clerk_id;
alter table public.trabajadores alter column user_id set not null;
alter table public.trabajadores alter column patron_user_id set not null;

commit;

notify pgrst, 'reload schema';
