-- Reemplaza skus legacy (Prisma: organization_id) por tabla PROOF (clerk_id + profile_type_v2).
-- Causa del error en app: "column skus.clerk_id does not exist" cuando CREATE TABLE IF NOT EXISTS
-- no creó la tabla PROOF porque ya existía skus legacy (vacía).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'skus'
      and column_name = 'organization_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'skus'
      and column_name = 'clerk_id'
  ) then
    alter table public.skus rename to skus_legacy_prisma;
    raise notice 'Renombrada public.skus → skus_legacy_prisma';
  end if;
end $$;

-- Enums PROOF distribuidor (idempotente)
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

create table if not exists public.proof_sequences (
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  sku_seq integer not null default 0,
  pedido_seq integer not null default 0,
  recepcion_seq integer not null default 0,
  primary key (clerk_id, profile_type_v2)
);

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

  dist_product_id uuid,

  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (clerk_id, profile_type_v2, codigo)
);

alter table public.skus
  add column if not exists origen text not null default 'local',
  add column if not exists tipo_unidad text not null default 'botella',
  add column if not exists precio_mayoreo numeric(12, 2) not null default 0,
  add column if not exists precio_especial numeric(12, 2) not null default 0,
  add column if not exists moneda text not null default 'MXN',
  add column if not exists notas text,
  add column if not exists imagen_url text;

create index if not exists skus_scope_idx on public.skus (clerk_id, profile_type_v2);
create index if not exists skus_estado_idx on public.skus (estado);
create index if not exists skus_dist_product_id_idx on public.skus (dist_product_id)
  where dist_product_id is not null;

-- FK a dist_products solo si la tabla legacy existe
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'dist_products'
  ) then
    alter table public.skus drop constraint if exists skus_dist_product_id_fkey;
    alter table public.skus
      add constraint skus_dist_product_id_fkey
      foreign key (dist_product_id) references public.dist_products(id) on delete set null;
  end if;
end $$;

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
  else
    raise exception 'kind inválido: %', p_kind;
  end if;

  return v_prefix || '-' || lpad(v_next::text, 3, '0');
end;
$$;

create or replace function proof.sync_all_skus_for_scope(
  p_clerk_id text,
  p_profile_type_v2 text default 'distributor'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'dist_products'
  ) then
    return 0;
  end if;

  for r in
    select id from public.dist_products
    where clerk_id = p_clerk_id
      and profile_type_v2 = p_profile_type_v2
  loop
    perform proof.sync_sku_from_dist_product(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.sync_all_skus_for_scope(
  p_clerk_id text,
  p_profile_type_v2 text default 'distributor'
)
returns integer
language sql
security definer
set search_path = public, proof
as $$ select proof.sync_all_skus_for_scope(p_clerk_id, p_profile_type_v2); $$;

create or replace function public.proof_next_codigo(
  p_clerk_id text,
  p_profile_type_v2 text,
  p_kind text
)
returns text
language sql
security definer
set search_path = public, proof
as $$ select proof.next_codigo(p_clerk_id, p_profile_type_v2, p_kind); $$;

grant execute on function proof.next_codigo(text, text, text) to authenticated, service_role;
grant execute on function proof.sync_all_skus_for_scope(text, text) to authenticated, service_role;
grant execute on function public.sync_all_skus_for_scope(text, text) to authenticated, service_role;
grant execute on function public.proof_next_codigo(text, text, text) to authenticated, service_role;

alter table public.skus enable row level security;
alter table public.proof_sequences enable row level security;

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

drop policy if exists proof_sequences_select on public.proof_sequences;
create policy proof_sequences_select on public.proof_sequences for select
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists proof_sequences_all on public.proof_sequences;
create policy proof_sequences_all on public.proof_sequences for all
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.skus';
  end if;
exception
  when duplicate_object then null;
  when others then
    raise notice 'realtime skus: %', sqlerrm;
end $$;

-- Data API: RLS exige además GRANT explícito al rol authenticated
grant select, insert, update, delete on public.skus to authenticated, service_role;
grant select, insert, update, delete on public.proof_sequences to authenticated, service_role;

grant usage on type public.categoria_sku to authenticated, service_role;
grant usage on type public.estado_sku to authenticated, service_role;
grant usage on type public.rotacion_30d to authenticated, service_role;

grant usage on schema proof to authenticated, service_role;

notify pgrst, 'reload schema';
