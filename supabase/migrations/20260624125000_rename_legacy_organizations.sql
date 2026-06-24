-- Legacy Prisma/Fermentrack: organizations(id text) → organizations_legacy
-- Libera el nombre public.organizations para PROOF (id uuid) en 20260624130000.

begin;

-- -----------------------------------------------------------------------------
-- 1. organizations → organizations_legacy
-- -----------------------------------------------------------------------------
do $rename_orgs$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'organizations'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'organizations_legacy'
  ) then
    alter table public.organizations rename to organizations_legacy;
  end if;
end;
$rename_orgs$;

-- -----------------------------------------------------------------------------
-- 2. Quitar FKs legacy → organizations / organizations_legacy (columna text intacta)
-- -----------------------------------------------------------------------------
do $drop_legacy_org_fks$
declare
  r record;
begin
  for r in
    select
      tc.table_schema,
      tc.table_name,
      tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name = any (array[
        'audit_logs',
        'domain_events',
        'raw_materials',
        'recipes',
        'skus_legacy_prisma',
        'users',
        'warehouses'
      ])
      and ccu.table_name in ('organizations', 'organizations_legacy')
      and ccu.column_name = 'id'
  loop
    execute format(
      'alter table %I.%I drop constraint if exists %I',
      r.table_schema,
      r.table_name,
      r.constraint_name
    );
  end loop;
end;
$drop_legacy_org_fks$;

-- -----------------------------------------------------------------------------
-- 3. profiles → profiles_clerk_legacy (idempotente con 20260624120000)
-- -----------------------------------------------------------------------------
do $rename_profiles$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles_clerk_legacy'
  ) and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    alter table public.profiles rename to profiles_clerk_legacy;
  end if;
end;
$rename_profiles$;

commit;
