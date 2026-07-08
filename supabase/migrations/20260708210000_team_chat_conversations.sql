-- Phase 1: team chat conversations — general channel per winery org
-- Spec: docs/CHAT.md (v2 architecture, general channel only)

begin;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.wm_conversacion_kind as enum ('general', 'dm', 'group', 'lote');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- wm_conversaciones
-- -----------------------------------------------------------------------------
create table if not exists public.wm_conversaciones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.wm_conversacion_kind not null,
  title text,
  lote_id uuid references public.lots (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint wm_conversaciones_lote_kind_check check (
    (kind = 'lote' and lote_id is not null)
    or (kind <> 'lote' and lote_id is null)
  )
);

create unique index if not exists wm_conversaciones_org_general_uidx
  on public.wm_conversaciones (organization_id)
  where kind = 'general';

create unique index if not exists wm_conversaciones_org_lote_uidx
  on public.wm_conversaciones (organization_id, lote_id)
  where kind = 'lote' and lote_id is not null;

create index if not exists wm_conversaciones_org_idx
  on public.wm_conversaciones (organization_id, kind);

-- -----------------------------------------------------------------------------
-- wm_conversacion_miembros — per-user read state (general uses lazy rows)
-- -----------------------------------------------------------------------------
create table if not exists public.wm_conversacion_miembros (
  conversation_id uuid not null references public.wm_conversaciones (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  primary key (conversation_id, user_id)
);

create index if not exists wm_conversacion_miembros_user_idx
  on public.wm_conversacion_miembros (user_id);

-- -----------------------------------------------------------------------------
-- wm_mensajes.conversation_id
-- -----------------------------------------------------------------------------
alter table public.wm_mensajes
  add column if not exists conversation_id uuid references public.wm_conversaciones (id) on delete cascade;

create index if not exists wm_mensajes_conversation_created_idx
  on public.wm_mensajes (conversation_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.wm_conversation_select_allowed(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wm_conversaciones c
    where c.id = p_conversation_id
      and public.wm_row_select_allowed(c.organization_id)
      and c.kind in ('general', 'lote')
  );
$$;

create or replace function public.wm_conversation_write_allowed(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wm_conversaciones c
    where c.id = p_conversation_id
      and public.wm_row_write_allowed(c.organization_id)
      and c.kind in ('general', 'lote')
  );
$$;

grant execute on function public.wm_conversation_select_allowed(uuid) to authenticated;
grant execute on function public.wm_conversation_write_allowed(uuid) to authenticated;

create or replace function public.ensure_wm_general_conversation(p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select c.id
  into v_id
  from public.wm_conversaciones c
  where c.organization_id = p_organization_id
    and c.kind = 'general'
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.wm_conversaciones (organization_id, kind, title)
  values (p_organization_id, 'general', null)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select c.id
    into v_id
    from public.wm_conversaciones c
    where c.organization_id = p_organization_id
      and c.kind = 'general'
    limit 1;
  end if;

  return v_id;
end;
$$;

grant execute on function public.ensure_wm_general_conversation(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Backfill general conversations + message links
-- -----------------------------------------------------------------------------
insert into public.wm_conversaciones (organization_id, kind)
select o.id, 'general'::public.wm_conversacion_kind
from public.organizations o
where not exists (
  select 1
  from public.wm_conversaciones c
  where c.organization_id = o.id
    and c.kind = 'general'
);

update public.wm_mensajes m
set conversation_id = c.id
from public.wm_conversaciones c
where m.conversation_id is null
  and c.organization_id = m.organization_id
  and c.kind = 'general';

-- Migrate org-level read watermarks to conversation members (general channel)
insert into public.wm_conversacion_miembros (conversation_id, user_id, last_read_at)
select c.id, r.member_id, r.last_read_at
from public.wm_mensajes_lectura r
join public.wm_conversaciones c
  on c.organization_id = r.organization_id
 and c.kind = 'general'
on conflict (conversation_id, user_id) do update
  set last_read_at = greatest(
    public.wm_conversacion_miembros.last_read_at,
    excluded.last_read_at
  );

-- -----------------------------------------------------------------------------
-- Assert message conversation matches org (+ optional lote thread later)
-- -----------------------------------------------------------------------------
create or replace function public.wm_assert_mensaje_conversation_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if new.conversation_id is null then
    new.conversation_id := public.ensure_wm_general_conversation(new.organization_id);
  end if;

  select c.organization_id
  into v_org_id
  from public.wm_conversaciones c
  where c.id = new.conversation_id;

  if v_org_id is null or v_org_id <> new.organization_id then
    raise exception 'conversation_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists wm_mensajes_conversation_org on public.wm_mensajes;
create trigger wm_mensajes_conversation_org
  before insert on public.wm_mensajes
  for each row
  execute function public.wm_assert_mensaje_conversation_org();

-- -----------------------------------------------------------------------------
-- RLS — conversations
-- -----------------------------------------------------------------------------
alter table public.wm_conversaciones enable row level security;

drop policy if exists wm_conversaciones_select on public.wm_conversaciones;
create policy wm_conversaciones_select on public.wm_conversaciones
  for select
  using (
    public.wm_row_select_allowed(organization_id)
    and kind in ('general', 'lote')
  );

drop policy if exists wm_conversaciones_insert on public.wm_conversaciones;
create policy wm_conversaciones_insert on public.wm_conversaciones
  for insert
  with check (
    public.wm_row_write_allowed(organization_id)
    and kind in ('general', 'lote')
  );

drop policy if exists wm_conversaciones_update on public.wm_conversaciones;
create policy wm_conversaciones_update on public.wm_conversaciones
  for update using (false) with check (false);

drop policy if exists wm_conversaciones_delete on public.wm_conversaciones;
create policy wm_conversaciones_delete on public.wm_conversaciones
  for delete using (false);

-- -----------------------------------------------------------------------------
-- RLS — conversation members (read state)
-- -----------------------------------------------------------------------------
alter table public.wm_conversacion_miembros enable row level security;

drop policy if exists wm_conversacion_miembros_select on public.wm_conversacion_miembros;
create policy wm_conversacion_miembros_select on public.wm_conversacion_miembros
  for select
  using (
    user_id = auth.uid()
    and public.wm_conversation_select_allowed(conversation_id)
  );

drop policy if exists wm_conversacion_miembros_insert on public.wm_conversacion_miembros;
create policy wm_conversacion_miembros_insert on public.wm_conversacion_miembros
  for insert
  with check (
    user_id = auth.uid()
    and public.wm_conversation_select_allowed(conversation_id)
  );

drop policy if exists wm_conversacion_miembros_update on public.wm_conversacion_miembros;
create policy wm_conversacion_miembros_update on public.wm_conversacion_miembros
  for update
  using (
    user_id = auth.uid()
    and public.wm_conversation_select_allowed(conversation_id)
  )
  with check (
    user_id = auth.uid()
    and public.wm_conversation_select_allowed(conversation_id)
  );

drop policy if exists wm_conversacion_miembros_delete on public.wm_conversacion_miembros;
create policy wm_conversacion_miembros_delete on public.wm_conversacion_miembros
  for delete using (false);

-- -----------------------------------------------------------------------------
-- Tighten wm_mensajes policies to require conversation access
-- -----------------------------------------------------------------------------
drop policy if exists wm_mensajes_select on public.wm_mensajes;
create policy wm_mensajes_select on public.wm_mensajes
  for select
  using (
    public.wm_row_select_allowed(organization_id)
    and (
      conversation_id is null
      or public.wm_conversation_select_allowed(conversation_id)
    )
  );

drop policy if exists wm_mensajes_insert on public.wm_mensajes;
create policy wm_mensajes_insert on public.wm_mensajes
  for insert
  with check (
    public.wm_row_write_allowed(organization_id)
    and author_id = auth.uid()
    and (
      conversation_id is null
      or public.wm_conversation_write_allowed(conversation_id)
    )
  );

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
grant select on public.wm_conversaciones to authenticated;
grant select, insert, update on public.wm_conversacion_miembros to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
do $realtime$
begin
  alter publication supabase_realtime add table public.wm_conversaciones;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'publicación supabase_realtime no disponible en este entorno';
end;
$realtime$;

notify pgrst, 'reload schema';

commit;
