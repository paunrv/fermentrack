-- Resume prod migrations from Epic D1 (if A1 lots.etapa already applied)
-- Requires scripts/prereq-wm-rls-helpers.sql run first.

-- Epic D (#38) · Issue D1 (#53): finished goods — etiquetas, existencias, salidas
-- Spec: docs/WINEMAKER-UX-SPEC.md · docs/INVENTARIO-TERMINADO.md

begin;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.wm_salida_tipo as enum (
    'venta',
    'degustacion',
    'autoconsumo',
    'merma',
    'ajuste'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.wm_salida_origen as enum ('web', 'mcp');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- wm_etiquetas — product catalog per organization
-- -----------------------------------------------------------------------------
create table if not exists public.wm_etiquetas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  nombre text not null,
  varietal text,
  region text,
  tipo text,
  created_at timestamptz not null default now(),
  unique (organization_id, nombre)
);

create index if not exists wm_etiquetas_organization_id_idx
  on public.wm_etiquetas (organization_id);

-- -----------------------------------------------------------------------------
-- wm_existencias — stock line born at bottling (canonical unit = botella)
-- lote_id → public.lots (Epic A pipeline), not wm_wine_lots
-- -----------------------------------------------------------------------------
create table if not exists public.wm_existencias (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  etiqueta_id uuid not null references public.wm_etiquetas (id) on delete restrict,
  lote_id uuid not null references public.lots (id) on delete restrict,
  anada int not null check (anada >= 1900 and anada <= 2100),
  formato text not null check (char_length(btrim(formato)) > 0),
  botellas_por_caja int not null check (botellas_por_caja in (6, 9, 12)),
  botellas_producidas int not null check (botellas_producidas > 0),
  created_at timestamptz not null default now()
);

create index if not exists wm_existencias_organization_id_idx
  on public.wm_existencias (organization_id);

create index if not exists wm_existencias_etiqueta_id_idx
  on public.wm_existencias (organization_id, etiqueta_id);

create index if not exists wm_existencias_lote_id_idx
  on public.wm_existencias (organization_id, lote_id);

-- -----------------------------------------------------------------------------
-- wm_salidas — consumption ledger (never edit stock directly)
-- -----------------------------------------------------------------------------
create table if not exists public.wm_salidas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  existencia_id uuid not null references public.wm_existencias (id) on delete restrict,
  tipo public.wm_salida_tipo not null,
  botellas int not null check (botellas > 0),
  rango_inicio int check (rango_inicio is null or rango_inicio > 0),
  rango_fin int check (rango_fin is null or rango_fin > 0),
  registrado_por uuid not null references public.profiles (id) on delete restrict,
  origen public.wm_salida_origen not null default 'web',
  created_at timestamptz not null default now(),
  check (
    rango_inicio is null
    or rango_fin is null
    or rango_fin >= rango_inicio
  )
);

create index if not exists wm_salidas_existencia_id_idx
  on public.wm_salidas (existencia_id, created_at desc);

create index if not exists wm_salidas_organization_id_idx
  on public.wm_salidas (organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Constraint: sum(salidas) ≤ botellas_producidas per existencia
-- -----------------------------------------------------------------------------
create or replace function public.wm_assert_salida_within_produced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produced int;
  v_consumed int;
begin
  select e.botellas_producidas
  into v_produced
  from public.wm_existencias e
  where e.id = new.existencia_id;

  if v_produced is null then
    raise exception 'existencia_not_found';
  end if;

  select coalesce(sum(s.botellas), 0)
  into v_consumed
  from public.wm_salidas s
  where s.existencia_id = new.existencia_id
    and s.id is distinct from new.id;

  if v_consumed + new.botellas > v_produced then
    raise exception 'salidas_exceed_produced'
      using hint = format(
        'produced=%s consumed=%s requested=%s',
        v_produced,
        v_consumed,
        new.botellas
      );
  end if;

  return new;
end;
$$;

drop trigger if exists wm_salidas_within_produced on public.wm_salidas;
create trigger wm_salidas_within_produced
  before insert on public.wm_salidas
  for each row
  execute function public.wm_assert_salida_within_produced();

-- Align organization_id on salida with parent existencia
create or replace function public.wm_sync_salida_organization_id()
returns trigger
language plpgsql
as $$
begin
  select e.organization_id
  into new.organization_id
  from public.wm_existencias e
  where e.id = new.existencia_id;

  if new.organization_id is null then
    raise exception 'existencia_not_found';
  end if;

  return new;
end;
$$;

drop trigger if exists wm_salidas_sync_org on public.wm_salidas;
create trigger wm_salidas_sync_org
  before insert on public.wm_salidas
  for each row
  execute function public.wm_sync_salida_organization_id();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.wm_etiquetas enable row level security;
alter table public.wm_existencias enable row level security;
alter table public.wm_salidas enable row level security;

-- wm_etiquetas — catalog CRUD for writers
create policy wm_etiquetas_select on public.wm_etiquetas
  for select using (public.wm_row_select_allowed(organization_id));

create policy wm_etiquetas_insert on public.wm_etiquetas
  for insert with check (public.wm_row_write_allowed(organization_id));

create policy wm_etiquetas_update on public.wm_etiquetas
  for update
  using (public.wm_row_write_allowed(organization_id))
  with check (public.wm_row_write_allowed(organization_id));

create policy wm_etiquetas_delete on public.wm_etiquetas
  for delete using (public.wm_row_delete_allowed(organization_id));

-- wm_existencias — append-only stock lines (created at bottling)
create policy wm_existencias_select on public.wm_existencias
  for select using (public.wm_row_select_allowed(organization_id));

create policy wm_existencias_insert on public.wm_existencias
  for insert with check (public.wm_row_write_allowed(organization_id));

create policy wm_existencias_update on public.wm_existencias
  for update using (false) with check (false);

create policy wm_existencias_delete on public.wm_existencias
  for delete using (false);

-- wm_salidas — ledger: select + insert only
create policy wm_salidas_select on public.wm_salidas
  for select using (public.wm_row_select_allowed(organization_id));

create policy wm_salidas_insert on public.wm_salidas
  for insert with check (public.wm_row_write_allowed(organization_id));

create policy wm_salidas_update on public.wm_salidas
  for update using (false) with check (false);

create policy wm_salidas_delete on public.wm_salidas
  for delete using (false);

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.wm_etiquetas to authenticated;
grant select, insert on public.wm_existencias to authenticated;
grant select, insert on public.wm_salidas to authenticated;

notify pgrst, 'reload schema';

commit;
-- Epic D (#38) · Issue D6 (#58): org feature flags (E1-lite for numeracion_botellas gating)
-- Spec: docs/WINEMAKER-UX-SPEC.md · docs/INVENTARIO-TERMINADO.md

alter table public.organizations
  add column if not exists features jsonb not null default '{}'::jsonb;

comment on column public.organizations.features is
  'Per-org feature overrides — keys e.g. numeracion_botellas (boolean). Plan defaults apply when absent.';
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
-- Epic E (#59) · Issue E1 (#60): plan_limites + org billing fields + limit catalog
-- Spec: docs/WINEMAKER-UX-SPEC.md · docs/PLANES.md

begin;

-- -----------------------------------------------------------------------------
-- plan_limites — canonical limits + default feature flags per tier
-- -----------------------------------------------------------------------------
create table if not exists public.plan_limites (
  plan text primary key check (plan in ('regular', 'pro', 'enterprise', 'trial')),
  lotes_activos int check (lotes_activos is null or lotes_activos > 0),
  etiquetas int check (etiquetas is null or etiquetas > 0),
  memoria_meses int check (memoria_meses is null or memoria_meses > 0),
  max_usuarios int check (max_usuarios is null or max_usuarios > 0),
  features jsonb not null default '{}'::jsonb
);

comment on table public.plan_limites is
  'Plan catalog — null limit = unlimited. Features jsonb gates chat, numeracion_botellas, etc.';

insert into public.plan_limites (plan, lotes_activos, etiquetas, memoria_meses, max_usuarios, features)
values
  (
    'regular',
    5,
    5,
    12,
    1,
    '{"chat": false, "numeracion_botellas": false}'::jsonb
  ),
  (
    'trial',
    5,
    5,
    12,
    1,
    '{"chat": false, "numeracion_botellas": false}'::jsonb
  ),
  (
    'pro',
    20,
    30,
    36,
    null,
    '{"chat": true, "numeracion_botellas": false}'::jsonb
  ),
  (
    'enterprise',
    null,
    null,
    null,
    null,
    '{"chat": true, "numeracion_botellas": true}'::jsonb
  )
on conflict (plan) do update set
  lotes_activos = excluded.lotes_activos,
  etiquetas = excluded.etiquetas,
  memoria_meses = excluded.memoria_meses,
  max_usuarios = excluded.max_usuarios,
  features = excluded.features;

alter table public.plan_limites enable row level security;

create policy plan_limites_select on public.plan_limites
  for select to authenticated
  using (true);

grant select on public.plan_limites to authenticated;

-- -----------------------------------------------------------------------------
-- organizations — billing cycle + trial / renewal anchors
-- -----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists billing_cycle text check (billing_cycle in ('monthly', 'annual')),
  add column if not exists trial_ends_at timestamptz,
  add column if not exists primer_registro_at timestamptz,
  add column if not exists renewal_anchor date;

comment on column public.organizations.billing_cycle is 'Stripe cadence when subscribed — monthly or annual.';
comment on column public.organizations.trial_ends_at is 'End of 90-day vendimia trial (no card).';
comment on column public.organizations.primer_registro_at is 'First operational record — memory capacity anchor.';
comment on column public.organizations.renewal_anchor is 'Pre-vendimia renewal date (month/day).';

-- Migrate legacy free → regular; expand plan check
alter table public.organizations drop constraint if exists organizations_plan_check;

update public.organizations
set plan = 'regular'
where plan = 'free';

update public.organizations
set primer_registro_at = coalesce(primer_registro_at, created_at)
where primer_registro_at is null;

update public.organizations
set trial_ends_at = coalesce(trial_ends_at, created_at + interval '90 days')
where plan = 'regular'
  and plan_status = 'trialing'
  and trial_ends_at is null;

alter table public.organizations
  add constraint organizations_plan_check
  check (plan in ('regular', 'pro', 'enterprise', 'trial'));

alter table public.organizations
  alter column plan set default 'trial';

notify pgrst, 'reload schema';

commit;
-- Epic E7 (#66) — Valle de Guadalupe founding cohort (frozen annual price via Stripe coupon)
begin;

alter table public.organizations
  add column if not exists founding_member_at timestamptz;

comment on column public.organizations.founding_member_at is
  'When set, org is in the founding cohort — checkout auto-applies STRIPE_COUPON_FOUNDING (lifetime annual discount).';

commit;
