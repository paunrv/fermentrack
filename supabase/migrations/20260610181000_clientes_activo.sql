-- Soft-delete: clientes se desactivan, no se eliminan

alter table public.clientes
  add column if not exists activo boolean not null default true;

create index if not exists clientes_activo_scope_idx
  on public.clientes (clerk_id, profile_type_v2, activo)
  where activo = true;

notify pgrst, 'reload schema';
