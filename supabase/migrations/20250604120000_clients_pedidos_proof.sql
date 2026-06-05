-- Clientes: columnas PROOF + tablas pedidos (producción tenía clients legacy y sin pedidos)

alter table public.clients
  add column if not exists profile_type_v2 text default 'distributor',
  add column if not exists type text default 'tienda',
  add column if not exists contact_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists price_tier text default 'regular';

update public.clients
set
  contact_name = coalesce(contact_name, contact),
  profile_type_v2 = coalesce(profile_type_v2, 'distributor'),
  type = coalesce(type, 'tienda'),
  price_tier = coalesce(price_tier, 'regular')
where contact_name is null
   or profile_type_v2 is null
   or type is null
   or price_tier is null;

do $$ begin
  create type public.estado_pedido as enum (
    'borrador', 'confirmado', 'preparando', 'en_ruta', 'entregado', 'parcial', 'cancelado'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  cliente_id uuid not null references public.clients(id) on delete restrict,
  fecha_creacion timestamptz not null default now(),
  fecha_entrega date not null,
  condicion_pago text not null default 'contado',
  estado public.estado_pedido not null default 'borrador',
  total numeric(12, 2) not null default 0 check (total >= 0),
  ticket_exportado boolean not null default false,
  notas text,
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_id, profile_type_v2, numero)
);

create table if not exists public.items_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  sku_id uuid not null references public.skus(id) on delete restrict,
  nombre text not null,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) not null default 0,
  disponible_al_crear integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pedidos_scope_idx on public.pedidos (clerk_id, profile_type_v2);
create index if not exists items_pedido_pedido_id_idx on public.items_pedido (pedido_id);

create or replace function proof.recalc_pedido_total(p_pedido_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.pedidos p
  set
    total = coalesce((
      select sum(ip.subtotal) from public.items_pedido ip where ip.pedido_id = p_pedido_id
    ), 0),
    updated_at = now()
  where p.id = p_pedido_id;
$$;

create or replace function proof.confirmar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_item record;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido no encontrado: %', p_pedido_id; end if;
  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;
  if v_pedido.estado <> 'borrador' then
    raise exception 'Solo borrador puede confirmarse (actual: %)', v_pedido.estado;
  end if;
  perform set_config('proof.allow_stock_reservado_mutation', '1', true);
  for v_item in
    select ip.sku_id, ip.cantidad, ip.id as item_id
    from public.items_pedido ip where ip.pedido_id = p_pedido_id for update
  loop
    update public.skus s
    set stock_reservado = s.stock_reservado + v_item.cantidad
    where s.id = v_item.sku_id;
    if not found then raise exception 'SKU no encontrado'; end if;
  end loop;
  update public.pedidos set estado = 'confirmado', updated_at = now()
  where id = p_pedido_id returning * into v_pedido;
  perform proof.recalc_pedido_total(p_pedido_id);
  return v_pedido;
end;
$$;

create or replace function proof.cancelar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql security definer set search_path = public
as $$
declare v_pedido public.pedidos%rowtype; v_item record;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_pedido.estado = 'cancelado' then return v_pedido; end if;
  if v_pedido.estado in ('confirmado', 'preparando', 'en_ruta', 'parcial') then
    perform set_config('proof.allow_stock_reservado_mutation', '1', true);
    for v_item in select ip.sku_id, ip.cantidad from public.items_pedido ip where ip.pedido_id = p_pedido_id loop
      update public.skus s set stock_reservado = greatest(0, s.stock_reservado - v_item.cantidad) where s.id = v_item.sku_id;
    end loop;
  end if;
  update public.pedidos set estado = 'cancelado', updated_at = now() where id = p_pedido_id returning * into v_pedido;
  return v_pedido;
end;
$$;

create or replace function proof.entregar_pedido(p_pedido_id uuid, p_parcial boolean default false)
returns public.pedidos
language plpgsql security definer set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_item record;
  v_nuevo_estado public.estado_pedido;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
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
  return v_pedido;
end;
$$;

create or replace function public.confirmar_pedido(p_pedido_id uuid)
returns public.pedidos
language sql security definer set search_path = public, proof
as $$ select proof.confirmar_pedido(p_pedido_id); $$;

create or replace function public.cancelar_pedido(p_pedido_id uuid)
returns public.pedidos
language sql security definer set search_path = public, proof
as $$ select proof.cancelar_pedido(p_pedido_id); $$;

create or replace function public.entregar_pedido(p_pedido_id uuid, p_parcial boolean default false)
returns public.pedidos
language sql security definer set search_path = public, proof
as $$ select proof.entregar_pedido(p_pedido_id, p_parcial); $$;

create or replace function proof.trg_skus_guard_stock_reservado()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.stock_reservado is distinct from new.stock_reservado
    and coalesce(current_setting('proof.allow_stock_reservado_mutation', true), '') <> '1' then
    raise exception 'stock_reservado solo vía RPC de pedidos';
  end if;
  return new;
end;
$$;

drop trigger if exists skus_guard_stock_reservado on public.skus;
create trigger skus_guard_stock_reservado
  before update of stock_reservado on public.skus
  for each row execute function proof.trg_skus_guard_stock_reservado();

alter table public.pedidos enable row level security;
alter table public.items_pedido enable row level security;

drop policy if exists pedidos_select on public.pedidos;
create policy pedidos_select on public.pedidos for select
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2));
drop policy if exists pedidos_insert on public.pedidos;
create policy pedidos_insert on public.pedidos for insert
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));
drop policy if exists pedidos_update on public.pedidos;
create policy pedidos_update on public.pedidos for update
  using (proof.row_belongs_to_requester(clerk_id, profile_type_v2))
  with check (proof.row_belongs_to_requester(clerk_id, profile_type_v2));

drop policy if exists items_pedido_all on public.items_pedido;
create policy items_pedido_all on public.items_pedido for all
  using (exists (
    select 1 from public.pedidos p
    where p.id = items_pedido.pedido_id
      and proof.row_belongs_to_requester(p.clerk_id, p.profile_type_v2)
  ))
  with check (exists (
    select 1 from public.pedidos p
    where p.id = items_pedido.pedido_id
      and proof.row_belongs_to_requester(p.clerk_id, p.profile_type_v2)
  ));

grant select, insert, update, delete on public.pedidos to authenticated, service_role;
grant select, insert, update, delete on public.items_pedido to authenticated, service_role;
grant select, insert, update, delete on public.clients to authenticated, service_role;
grant usage on type public.estado_pedido to authenticated, service_role;

grant execute on function proof.confirmar_pedido(uuid) to authenticated, service_role;
grant execute on function proof.cancelar_pedido(uuid) to authenticated, service_role;
grant execute on function proof.entregar_pedido(uuid, boolean) to authenticated, service_role;
grant execute on function public.confirmar_pedido(uuid) to authenticated, service_role;
grant execute on function public.cancelar_pedido(uuid) to authenticated, service_role;
grant execute on function public.entregar_pedido(uuid, boolean) to authenticated, service_role;

notify pgrst, 'reload schema';
