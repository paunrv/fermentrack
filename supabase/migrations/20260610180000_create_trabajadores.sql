-- Trabajadores por distribuidor (patron / manager / bodega)
-- Scope: clerk_id + profile_type_v2 = 'distributor' (mismo patrón PROOF)
-- manager/bodega → patron_clerk_id apunta al clerk_user_id del patrón

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------
create table if not exists public.trabajadores (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  nombre text not null,
  rol text not null check (rol in ('patron', 'manager', 'bodega')),
  clerk_id text not null,
  profile_type_v2 text not null default 'distributor'
    check (profile_type_v2 = 'distributor'),
  patron_clerk_id text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),

  constraint trabajadores_patron_clerk_id_fkey
    foreign key (patron_clerk_id) references public.trabajadores (clerk_user_id)
    deferrable initially deferred,

  constraint trabajadores_patron_self check (
    rol <> 'patron' or patron_clerk_id = clerk_user_id
  ),
  constraint trabajadores_patron_scope check (
    rol <> 'patron' or clerk_id = clerk_user_id
  ),
  constraint trabajadores_staff_scope check (
    rol = 'patron' or clerk_id = patron_clerk_id
  )
);

create index if not exists trabajadores_scope_idx
  on public.trabajadores (clerk_id, profile_type_v2);

create index if not exists trabajadores_patron_clerk_id_idx
  on public.trabajadores (patron_clerk_id);

create index if not exists trabajadores_clerk_user_id_idx
  on public.trabajadores (clerk_user_id);

-- created_at inmutable
create or replace function proof.trg_trabajadores_guard_created_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.created_at is distinct from new.created_at then
    raise exception 'created_at no es modificable';
  end if;
  return new;
end;
$$;

drop trigger if exists trabajadores_guard_created_at on public.trabajadores;
create trigger trabajadores_guard_created_at
  before update on public.trabajadores
  for each row
  execute function proof.trg_trabajadores_guard_created_at();

-- -----------------------------------------------------------------------------
-- Helpers RLS
-- -----------------------------------------------------------------------------
create or replace function proof.requester_es_patron_scope(
  p_clerk_id text,
  p_profile_type_v2 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trabajadores t
    where t.clerk_user_id = proof.current_clerk_id()
      and t.rol = 'patron'
      and t.clerk_id = p_clerk_id
      and t.profile_type_v2 = p_profile_type_v2
      and t.activo = true
  );
$$;

grant execute on function proof.requester_es_patron_scope(text, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.trabajadores enable row level security;

drop policy if exists trabajadores_select on public.trabajadores;
create policy trabajadores_select on public.trabajadores
  for select
  using (
    clerk_user_id = proof.current_clerk_id()
    or proof.requester_es_patron_scope(clerk_id, profile_type_v2)
  );

drop policy if exists trabajadores_insert on public.trabajadores;
create policy trabajadores_insert on public.trabajadores
  for insert
  with check (proof.requester_es_patron_scope(clerk_id, profile_type_v2));

drop policy if exists trabajadores_update on public.trabajadores;
create policy trabajadores_update on public.trabajadores
  for update
  using (proof.requester_es_patron_scope(clerk_id, profile_type_v2))
  with check (proof.requester_es_patron_scope(clerk_id, profile_type_v2));

grant select, insert, update on public.trabajadores to authenticated, service_role;

notify pgrst, 'reload schema';
