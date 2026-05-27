-- Wrappers en public para RPC desde PostgREST / supabase-js (.rpc)

create or replace function public.confirmar_pedido(p_pedido_id uuid)
returns public.pedidos
language sql
security definer
set search_path = public, proof
as $$ select proof.confirmar_pedido(p_pedido_id); $$;

create or replace function public.cancelar_pedido(p_pedido_id uuid)
returns public.pedidos
language sql
security definer
set search_path = public, proof
as $$ select proof.cancelar_pedido(p_pedido_id); $$;

create or replace function public.entregar_pedido(p_pedido_id uuid, p_parcial boolean default false)
returns public.pedidos
language sql
security definer
set search_path = public, proof
as $$ select proof.entregar_pedido(p_pedido_id, p_parcial); $$;

create or replace function public.confirmar_recepcion(
  p_recepcion_id uuid,
  p_registrar_deuda boolean default true
)
returns public.recepciones
language sql
security definer
set search_path = public, proof
as $$ select proof.confirmar_recepcion(p_recepcion_id, p_registrar_deuda); $$;

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

grant execute on function public.confirmar_pedido(uuid) to authenticated, service_role;
grant execute on function public.cancelar_pedido(uuid) to authenticated, service_role;
grant execute on function public.entregar_pedido(uuid, boolean) to authenticated, service_role;
grant execute on function public.confirmar_recepcion(uuid, boolean) to authenticated, service_role;
grant execute on function public.sync_all_skus_for_scope(text, text) to authenticated, service_role;
grant execute on function public.proof_next_codigo(text, text, text) to authenticated, service_role;
