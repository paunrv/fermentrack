-- PROOF · Lab — informes de laboratorio (entrevistas Aldo + Silvana Pijoan)
-- Jerarquía: lab_reports → lab_samples → lab_results
-- PDFs de referencia: Ardoa, CETyS/CEVIT

begin;

-- -----------------------------------------------------------------------------
-- lab_reports — folio del laboratorio (ej. "26V0309_070")
-- -----------------------------------------------------------------------------
create table if not exists public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  folio text not null,
  laboratory_name text not null,
  lab_origin text not null default 'external' check (lab_origin in ('internal', 'external')),
  sampled_at date not null,
  received_at date,
  analyzed_at date,
  reported_at date,
  evidence_id uuid,
  notes text,
  unique (organization_id, folio)
);

create index if not exists lab_reports_organization_id_sampled_at_idx
  on public.lab_reports (organization_id, sampled_at desc);

comment on table public.lab_reports is
  'Informe de laboratorio (un folio, varias muestras). '
  'sampled_at = FECHA DE MUESTREO — ancla el informe al timeline del lote.';

comment on column public.lab_reports.evidence_id is
  'PDF original adjunto. FK a public.evidences(id) cuando exista esa tabla.';

comment on column public.lab_reports.sampled_at is
  'Fecha de muestreo; corresponde a event_date en el timeline de producción.';

-- FK diferida: evidences puede no existir aún en el orden de migraciones
do $evidence_fk$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'evidences'
  ) then
    alter table public.lab_reports
      drop constraint if exists lab_reports_evidence_id_fkey;

    alter table public.lab_reports
      add constraint lab_reports_evidence_id_fkey
      foreign key (evidence_id) references public.evidences (id) on delete set null;
  end if;
end;
$evidence_fk$;

-- -----------------------------------------------------------------------------
-- lab_samples — muestra dentro de un informe (ej. "AF25", "CR 25", "CAR 25")
-- -----------------------------------------------------------------------------
create table if not exists public.lab_samples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lab_report_id uuid not null references public.lab_reports (id) on delete cascade,
  sample_code text not null,
  lot_id uuid references public.lots (id) on delete set null,
  production_stage text,
  unique (lab_report_id, sample_code)
);

create index if not exists lab_samples_lab_report_id_idx
  on public.lab_samples (lab_report_id);

create index if not exists lab_samples_lot_id_idx
  on public.lab_samples (lot_id)
  where lot_id is not null;

comment on table public.lab_samples is
  'Muestra dentro de un informe. lot_id es sugerido por importación; el usuario confirma el match.';

comment on column public.lab_samples.sample_code is
  'ID del enólogo en el PDF (nomenclatura libre por bodega).';

comment on column public.lab_samples.production_stage is
  'Fase de producción anclada al análisis (ej. malolactic, pre_bottling, routine).';

-- -----------------------------------------------------------------------------
-- lab_results — parámetro medido por muestra
-- -----------------------------------------------------------------------------
create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lab_sample_id uuid not null references public.lab_samples (id) on delete cascade,
  parameter text not null,
  value_numeric numeric,
  value_qualifier text check (value_qualifier is null or value_qualifier in ('<', '>')),
  unit text not null,
  method text
);

create unique index if not exists lab_results_sample_parameter_method_idx
  on public.lab_results (lab_sample_id, parameter, coalesce(method, ''));

create index if not exists lab_results_lab_sample_id_idx
  on public.lab_results (lab_sample_id);

create index if not exists lab_results_parameter_idx
  on public.lab_results (parameter);

comment on table public.lab_results is
  'Resultado analítico. No insertar fila cuando el PDF trae "---" (no medido). '
  'parameter + method identifica el dato (mismo parámetro, distintos métodos en un informe).';

comment on column public.lab_results.parameter is
  'Ej. so2_free, glucose_fructose, ph, alcohol, titratable_acidity, volatile_acidity. '
  'glucose_fructose (azúcar residual) es parámetro crítico — candidato a alertas por umbral.';

comment on column public.lab_results.value_qualifier is
  'Censura del valor (ej. "<1" → value_qualifier=''<'', value_numeric=1).';

comment on column public.lab_results.method is
  'Método analítico (ej. FTIR, potenciometría). Mismo parámetro puede repetirse con métodos distintos.';

-- -----------------------------------------------------------------------------
-- Integridad — lot debe pertenecer a la misma org que el informe
-- -----------------------------------------------------------------------------
create or replace function public.lab_assert_sample_lot_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_org uuid;
begin
  if new.lot_id is null then
    return new;
  end if;

  select r.organization_id
  into v_report_org
  from public.lab_reports r
  where r.id = new.lab_report_id;

  if v_report_org is null then
    raise exception 'lab_report_not_found';
  end if;

  if not exists (
    select 1
    from public.lots l
    where l.id = new.lot_id
      and l.organization_id = v_report_org
  ) then
    raise exception 'lab_sample_lot_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists lab_samples_lot_org on public.lab_samples;
create trigger lab_samples_lot_org
  before insert or update on public.lab_samples
  for each row
  execute function public.lab_assert_sample_lot_org();

-- -----------------------------------------------------------------------------
-- RLS — lab_reports full CRUD; samples/results heredan visibilidad del informe
-- -----------------------------------------------------------------------------
alter table public.lab_reports enable row level security;
alter table public.lab_samples enable row level security;
alter table public.lab_results enable row level security;

drop policy if exists lab_reports_select on public.lab_reports;
create policy lab_reports_select on public.lab_reports
  for select using (public.organization_ids() @> array[organization_id]);

drop policy if exists lab_reports_insert on public.lab_reports;
create policy lab_reports_insert on public.lab_reports
  for insert with check (public.organization_ids() @> array[organization_id]);

drop policy if exists lab_reports_update on public.lab_reports;
create policy lab_reports_update on public.lab_reports
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);

drop policy if exists lab_reports_delete on public.lab_reports;
create policy lab_reports_delete on public.lab_reports
  for delete using (public.organization_ids() @> array[organization_id]);

drop policy if exists lab_samples_select on public.lab_samples;
create policy lab_samples_select on public.lab_samples
  for select using (
    exists (
      select 1
      from public.lab_reports r
      where r.id = lab_report_id
        and public.organization_ids() @> array[r.organization_id]
    )
  );

drop policy if exists lab_samples_insert on public.lab_samples;
create policy lab_samples_insert on public.lab_samples
  for insert with check (
    exists (
      select 1
      from public.lab_reports r
      where r.id = lab_report_id
        and public.organization_ids() @> array[r.organization_id]
    )
  );

drop policy if exists lab_samples_update on public.lab_samples;
create policy lab_samples_update on public.lab_samples
  for update
  using (
    exists (
      select 1
      from public.lab_reports r
      where r.id = lab_report_id
        and public.organization_ids() @> array[r.organization_id]
    )
  )
  with check (
    exists (
      select 1
      from public.lab_reports r
      where r.id = lab_report_id
        and public.organization_ids() @> array[r.organization_id]
    )
  );

drop policy if exists lab_samples_delete on public.lab_samples;
create policy lab_samples_delete on public.lab_samples
  for delete using (
    exists (
      select 1
      from public.lab_reports r
      where r.id = lab_report_id
        and public.organization_ids() @> array[r.organization_id]
    )
  );

drop policy if exists lab_results_select on public.lab_results;
create policy lab_results_select on public.lab_results
  for select using (
    exists (
      select 1
      from public.lab_samples s
      join public.lab_reports r on r.id = s.lab_report_id
      where s.id = lab_sample_id
        and public.organization_ids() @> array[r.organization_id]
    )
  );

drop policy if exists lab_results_insert on public.lab_results;
create policy lab_results_insert on public.lab_results
  for insert with check (
    exists (
      select 1
      from public.lab_samples s
      join public.lab_reports r on r.id = s.lab_report_id
      where s.id = lab_sample_id
        and public.organization_ids() @> array[r.organization_id]
    )
  );

drop policy if exists lab_results_update on public.lab_results;
create policy lab_results_update on public.lab_results
  for update
  using (
    exists (
      select 1
      from public.lab_samples s
      join public.lab_reports r on r.id = s.lab_report_id
      where s.id = lab_sample_id
        and public.organization_ids() @> array[r.organization_id]
    )
  )
  with check (
    exists (
      select 1
      from public.lab_samples s
      join public.lab_reports r on r.id = s.lab_report_id
      where s.id = lab_sample_id
        and public.organization_ids() @> array[r.organization_id]
    )
  );

drop policy if exists lab_results_delete on public.lab_results;
create policy lab_results_delete on public.lab_results
  for delete using (
    exists (
      select 1
      from public.lab_samples s
      join public.lab_reports r on r.id = s.lab_report_id
      where s.id = lab_sample_id
        and public.organization_ids() @> array[r.organization_id]
    )
  );

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.lab_reports to authenticated;
grant select, insert, update, delete on public.lab_samples to authenticated;
grant select, insert, update, delete on public.lab_results to authenticated;

notify pgrst, 'reload schema';

commit;
