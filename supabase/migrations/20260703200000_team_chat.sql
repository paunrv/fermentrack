-- Epic C (#37) · Issue C1 (#48): team chat — wm_mensajes + wm_mensajes_lectura
-- Spec: docs/WINEMAKER-UX-SPEC.md · docs/CHAT.md

begin;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.wm_mensaje_origen as enum ('web', 'mcp');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- wm_mensajes — org-scoped team channel + optional lote thread anchor
-- -----------------------------------------------------------------------------
create table if not exists public.wm_mensajes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lote_id uuid references public.lots (id) on delete set null,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 4000),
  origen public.wm_mensaje_origen not null default 'web',
  created_at timestamptz not null default now()
);

create index if not exists wm_mensajes_org_created_idx
  on public.wm_mensajes (organization_id, created_at desc);

create index if not exists wm_mensajes_org_lote_created_idx
  on public.wm_mensajes (organization_id, lote_id, created_at desc)
  where lote_id is not null;

-- -----------------------------------------------------------------------------
-- wm_mensajes_lectura — last-read watermark per member (user) per org
-- member_id = profiles.id (auth user within org)
-- -----------------------------------------------------------------------------
create table if not exists public.wm_mensajes_lectura (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (organization_id, member_id)
);

create index if not exists wm_mensajes_lectura_member_idx
  on public.wm_mensajes_lectura (member_id);

-- -----------------------------------------------------------------------------
-- Triggers — lote must belong to same organization
-- -----------------------------------------------------------------------------
create or replace function public.wm_assert_mensaje_lote_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lote_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.lots l
    where l.id = new.lote_id
      and l.organization_id = new.organization_id
  ) then
    raise exception 'lote_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists wm_mensajes_lote_org on public.wm_mensajes;
create trigger wm_mensajes_lote_org
  before insert on public.wm_mensajes
  for each row
  execute function public.wm_assert_mensaje_lote_org();

-- -----------------------------------------------------------------------------
-- RLS — select + insert only on messages; read tracking upsert by member
-- -----------------------------------------------------------------------------
alter table public.wm_mensajes enable row level security;
alter table public.wm_mensajes_lectura enable row level security;

create policy wm_mensajes_select on public.wm_mensajes
  for select using (public.wm_row_select_allowed(organization_id));

create policy wm_mensajes_insert on public.wm_mensajes
  for insert
  with check (
    public.wm_row_write_allowed(organization_id)
    and author_id = auth.uid()
  );

create policy wm_mensajes_update on public.wm_mensajes
  for update using (false) with check (false);

create policy wm_mensajes_delete on public.wm_mensajes
  for delete using (false);

create policy wm_mensajes_lectura_select on public.wm_mensajes_lectura
  for select
  using (
    public.wm_row_select_allowed(organization_id)
    and member_id = auth.uid()
  );

create policy wm_mensajes_lectura_insert on public.wm_mensajes_lectura
  for insert
  with check (
    public.wm_row_select_allowed(organization_id)
    and member_id = auth.uid()
  );

create policy wm_mensajes_lectura_update on public.wm_mensajes_lectura
  for update
  using (
    public.wm_row_select_allowed(organization_id)
    and member_id = auth.uid()
  )
  with check (
    public.wm_row_select_allowed(organization_id)
    and member_id = auth.uid()
  );

create policy wm_mensajes_lectura_delete on public.wm_mensajes_lectura
  for delete using (false);

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
grant select, insert on public.wm_mensajes to authenticated;
grant select, insert, update on public.wm_mensajes_lectura to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
do $realtime$
begin
  alter publication supabase_realtime add table public.wm_mensajes;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'publicación supabase_realtime no disponible en este entorno';
end;
$realtime$;

notify pgrst, 'reload schema';

commit;
