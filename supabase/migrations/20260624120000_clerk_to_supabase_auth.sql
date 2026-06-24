-- Clerk → Supabase Auth (fase 1)
-- Agrega user_id, migra RLS a auth.uid(), preserva clerk_id para rollback.
-- No backfill de datos · una sola transacción.

begin;

-- -----------------------------------------------------------------------------
-- 1. Tabla legacy de perfiles Clerk
-- -----------------------------------------------------------------------------
alter table if exists public.profiles rename to profiles_clerk_legacy;

-- Quitar RLS Clerk en legacy (dependía de proof.current_clerk_id)
do $drop_legacy_profile_policies$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles_clerk_legacy'
  loop
    execute format(
      'drop policy if exists %I on public.profiles_clerk_legacy',
      pol.policyname
    );
  end loop;
end;
$drop_legacy_profile_policies$;

-- -----------------------------------------------------------------------------
-- 2. user_id en las 22 tablas raíz
-- -----------------------------------------------------------------------------
do $add_user_id$
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
      'alter table public.%I add column if not exists user_id uuid references auth.users (id) on delete cascade',
      tbl
    );
    execute format(
      'create index if not exists %I_user_id_idx on public.%I (user_id)',
      tbl, tbl
    );
  end loop;
end;
$add_user_id$;

-- -----------------------------------------------------------------------------
-- 3. Helper de acceso (auth.uid(), sin JWT Clerk)
-- -----------------------------------------------------------------------------
create or replace function proof.auth_has_staff_access_to_scope(
  p_clerk_id text,
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
      and t.clerk_id = p_clerk_id
      and t.profile_type_v2 = p_profile_type_v2
      and t.activo = true
  );
$$;

grant execute on function proof.auth_has_staff_access_to_scope(text, text)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. RLS · DROP políticas existentes (antes de eliminar funciones Clerk)
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
-- 5. Eliminar helpers que leen JWT de Clerk
-- CASCADE: elimina políticas RLS/storage destilador/winemaker que aún los usan
-- -----------------------------------------------------------------------------
drop function if exists proof.row_belongs_to_requester(text, text) cascade;
drop function if exists proof.is_super_user(text) cascade;
drop function if exists proof.requester_es_patron_scope(text, text) cascade;
drop function if exists proof.requester_es_trabajador_activo_scope(text, text) cascade;
drop function if exists proof.requester_es_patron_o_manager_scope(text, text) cascade;
drop function if exists proof.destilador_row_owned(text) cascade;
drop function if exists proof.winemaker_row_owned(text) cascade;
drop function if exists proof.current_clerk_id() cascade;
drop function if exists proof.current_profile_type_v2() cascade;

-- -----------------------------------------------------------------------------
-- 6. RLS · 22 tablas raíz (recrear con user_id = auth.uid())
-- -----------------------------------------------------------------------------

-- skus
create policy skus_select on public.skus for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy skus_insert on public.skus for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy skus_update on public.skus for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy skus_delete on public.skus for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- pedidos
create policy pedidos_select on public.pedidos for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy pedidos_insert on public.pedidos for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy pedidos_update on public.pedidos for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy pedidos_delete on public.pedidos for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- recepciones
create policy recepciones_all on public.recepciones for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- proof_sequences
create policy proof_sequences_select on public.proof_sequences for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy proof_sequences_all on public.proof_sequences for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- deudas_productores
create policy deudas_productores_all on public.deudas_productores for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- cuentas_clientes
create policy cuentas_clientes_all on public.cuentas_clientes for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- cuentas_por_pagar
create policy cuentas_por_pagar_select on public.cuentas_por_pagar for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy cuentas_por_pagar_insert on public.cuentas_por_pagar for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy cuentas_por_pagar_update on public.cuentas_por_pagar for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- cuentas_por_cobrar
create policy cuentas_por_cobrar_select on public.cuentas_por_cobrar for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy cuentas_por_cobrar_insert on public.cuentas_por_cobrar for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy cuentas_por_cobrar_update on public.cuentas_por_cobrar for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- pagos
create policy pagos_select on public.pagos for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy pagos_insert on public.pagos for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy pagos_update on public.pagos for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- pagos_proveedor
create policy pagos_proveedor_select on public.pagos_proveedor for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy pagos_proveedor_insert on public.pagos_proveedor for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- pagos_cliente
create policy pagos_cliente_select on public.pagos_cliente for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy pagos_cliente_insert on public.pagos_cliente for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- movimientos_stock (SELECT + INSERT, inmutable)
create policy movimientos_stock_select on public.movimientos_stock for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy movimientos_stock_insert on public.movimientos_stock for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- clientes
create policy clientes_select on public.clientes for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy clientes_insert on public.clientes for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy clientes_update on public.clientes for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- clients (sin RLS previo)
alter table public.clients enable row level security;

create policy clients_select on public.clients for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy clients_insert on public.clients for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy clients_update on public.clients for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy clients_delete on public.clients for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- client_etiquetas
create policy client_etiquetas_all on public.client_etiquetas for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
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
        and trabajadores.clerk_id = patron.clerk_id
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
        and trabajadores.clerk_id = patron.clerk_id
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
        and trabajadores.clerk_id = patron.clerk_id
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
        and trabajadores.clerk_id = patron.clerk_id
        and trabajadores.profile_type_v2 = patron.profile_type_v2
    )
  );

-- cajas_distribuidor
create policy cajas_distribuidor_select on public.cajas_distribuidor for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy cajas_distribuidor_insert on public.cajas_distribuidor for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy cajas_distribuidor_update on public.cajas_distribuidor for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- ordenes_compra
create policy ordenes_compra_scope on public.ordenes_compra for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- ordenes_compra_distribuidor
create policy ordenes_compra_dist_select on public.ordenes_compra_distribuidor for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy ordenes_compra_dist_insert on public.ordenes_compra_distribuidor for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy ordenes_compra_dist_update on public.ordenes_compra_distribuidor for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );
create policy ordenes_compra_dist_delete on public.ordenes_compra_distribuidor for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

-- remisiones_distribuidor
create policy remisiones_distribuidor_all on public.remisiones_distribuidor for all
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
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
        or proof.auth_has_staff_access_to_scope(p.clerk_id, p.profile_type_v2)
      )
  ))
  with check (exists (
    select 1
    from public.pedidos p
    where p.id = items_pedido.pedido_id
      and (
        p.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(p.clerk_id, p.profile_type_v2)
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
        or proof.auth_has_staff_access_to_scope(r.clerk_id, r.profile_type_v2)
      )
  ))
  with check (exists (
    select 1
    from public.recepciones r
    where r.id = items_recepcion.recepcion_id
      and (
        r.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(r.clerk_id, r.profile_type_v2)
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
        or proof.auth_has_staff_access_to_scope(r.clerk_id, r.profile_type_v2)
      )
  ))
  with check (exists (
    select 1
    from public.recepciones r
    where r.id = discrepancias.recepcion_id
      and (
        r.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(r.clerk_id, r.profile_type_v2)
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
        or proof.auth_has_staff_access_to_scope(oc.clerk_id, oc.profile_type_v2)
      )
  ))
  with check (exists (
    select 1
    from public.ordenes_compra oc
    where oc.id = items_orden_compra.orden_compra_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.clerk_id, oc.profile_type_v2)
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
        or proof.auth_has_staff_access_to_scope(oc.clerk_id, oc.profile_type_v2)
      )
  ));
create policy items_orden_compra_dist_insert on public.items_orden_compra_distribuidor for insert
  with check (exists (
    select 1
    from public.ordenes_compra_distribuidor oc
    where oc.id = items_orden_compra_distribuidor.orden_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.clerk_id, oc.profile_type_v2)
      )
  ));
create policy items_orden_compra_dist_update on public.items_orden_compra_distribuidor for update
  using (exists (
    select 1
    from public.ordenes_compra_distribuidor oc
    where oc.id = items_orden_compra_distribuidor.orden_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.clerk_id, oc.profile_type_v2)
      )
  ))
  with check (exists (
    select 1
    from public.ordenes_compra_distribuidor oc
    where oc.id = items_orden_compra_distribuidor.orden_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.clerk_id, oc.profile_type_v2)
      )
  ));
create policy items_orden_compra_dist_delete on public.items_orden_compra_distribuidor for delete
  using (exists (
    select 1
    from public.ordenes_compra_distribuidor oc
    where oc.id = items_orden_compra_distribuidor.orden_id
      and (
        oc.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(oc.clerk_id, oc.profile_type_v2)
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
        or proof.auth_has_staff_access_to_scope(p.clerk_id, p.profile_type_v2)
      )
  ));
create policy pagos_pedidos_insert on public.pagos_pedidos for insert
  with check (exists (
    select 1
    from public.pagos p
    where p.id = pagos_pedidos.pago_id
      and (
        p.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(p.clerk_id, p.profile_type_v2)
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
        or proof.auth_has_staff_access_to_scope(c.clerk_id, c.profile_type_v2)
      )
  ));
create policy eventos_caja_insert on public.eventos_caja for insert
  with check (exists (
    select 1
    from public.cajas_distribuidor c
    where c.id = eventos_caja.caja_id
      and (
        c.user_id = auth.uid()
        or proof.auth_has_staff_access_to_scope(c.clerk_id, c.profile_type_v2)
      )
  ));

commit;

notify pgrst, 'reload schema';
