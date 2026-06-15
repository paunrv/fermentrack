-- PROOF · Distribuidor Fase 4 — fulfillment de pedidos (preparando / en_ruta)

create or replace function proof.actualizar_estado_pedido(
  p_pedido_id uuid,
  p_estado public.estado_pedido
)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
begin
  if p_estado not in ('preparando', 'en_ruta') then
    raise exception 'Solo se puede avanzar a preparando o en_ruta (recibido: %)', p_estado;
  end if;

  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id
  for update;

  if not found then
    raise exception 'Pedido no encontrado: %', p_pedido_id;
  end if;

  if not proof.row_belongs_to_requester(v_pedido.clerk_id, v_pedido.profile_type_v2) then
    raise exception 'No autorizado';
  end if;

  if p_estado = 'preparando' and v_pedido.estado not in ('confirmado', 'parcial') then
    raise exception 'Solo confirmado o parcial puede pasar a preparando (actual: %)', v_pedido.estado;
  end if;

  if p_estado = 'en_ruta' and v_pedido.estado not in ('confirmado', 'preparando', 'parcial') then
    raise exception 'Solo confirmado, preparando o parcial puede pasar a en_ruta (actual: %)', v_pedido.estado;
  end if;

  update public.pedidos
  set estado = p_estado, updated_at = now()
  where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

create or replace function public.actualizar_estado_pedido(
  p_pedido_id uuid,
  p_estado public.estado_pedido
)
returns public.pedidos
language sql
security definer
set search_path = public, proof
as $$
  select proof.actualizar_estado_pedido(p_pedido_id, p_estado);
$$;

grant execute on function proof.actualizar_estado_pedido(uuid, public.estado_pedido) to authenticated, service_role;
grant execute on function public.actualizar_estado_pedido(uuid, public.estado_pedido) to authenticated, service_role;

notify pgrst, 'reload schema';
