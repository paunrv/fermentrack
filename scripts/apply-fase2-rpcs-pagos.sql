-- FASE 2 · Bundle 2 — pagos + storage + next_codigo (Clerk auth → Supabase Auth)
-- Project: stjnoacbdcjhhucaoqrw · Run ONCE in Supabase SQL Editor
-- Prereq: scripts/apply-fase2-rpcs-core.sql (B1) applied
-- Verify after: npm run check:fase2-rpcs

begin;

-- -----------------------------------------------------------------------------
-- Storage · resolver carpeta raíz (clerk_id legacy) → user_id del scope
-- -----------------------------------------------------------------------------
create or replace function proof.scope_user_id_from_clerk_folder(p_folder text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select t.user_id
      from public.trabajadores t
      where t.rol = 'patron'
        and t.profile_type_v2 = 'distributor'
        and t.clerk_id = p_folder
      limit 1
    ),
    (
      select t.user_id
      from public.trabajadores t
      where t.rol = 'patron'
        and t.clerk_user_id = p_folder
      limit 1
    ),
    (
      select p.user_id
      from public.pedidos p
      where p.clerk_id = p_folder
      limit 1
    ),
    (
      select s.user_id
      from public.skus s
      where s.clerk_id = p_folder
      limit 1
    ),
    case
      when p_folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then p_folder::uuid
      else null
    end
  );
$$;

grant execute on function proof.scope_user_id_from_clerk_folder(text)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Pagos · CxC / CxP
-- -----------------------------------------------------------------------------

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

  if not proof.auth_can_access_scope(v_cuenta.user_id, v_cuenta.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_cuenta.estado = 'pagada' then
    raise exception 'La cuenta de % ya está pagada', v_cuenta.cliente_nombre;
  end if;

  v_pago := least(p_monto, v_cuenta.monto_total - v_cuenta.monto_pagado);

  insert into public.pagos_cliente (
    user_id,
    clerk_id,
    profile_type_v2,
    cuenta_por_cobrar_id,
    monto,
    metodo,
    referencia,
    nota,
    fecha_pago
  )
  values (
    v_cuenta.user_id,
    coalesce(v_cuenta.clerk_id, v_cuenta.user_id::text),
    v_cuenta.profile_type_v2,
    p_cuenta_id,
    v_pago,
    coalesce(p_metodo, 'transferencia'::public.metodo_pago_cliente),
    p_referencia,
    p_nota,
    current_date
  );

  update public.cuentas_por_cobrar
  set monto_pagado = monto_pagado + v_pago
  where id = p_cuenta_id
  returning * into v_cuenta;

  return v_cuenta;
end;
$$;

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

  if not proof.auth_can_access_scope(v_cuenta.user_id, v_cuenta.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_cuenta.estado = 'pagada' then
    raise exception 'La cuenta con % ya está pagada', v_cuenta.proveedor_nombre;
  end if;

  v_pago := least(p_monto, v_cuenta.monto_total - v_cuenta.monto_pagado);

  insert into public.pagos_proveedor (
    user_id,
    clerk_id,
    profile_type_v2,
    cuenta_por_pagar_id,
    monto,
    metodo,
    referencia,
    nota,
    fecha_pago
  )
  values (
    v_cuenta.user_id,
    coalesce(v_cuenta.clerk_id, v_cuenta.user_id::text),
    v_cuenta.profile_type_v2,
    p_cuenta_id,
    v_pago,
    coalesce(p_metodo, 'transferencia'::public.metodo_pago_proveedor),
    p_referencia,
    p_nota,
    current_date
  );

  update public.cuentas_por_pagar
  set monto_pagado = monto_pagado + v_pago
  where id = p_cuenta_id
  returning * into v_cuenta;

  return v_cuenta;
end;
$$;

-- -----------------------------------------------------------------------------
-- Storage · product-images (skus/{uuid}/...)
-- -----------------------------------------------------------------------------

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
      and proof.auth_can_access_scope(s.user_id, s.profile_type_v2)
  );
$$;

-- -----------------------------------------------------------------------------
-- Storage · buckets distribuidor ({clerk_id}/...)
-- -----------------------------------------------------------------------------

create or replace function proof.storage_distribuidor_path_select(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, proof
as $$
  select
    coalesce(proof.storage_distribuidor_folder(object_name), '') <> ''
    and proof.auth_can_access_scope(
      proof.scope_user_id_from_clerk_folder(proof.storage_distribuidor_folder(object_name)),
      'distributor'
    );
$$;

create or replace function proof.storage_distribuidor_path_insert_patron(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, proof
as $$
  select
    coalesce(proof.storage_distribuidor_folder(object_name), '') <> ''
    and proof.auth_can_access_scope(
      proof.scope_user_id_from_clerk_folder(proof.storage_distribuidor_folder(object_name)),
      'distributor'
    );
$$;

create or replace function proof.storage_distribuidor_path_insert_bodega(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, proof
as $$
  select
    coalesce(proof.storage_distribuidor_folder(object_name), '') <> ''
    and (
      proof.auth_can_access_scope(
        proof.scope_user_id_from_clerk_folder(proof.storage_distribuidor_folder(object_name)),
        'distributor'
      )
      or exists (
        select 1
        from public.trabajadores t
        where t.user_id = auth.uid()
          and t.clerk_id = proof.storage_distribuidor_folder(object_name)
          and t.profile_type_v2 = 'distributor'
          and t.rol = 'bodega'
          and t.activo = true
      )
    );
$$;

-- -----------------------------------------------------------------------------
-- next_codigo · resolver clave legacy en proof_sequences
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
  v_scope_key text;
begin
  select coalesce(
    (
      select ps.clerk_id
      from public.proof_sequences ps
      where ps.clerk_id = p_clerk_id
        and ps.profile_type_v2 = p_profile_type_v2
    ),
    (
      select t.clerk_id
      from public.trabajadores t
      where t.rol = 'patron'
        and t.profile_type_v2 = p_profile_type_v2
        and (
          t.clerk_id = p_clerk_id
          or t.clerk_user_id = p_clerk_id
          or t.user_id::text = p_clerk_id
        )
      limit 1
    ),
    p_clerk_id
  ) into v_scope_key;

  insert into public.proof_sequences (clerk_id, profile_type_v2)
  values (v_scope_key, p_profile_type_v2)
  on conflict (clerk_id, profile_type_v2) do nothing;

  if p_kind = 'sku' then
    update public.proof_sequences
    set sku_seq = sku_seq + 1
    where clerk_id = v_scope_key and profile_type_v2 = p_profile_type_v2
    returning sku_seq into v_next;
    v_prefix := 'SKU';
  elsif p_kind = 'pedido' then
    update public.proof_sequences
    set pedido_seq = pedido_seq + 1
    where clerk_id = v_scope_key and profile_type_v2 = p_profile_type_v2
    returning pedido_seq into v_next;
    v_prefix := 'PED';
  elsif p_kind = 'recepcion' then
    update public.proof_sequences
    set recepcion_seq = recepcion_seq + 1
    where clerk_id = v_scope_key and profile_type_v2 = p_profile_type_v2
    returning recepcion_seq into v_next;
    v_prefix := 'REC';
  elsif p_kind = 'oc' then
    update public.proof_sequences
    set oc_seq = oc_seq + 1
    where clerk_id = v_scope_key and profile_type_v2 = p_profile_type_v2
    returning oc_seq into v_next;
    v_prefix := 'OC';
  elsif p_kind = 'rem' then
    update public.proof_sequences
    set rem_seq = rem_seq + 1
    where clerk_id = v_scope_key and profile_type_v2 = p_profile_type_v2
    returning rem_seq into v_next;
    v_prefix := 'REM';
  else
    raise exception 'kind inválido: %', p_kind;
  end if;

  return v_prefix || '-' || lpad(v_next::text, 3, '0');
end;
$$;

-- -----------------------------------------------------------------------------
-- public wrappers
-- -----------------------------------------------------------------------------

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
set search_path = public, proof
as $$
  select proof.registrar_pago_cliente(
    p_cuenta_id, p_monto, p_metodo, p_referencia, p_nota
  );
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
set search_path = public, proof
as $$
  select proof.registrar_pago_proveedor(
    p_cuenta_id, p_monto, p_metodo, p_referencia, p_nota
  );
$$;

grant execute on function proof.scope_user_id_from_clerk_folder(text) to authenticated, service_role;
grant execute on function proof.registrar_pago_cliente(uuid, numeric, public.metodo_pago_cliente, text, text)
  to authenticated, service_role;
grant execute on function proof.registrar_pago_proveedor(uuid, numeric, public.metodo_pago_proveedor, text, text)
  to authenticated, service_role;
grant execute on function proof.sku_image_path_owned(text) to authenticated, service_role;
grant execute on function proof.storage_distribuidor_path_select(text) to authenticated, service_role;
grant execute on function proof.storage_distribuidor_path_insert_patron(text) to authenticated, service_role;
grant execute on function proof.storage_distribuidor_path_insert_bodega(text) to authenticated, service_role;
grant execute on function proof.next_codigo(text, text, text) to authenticated, service_role;

grant execute on function public.registrar_pago_cliente(uuid, numeric, public.metodo_pago_cliente, text, text)
  to authenticated, service_role;
grant execute on function public.registrar_pago_proveedor(uuid, numeric, public.metodo_pago_proveedor, text, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
