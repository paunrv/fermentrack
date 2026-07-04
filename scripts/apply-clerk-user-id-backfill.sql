-- Preflight fix: backfill user_id where clerk_id is Clerk text (user_xxx), not UUID.
-- Run in SQL Editor BEFORE 20260624160000_drop_clerk_columns.sql
-- Verify first: npm run check:clerk-cleanup

begin;

-- Map clerk_id → user_id from any row that already has both (skus, pedidos, etc.)
do $backfill_clerk_text$
declare
  tbl text;
begin
  foreach tbl in array array['cuentas_por_pagar', 'pagos_proveedor']
  loop
    execute format(
      $sql$
        update public.%I t
        set user_id = ref.user_id
        from (
          select distinct clerk_id, user_id
          from public.skus
          where user_id is not null and clerk_id is not null
          union
          select distinct clerk_id, user_id
          from public.pedidos
          where user_id is not null and clerk_id is not null
          union
          select distinct clerk_id, user_id
          from public.trabajadores
          where user_id is not null and clerk_id is not null
        ) ref
        where t.user_id is null
          and t.clerk_id = ref.clerk_id
      $sql$,
      tbl
    );
  end loop;
end;
$backfill_clerk_text$;

-- Abort if orphans remain
do $assert$
declare
  n bigint;
begin
  select count(*) into n from public.cuentas_por_pagar where user_id is null;
  if n > 0 then
    raise exception 'cuentas_por_pagar: % filas sin user_id', n;
  end if;
  select count(*) into n from public.pagos_proveedor where user_id is null;
  if n > 0 then
    raise exception 'pagos_proveedor: % filas sin user_id', n;
  end if;
end;
$assert$;

commit;
