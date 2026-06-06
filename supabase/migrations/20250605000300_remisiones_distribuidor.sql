-- =============================================================================
-- PROOF · Distribuidor — remisiones de salida (pedido entregado)
-- Aditivo · idempotente
-- =============================================================================

alter table public.proof_sequences
  add column if not exists rem_seq integer not null default 0;

-- next_codigo: kind 'rem' → REM-001
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
  elsif p_kind = 'oc' then
    update public.proof_sequences
    set oc_seq = oc_seq + 1
    where clerk_id = p_clerk_id and profile_type_v2 = p_profile_type_v2
    returning oc_seq into v_next;
    v_prefix := 'OC';
  elsif p_kind = 'rem' then
    update public.proof_sequences
    set rem_seq = rem_seq + 1
    where clerk_id = p_clerk_id and profile_type_v2 = p_profile_type_v2
    returning rem_seq into v_next;
    v_prefix := 'REM';
  else
    raise exception 'kind inválido: %', p_kind;
  end if;

  return v_prefix || '-' || lpad(v_next::text, 3, '0');
end;
$$;

create table if not exists public.remisiones_distribuidor (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  pedido_id uuid not null references public.pedidos(id) on delete restrict,
  numero_remision text not null,
  fecha_entrega date not null,
  pdf_url text,
  created_at timestamptz not null default now(),
  unique (pedido_id),
  unique (clerk_id, profile_type_v2, numero_remision)
);

create index if not exists remisiones_distribuidor_scope_idx
  on public.remisiones_distribuidor (clerk_id, profile_type_v2);

create index if not exists remisiones_distribuidor_pedido_idx
  on public.remisiones_distribuidor (pedido_id);

-- Crea remisión al entregar (idempotente por pedido)
create or replace function proof.crear_remision_distribuidor(p_pedido_id uuid)
returns public.remisiones_distribuidor
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_existing public.remisiones_distribuidor%rowtype;
  v_numero text;
  v_row public.remisiones_distribuidor%rowtype;
begin
  select * into v_existing
  from public.remisiones_distribuidor
  where pedido_id = p_pedido_id;

  if found then
    return v_existing;
  end if;

  select * into v_pedido from public.pedidos where id = p_pedido_id;
  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_pedido.estado not in ('entregado', 'parcial') then
    raise exception 'Solo pedidos entregados generan remisión (actual: %)', v_pedido.estado;
  end if;

  v_numero := proof.next_codigo(v_pedido.clerk_id, v_pedido.profile_type_v2, 'rem');

  insert into public.remisiones_distribuidor (
    clerk_id,
    profile_type_v2,
    pedido_id,
    numero_remision,
    fecha_entrega
  )
  values (
    v_pedido.clerk_id,
    v_pedido.profile_type_v2,
    v_pedido.id,
    v_numero,
    v_pedido.fecha_entrega
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.crear_remision_distribuidor(p_pedido_id uuid)
returns public.remisiones_distribuidor
language sql
security definer
set search_path = public, proof
as $$
  select proof.crear_remision_distribuidor(p_pedido_id);
$$;

-- entregar_pedido: crear remisión al marcar entregado (no parcial)
create or replace function proof.entregar_pedido(p_pedido_id uuid, p_parcial boolean default false)
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
  if not found then raise exception 'Pedido no encontrado: %', p_pedido_id; end if;
  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;
  if v_pedido.estado not in ('confirmado', 'preparando', 'en_ruta', 'parcial') then
    raise exception 'Estado inválido para entrega: %', v_pedido.estado;
  end if;
  v_nuevo_estado := case when p_parcial then 'parcial'::public.estado_pedido else 'entregado'::public.estado_pedido end;
  perform set_config('proof.allow_stock_reservado_mutation', '1', true);
  for v_item in select ip.sku_id, ip.cantidad from public.items_pedido ip where ip.pedido_id = p_pedido_id loop
    update public.skus s
    set
      stock_total = greatest(0, s.stock_total - v_item.cantidad),
      stock_reservado = greatest(0, s.stock_reservado - v_item.cantidad)
    where s.id = v_item.sku_id;
  end loop;
  update public.pedidos set estado = v_nuevo_estado, updated_at = now() where id = p_pedido_id returning * into v_pedido;

  if v_nuevo_estado = 'entregado' then
    perform proof.crear_remision_distribuidor(p_pedido_id);
  end if;

  return v_pedido;
end;
$$;

create or replace function public.entregar_pedido(p_pedido_id uuid, p_parcial boolean default false)
returns public.pedidos
language sql
security definer
set search_path = public, proof
as $$
  select proof.entregar_pedido(p_pedido_id, p_parcial);
$$;

-- Storage bucket remisiones (privado)
insert into storage.buckets (id, name, public)
values ('remisiones', 'remisiones', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'remisiones_owner_select'
  ) then
    create policy remisiones_owner_select on storage.objects
      for select to authenticated
      using (
        bucket_id = 'remisiones'
        and (storage.foldername(name))[1] = proof.current_clerk_id()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'remisiones_owner_insert'
  ) then
    create policy remisiones_owner_insert on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'remisiones'
        and (storage.foldername(name))[1] = proof.current_clerk_id()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'remisiones_owner_update'
  ) then
    create policy remisiones_owner_update on storage.objects
      for update to authenticated
      using (
        bucket_id = 'remisiones'
        and (storage.foldername(name))[1] = proof.current_clerk_id()
      )
      with check (
        bucket_id = 'remisiones'
        and (storage.foldername(name))[1] = proof.current_clerk_id()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'remisiones_owner_delete'
  ) then
    create policy remisiones_owner_delete on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'remisiones'
        and (storage.foldername(name))[1] = proof.current_clerk_id()
      );
  end if;
end $$;

alter table public.remisiones_distribuidor enable row level security;

drop policy if exists remisiones_distribuidor_all on public.remisiones_distribuidor;
create policy remisiones_distribuidor_all on public.remisiones_distribuidor for all
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

grant select, insert, update, delete on public.remisiones_distribuidor to authenticated, service_role;
grant execute on function proof.crear_remision_distribuidor(uuid) to authenticated, service_role;
grant execute on function public.crear_remision_distribuidor(uuid) to authenticated, service_role;
grant execute on function proof.entregar_pedido(uuid, boolean) to authenticated, service_role;
grant execute on function public.entregar_pedido(uuid, boolean) to authenticated, service_role;
