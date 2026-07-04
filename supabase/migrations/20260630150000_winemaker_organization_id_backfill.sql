-- =============================================================================
-- PROOF · Winemaker — organization_id backfill (epic #3, issue #7)
-- Aditivo: columna + backfill + NOT NULL + UNIQUE por org.
-- clerk_id se conserva hasta F6 (#12).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Columna organization_id (nullable)
-- -----------------------------------------------------------------------------
do $add_org_id$
declare
  tbl text;
begin
  foreach tbl in array array[
    'wm_wine_lots',
    'wm_documents',
    'wm_production_costs',
    'wm_events',
    'wm_suppliers',
    'wm_document_lines'
  ]
  loop
    execute format(
      $sql$
        alter table public.%I
          add column if not exists organization_id uuid
          references public.organizations (id) on delete cascade
      $sql$,
      tbl
    );
    execute format(
      'create index if not exists %I_organization_id_idx on public.%I (organization_id)',
      tbl, tbl
    );
  end loop;
end;
$add_org_id$;

-- -----------------------------------------------------------------------------
-- 2. Resolver clerk_id → user_id (uuid)
-- -----------------------------------------------------------------------------
create or replace function public._wm_resolve_user_id(p_clerk_id text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if p_clerk_id is null or btrim(p_clerk_id) = '' then
    return null;
  end if;

  if p_clerk_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_user_id := p_clerk_id::uuid;
    if exists (select 1 from auth.users u where u.id = v_user_id) then
      return v_user_id;
    end if;
    if exists (select 1 from public.profiles p where p.id = v_user_id) then
      return v_user_id;
    end if;
  end if;

  select pp.user_id
  into v_user_id
  from public.proof_profiles pp
  where pp.clerk_id = p_clerk_id
    and pp.profile_type_v2 = 'winemaker'
    and pp.user_id is not null
  limit 1;

  if v_user_id is not null then
    return v_user_id;
  end if;

  select pp.user_id
  into v_user_id
  from public.proof_profiles pp
  where pp.clerk_id = p_clerk_id
    and pp.user_id is not null
  limit 1;

  return v_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Asegurar org winemaker por user_id (sin depender de auth.uid())
-- -----------------------------------------------------------------------------
create or replace function public._wm_ensure_winemaker_org(
  p_user_id uuid,
  p_display_name text,
  p_clerk_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_name text;
  v_slug text;
  v_base_slug text;
  v_suffix int := 0;
begin
  if p_user_id is null then
    return null;
  end if;

  select o.id
  into v_org_id
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  where om.user_id = p_user_id
    and om.status = 'active'
    and o.org_type = 'winemaker'
  order by o.created_at asc
  limit 1;

  if v_org_id is not null then
    return v_org_id;
  end if;

  v_name := coalesce(nullif(btrim(p_display_name), ''), 'Mi bodega');
  v_base_slug := lower(
    regexp_replace(
      regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'),
      '(^-+|-+$)',
      '',
      'g'
    )
  );
  if v_base_slug = '' then
    v_base_slug := 'bodega';
  end if;
  v_base_slug := left(v_base_slug, 40);
  v_slug := v_base_slug || '-' || substr(md5(coalesce(p_clerk_id, p_user_id::text)), 1, 6);

  while exists (select 1 from public.organizations o where o.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || substr(md5(p_user_id::text || v_suffix::text), 1, 6);
  end loop;

  alter table public.organizations disable trigger on_organization_created;

  insert into public.organizations (name, slug, org_type, plan, plan_status)
  values (v_name, v_slug, 'winemaker', 'free', 'active')
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org_id, p_user_id, 'owner', 'active')
  on conflict (organization_id, user_id) do nothing;

  alter table public.organizations enable trigger on_organization_created;

  return v_org_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Mapa clerk_id → organization_id
-- Staging table (not TEMP): Supabase SQL Editor may implicit-commit after DDL,
-- which drops ON COMMIT DROP temp tables before section 5 runs.
-- -----------------------------------------------------------------------------
drop table if exists public._wm_org_map_staging;
create table public._wm_org_map_staging (
  clerk_id text primary key,
  organization_id uuid not null
);

-- 4a. Perfiles winemaker legacy
insert into public._wm_org_map_staging (clerk_id, organization_id)
select distinct
  coalesce(pp.clerk_id, pp.user_id::text) as clerk_id,
  public._wm_ensure_winemaker_org(
    pp.user_id,
    coalesce(nullif(btrim(pp.username), ''), 'Mi bodega'),
    coalesce(pp.clerk_id, pp.user_id::text)
  ) as organization_id
from public.proof_profiles pp
where pp.profile_type_v2 = 'winemaker'
  and pp.user_id is not null
on conflict (clerk_id) do nothing;

-- 4b. clerk_id presentes en tablas wm_* (datos huérfanos de perfil)
insert into public._wm_org_map_staging (clerk_id, organization_id)
select
  s.clerk_id,
  public._wm_ensure_winemaker_org(
    public._wm_resolve_user_id(s.clerk_id),
    'Mi bodega',
    s.clerk_id
  )
from (
  select distinct clerk_id from public.wm_wine_lots
  union
  select distinct clerk_id from public.wm_documents
  union
  select distinct clerk_id from public.wm_production_costs
  union
  select distinct clerk_id from public.wm_events
  union
  select distinct clerk_id from public.wm_suppliers
  union
  select distinct clerk_id from public.wm_document_lines
) s
where s.clerk_id is not null
  and btrim(s.clerk_id) <> ''
  and not exists (select 1 from public._wm_org_map_staging m where m.clerk_id = s.clerk_id)
  and public._wm_resolve_user_id(s.clerk_id) is not null
on conflict (clerk_id) do nothing;

-- 4c. Miembros con org winemaker — mapear user_id::text como clerk_id
insert into public._wm_org_map_staging (clerk_id, organization_id)
select
  om.user_id::text,
  om.organization_id
from public.organization_members om
join public.organizations o on o.id = om.organization_id
where o.org_type = 'winemaker'
  and om.status = 'active'
  and not exists (
    select 1 from public._wm_org_map_staging m where m.clerk_id = om.user_id::text
  )
on conflict (clerk_id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. Backfill organization_id en tablas wm_*
-- -----------------------------------------------------------------------------
do $backfill$
declare
  tbl text;
begin
  foreach tbl in array array[
    'wm_wine_lots',
    'wm_documents',
    'wm_production_costs',
    'wm_events',
    'wm_suppliers',
    'wm_document_lines'
  ]
  loop
    execute format(
      $sql$
        update public.%I t
        set organization_id = m.organization_id
        from public._wm_org_map_staging m
        where t.organization_id is null
          and t.clerk_id = m.clerk_id
      $sql$,
      tbl
    );
  end loop;
end;
$backfill$;

-- -----------------------------------------------------------------------------
-- 6. Validación — abortar si quedan huérfanos
-- -----------------------------------------------------------------------------
do $assert$
declare
  tbl text;
  missing bigint;
begin
  foreach tbl in array array[
    'wm_wine_lots',
    'wm_documents',
    'wm_production_costs',
    'wm_events',
    'wm_suppliers',
    'wm_document_lines'
  ]
  loop
    execute format(
      'select count(*) from public.%I where organization_id is null',
      tbl
    ) into missing;

    if missing > 0 then
      raise exception 'winemaker_org_backfill: % tiene % filas sin organization_id', tbl, missing;
    end if;
  end loop;
end;
$assert$;

-- -----------------------------------------------------------------------------
-- 7. NOT NULL + índices + UNIQUE por org
-- -----------------------------------------------------------------------------
alter table public.wm_wine_lots
  alter column organization_id set not null;

alter table public.wm_documents
  alter column organization_id set not null;

alter table public.wm_production_costs
  alter column organization_id set not null;

alter table public.wm_events
  alter column organization_id set not null;

alter table public.wm_suppliers
  alter column organization_id set not null;

alter table public.wm_document_lines
  alter column organization_id set not null;

alter table public.wm_wine_lots
  drop constraint if exists wm_wine_lots_clerk_id_lot_code_key;

create unique index if not exists wm_wine_lots_org_lot_code_key
  on public.wm_wine_lots (organization_id, lot_code);

create index if not exists wm_wine_lots_org_status_idx
  on public.wm_wine_lots (organization_id, status);

create index if not exists wm_documents_org_date_idx
  on public.wm_documents (organization_id, document_date desc);

create index if not exists wm_production_costs_org_date_idx
  on public.wm_production_costs (organization_id, cost_date desc);

create index if not exists wm_events_org_occurred_idx
  on public.wm_events (organization_id, occurred_at desc);

alter table public.wm_suppliers
  drop constraint if exists wm_suppliers_clerk_id_name_normalized_key;

create unique index if not exists wm_suppliers_org_name_normalized_key
  on public.wm_suppliers (organization_id, name_normalized);

create index if not exists wm_document_lines_org_kind_idx
  on public.wm_document_lines (organization_id, supply_kind);

-- -----------------------------------------------------------------------------
-- 8. Limpiar helpers privados de migración
-- -----------------------------------------------------------------------------
drop table if exists public._wm_org_map_staging;
drop function if exists public._wm_ensure_winemaker_org(uuid, text, text);
drop function if exists public._wm_resolve_user_id(text);

commit;
