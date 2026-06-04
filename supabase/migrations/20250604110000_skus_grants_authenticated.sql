-- GRANTs faltantes: sin esto PostgREST devuelve "permission denied for table skus"
-- aunque RLS esté configurado (migración 20250604100000 creó tablas sin grants del core).

grant select, insert, update, delete on public.skus to authenticated, service_role;
grant select, insert, update, delete on public.proof_sequences to authenticated, service_role;

grant usage on type public.categoria_sku to authenticated, service_role;
grant usage on type public.estado_sku to authenticated, service_role;
grant usage on type public.rotacion_30d to authenticated, service_role;

grant usage on schema proof to authenticated, service_role;

notify pgrst, 'reload schema';
