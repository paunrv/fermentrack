-- M2 + M3 · Ledger movimientos_sku + RPC registrar_movimiento_sku
-- Project: stjnoacbdcjhhucaoqrw · Run ONCE in Supabase SQL Editor
-- Requires M1 (skus.origen), skus.user_id (Clerk→Supabase auth), proof.refresh_sku_estado, public.clients
-- Prod uses auth.uid() RLS (NOT proof.row_belongs_to_requester — dropped in 20260624120000)
-- Verify after: npm run check:dist-schema

begin;

-- M2 · Ledger PROOF de movimientos por SKU (botellas)

create table if not exists public.movimientos_sku (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.skus(id) on delete restrict,
  tipo text not null check (tipo in ('entrada', 'venta', 'donacion', 'merma', 'muestra')),
  cantidad integer not null check (cantidad > 0),
  fecha date not null default current_date,
  notas text,
  client_id uuid references public.clients(id) on delete set null,
  recipient text,
  reason text,
  event text,
  precio_unitario numeric(12, 2),
  total numeric(12, 2),
  moneda text,
  dist_movement_id uuid unique,
  user_id uuid references auth.users(id) on delete cascade,
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  created_at timestamptz not null default now()
);

-- If table existed from a failed run (without user_id)
alter table public.movimientos_sku
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists movimientos_sku_sku_created_idx
  on public.movimientos_sku (sku_id, created_at desc);

create index if not exists movimientos_sku_scope_fecha_idx
  on public.movimientos_sku (clerk_id, profile_type_v2, fecha desc);

create index if not exists movimientos_sku_user_id_idx
  on public.movimientos_sku (user_id);

create index if not exists movimientos_sku_client_id_idx
  on public.movimientos_sku (client_id)
  where client_id is not null;

create index if not exists movimientos_sku_dist_movement_id_idx
  on public.movimientos_sku (dist_movement_id)
  where dist_movement_id is not null;

alter table public.movimientos_sku enable row level security;

drop policy if exists movimientos_sku_select on public.movimientos_sku;
create policy movimientos_sku_select on public.movimientos_sku
  for select
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

drop policy if exists movimientos_sku_insert on public.movimientos_sku;
create policy movimientos_sku_insert on public.movimientos_sku
  for insert
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

drop policy if exists movimientos_sku_update on public.movimientos_sku;
create policy movimientos_sku_update on public.movimientos_sku
  for update
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

drop policy if exists movimientos_sku_delete on public.movimientos_sku;
create policy movimientos_sku_delete on public.movimientos_sku
  for delete
  using (
    user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

grant select, insert, update, delete on public.movimientos_sku to authenticated;

-- M3 · RPC registrar movimiento SKU (stock + ledger atómico)

drop function if exists proof.registrar_movimiento_sku(uuid, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid);
drop function if exists proof.registrar_movimiento_sku(text, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid);
drop function if exists public.registrar_movimiento_sku(uuid, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid);
drop function if exists public.registrar_movimiento_sku(text, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid);
drop function if exists public.registrar_movimiento_sku(uuid, uuid, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid);

create or replace function public.registrar_movimiento_sku(
  p_sku_id uuid,
  p_tipo text,
  p_cantidad integer,
  p_fecha date default current_date,
  p_notas text default null,
  p_client_id uuid default null,
  p_recipient text default null,
  p_reason text default null,
  p_event text default null,
  p_precio_unitario numeric default null,
  p_total numeric default null,
  p_moneda text default null,
  p_dist_movement_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, proof
as $func$
declare
  v_sku public.skus%rowtype;
  v_disponible integer;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'cantidad debe ser > 0';
  end if;

  if p_tipo not in ('entrada', 'venta', 'donacion', 'merma', 'muestra') then
    raise exception 'tipo inválido: %', p_tipo;
  end if;

  select * into v_sku from public.skus where id = p_sku_id for update;
  if not found then
    raise exception 'SKU no encontrado: %', p_sku_id;
  end if;

  if not (
    v_sku.user_id = auth.uid()
    or proof.auth_has_staff_access_to_scope(v_sku.clerk_id, v_sku.profile_type_v2)
  ) then
    raise exception 'No autorizado';
  end if;

  v_disponible := v_sku.stock_total - v_sku.stock_reservado;

  if p_tipo <> 'entrada' and p_cantidad > v_disponible then
    raise exception 'Stock insuficiente: disponible %, solicitado %', v_disponible, p_cantidad;
  end if;

  if p_dist_movement_id is not null then
    if exists (
      select 1 from public.movimientos_sku m where m.dist_movement_id = p_dist_movement_id
    ) then
      raise exception 'dist_movement_id ya registrado: %', p_dist_movement_id;
    end if;
  end if;

  insert into public.movimientos_sku (
    sku_id,
    tipo,
    cantidad,
    fecha,
    notas,
    client_id,
    recipient,
    reason,
    event,
    precio_unitario,
    total,
    moneda,
    dist_movement_id,
    user_id,
    clerk_id,
    profile_type_v2
  )
  values (
    p_sku_id,
    p_tipo,
    p_cantidad,
    coalesce(p_fecha, current_date),
    p_notas,
    p_client_id,
    p_recipient,
    p_reason,
    p_event,
    p_precio_unitario,
    p_total,
    p_moneda,
    p_dist_movement_id,
    v_sku.user_id,
    v_sku.clerk_id,
    v_sku.profile_type_v2
  );

  if p_tipo = 'entrada' then
    update public.skus s
    set
      stock_total = s.stock_total + p_cantidad,
      ultimo_movimiento = now(),
      updated_at = now()
    where s.id = p_sku_id;
  else
    update public.skus s
    set
      stock_total = greatest(0, s.stock_total - p_cantidad),
      ultimo_movimiento = now(),
      updated_at = now()
    where s.id = p_sku_id;
  end if;

  perform proof.refresh_sku_estado(p_sku_id);
end;
$func$;

grant execute on function public.registrar_movimiento_sku(
  uuid, text, integer, date, text, uuid, text, text, text, numeric, numeric, text, uuid
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
