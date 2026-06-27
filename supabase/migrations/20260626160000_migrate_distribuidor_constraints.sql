-- Distribuidor: PK/UNIQUE clerk_id → user_id
-- Tablas con columna user_id ya presente.
-- Backfill de filas huérfanas antes de cada ADD CONSTRAINT.

begin;

-- UUID de prueba / fallback cuando user_id IS NULL
-- cd459e32-718d-46da-9003-5b002c483cfd

-- =============================================================================
-- proof_profiles: UNIQUE (clerk_id, profile_type_v2) → (user_id, profile_type_v2)
-- =============================================================================
update public.proof_profiles
set user_id = 'cd459e32-718d-46da-9003-5b002c483cfd'::uuid
where user_id is null;

do $assert$
begin
  if exists (select 1 from public.proof_profiles where user_id is null) then
    raise exception 'migrate_distribuidor_constraints: proof_profiles tiene filas con user_id null';
  end if;
end;
$assert$;

alter table public.proof_profiles
  drop constraint if exists profiles_clerk_profile_unique;

alter table public.proof_profiles
  add constraint profiles_user_profile_unique
  unique (user_id, profile_type_v2);

-- =============================================================================
-- proof_sequences: PK (clerk_id, profile_type_v2) → (user_id, profile_type_v2)
-- =============================================================================
update public.proof_sequences
set user_id = 'cd459e32-718d-46da-9003-5b002c483cfd'::uuid
where user_id is null;

do $assert$
begin
  if exists (select 1 from public.proof_sequences where user_id is null) then
    raise exception 'migrate_distribuidor_constraints: proof_sequences tiene filas con user_id null';
  end if;
end;
$assert$;

alter table public.proof_sequences
  drop constraint if exists proof_sequences_pkey;

alter table public.proof_sequences
  add constraint proof_sequences_pkey
  primary key (user_id, profile_type_v2);

-- =============================================================================
-- skus: UNIQUE (clerk_id, profile_type_v2, codigo) → (user_id, profile_type_v2, codigo)
-- =============================================================================
update public.skus
set user_id = 'cd459e32-718d-46da-9003-5b002c483cfd'::uuid
where user_id is null;

do $assert$
begin
  if exists (select 1 from public.skus where user_id is null) then
    raise exception 'migrate_distribuidor_constraints: skus tiene filas con user_id null';
  end if;
end;
$assert$;

alter table public.skus
  drop constraint if exists skus_clerk_id_profile_type_v2_codigo_key;

alter table public.skus
  add constraint skus_user_id_profile_type_v2_codigo_key
  unique (user_id, profile_type_v2, codigo);

-- =============================================================================
-- pedidos: UNIQUE (clerk_id, profile_type_v2, numero) → (user_id, profile_type_v2, numero)
-- =============================================================================
update public.pedidos
set user_id = 'cd459e32-718d-46da-9003-5b002c483cfd'::uuid
where user_id is null;

do $assert$
begin
  if exists (select 1 from public.pedidos where user_id is null) then
    raise exception 'migrate_distribuidor_constraints: pedidos tiene filas con user_id null';
  end if;
end;
$assert$;

alter table public.pedidos
  drop constraint if exists pedidos_clerk_id_profile_type_v2_numero_key;

alter table public.pedidos
  add constraint pedidos_user_id_profile_type_v2_numero_key
  unique (user_id, profile_type_v2, numero);

-- =============================================================================
-- recepciones: UNIQUE (clerk_id, profile_type_v2, codigo) → (user_id, profile_type_v2, codigo)
-- =============================================================================
update public.recepciones
set user_id = 'cd459e32-718d-46da-9003-5b002c483cfd'::uuid
where user_id is null;

do $assert$
begin
  if exists (select 1 from public.recepciones where user_id is null) then
    raise exception 'migrate_distribuidor_constraints: recepciones tiene filas con user_id null';
  end if;
end;
$assert$;

alter table public.recepciones
  drop constraint if exists recepciones_clerk_id_profile_type_v2_codigo_key;

alter table public.recepciones
  add constraint recepciones_user_id_profile_type_v2_codigo_key
  unique (user_id, profile_type_v2, codigo);

-- =============================================================================
-- cuentas_clientes: UNIQUE (clerk_id, profile_type_v2, cliente_id)
--   → (user_id, profile_type_v2, cliente_id)
-- =============================================================================
update public.cuentas_clientes
set user_id = 'cd459e32-718d-46da-9003-5b002c483cfd'::uuid
where user_id is null;

do $assert$
begin
  if exists (select 1 from public.cuentas_clientes where user_id is null) then
    raise exception 'migrate_distribuidor_constraints: cuentas_clientes tiene filas con user_id null';
  end if;
end;
$assert$;

alter table public.cuentas_clientes
  drop constraint if exists cuentas_clientes_clerk_id_profile_type_v2_cliente_id_key;

alter table public.cuentas_clientes
  add constraint cuentas_clientes_user_id_profile_type_v2_cliente_id_key
  unique (user_id, profile_type_v2, cliente_id);

-- =============================================================================
-- ordenes_compra_distribuidor: UNIQUE (clerk_id, profile_type_v2, numero_orden)
--   → (user_id, profile_type_v2, numero_orden)
-- =============================================================================
update public.ordenes_compra_distribuidor
set user_id = 'cd459e32-718d-46da-9003-5b002c483cfd'::uuid
where user_id is null;

do $assert$
begin
  if exists (select 1 from public.ordenes_compra_distribuidor where user_id is null) then
    raise exception 'migrate_distribuidor_constraints: ordenes_compra_distribuidor tiene filas con user_id null';
  end if;
end;
$assert$;

alter table public.ordenes_compra_distribuidor
  drop constraint if exists ordenes_compra_distribuidor_clerk_id_profile_type_v2_numero_key;

alter table public.ordenes_compra_distribuidor
  add constraint ordenes_compra_distribuidor_user_id_profile_type_v2_numero_key
  unique (user_id, profile_type_v2, numero_orden);

-- =============================================================================
-- remisiones_distribuidor: UNIQUE (clerk_id, profile_type_v2, numero_remision)
--   → (user_id, profile_type_v2, numero_remision)
-- =============================================================================
update public.remisiones_distribuidor
set user_id = 'cd459e32-718d-46da-9003-5b002c483cfd'::uuid
where user_id is null;

do $assert$
begin
  if exists (select 1 from public.remisiones_distribuidor where user_id is null) then
    raise exception 'migrate_distribuidor_constraints: remisiones_distribuidor tiene filas con user_id null';
  end if;
end;
$assert$;

alter table public.remisiones_distribuidor
  drop constraint if exists remisiones_distribuidor_clerk_id_profile_type_v2_numero_rem_key;

alter table public.remisiones_distribuidor
  add constraint remisiones_distribuidor_user_id_profile_type_v2_numero_rem_key
  unique (user_id, profile_type_v2, numero_remision);

commit;

notify pgrst, 'reload schema';
