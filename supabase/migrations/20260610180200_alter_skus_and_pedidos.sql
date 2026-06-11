-- skus: categoria_liquido · pedidos: enlace a clientes + nota + imagen_origen_url
-- pedidos.cliente_id (legacy → clients) se renombra a clients_id

-- -----------------------------------------------------------------------------
-- skus · categoria_liquido
-- -----------------------------------------------------------------------------
alter table public.skus
  add column if not exists categoria_liquido text default 'otro';

update public.skus
set categoria_liquido = 'otro'
where categoria_liquido is null;

alter table public.skus
  alter column categoria_liquido set default 'otro',
  alter column categoria_liquido set not null;

alter table public.skus
  drop constraint if exists skus_categoria_liquido_check;

alter table public.skus
  add constraint skus_categoria_liquido_check
  check (categoria_liquido in ('cerveza', 'vino', 'mezcal', 'gin', 'destilado', 'otro'));

-- -----------------------------------------------------------------------------
-- pedidos · clients_id (legacy) + cliente_id (clientes) + nota + imagen
-- -----------------------------------------------------------------------------
do $pedidos_cliente$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pedidos'
      and column_name = 'cliente_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pedidos'
      and column_name = 'clients_id'
  ) then
    alter table public.pedidos drop constraint if exists pedidos_cliente_id_fkey;
    alter table public.pedidos rename column cliente_id to clients_id;
    alter table public.pedidos
      add constraint pedidos_clients_id_fkey
        foreign key (clients_id) references public.clients(id) on delete restrict;
    alter index if exists pedidos_cliente_id_idx rename to pedidos_clients_id_idx;
  end if;
end;
$pedidos_cliente$;

alter table public.pedidos
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null,
  add column if not exists nota text,
  add column if not exists imagen_origen_url text;

create index if not exists pedidos_cliente_id_idx
  on public.pedidos (cliente_id);

-- RPC que leía pedidos.cliente_id (clients)
create or replace function proof.crear_cuenta_por_cobrar_pedido(p_pedido_id uuid)
returns public.cuentas_por_cobrar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_cliente text;
  v_dias integer;
  v_cuenta public.cuentas_por_cobrar%rowtype;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id;
  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if v_pedido.estado not in ('entregado', 'parcial') then
    raise exception 'Pedido % no está entregado', v_pedido.numero;
  end if;

  select c.name into v_cliente
  from public.clients c
  where c.id = v_pedido.clients_id;

  select * into v_cuenta
  from public.cuentas_por_cobrar
  where pedido_id = p_pedido_id;

  if found then
    return v_cuenta;
  end if;

  if coalesce(v_pedido.total, 0) <= 0 then
    raise exception 'Pedido % sin monto a cobrar', v_pedido.numero;
  end if;

  v_dias := proof.dias_credito_condicion(v_pedido.condicion_pago);

  insert into public.cuentas_por_cobrar (
    clerk_id,
    profile_type_v2,
    pedido_id,
    cliente_nombre,
    monto_total,
    fecha_vencimiento
  )
  values (
    v_pedido.clerk_id,
    v_pedido.profile_type_v2,
    p_pedido_id,
    coalesce(v_cliente, 'Cliente'),
    v_pedido.total,
    v_pedido.fecha_entrega + v_dias
  )
  returning * into v_cuenta;

  return v_cuenta;
end;
$$;

notify pgrst, 'reload schema';
