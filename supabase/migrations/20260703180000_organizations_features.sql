-- Epic D (#38) · Issue D6 (#58): org feature flags (E1-lite for numeracion_botellas gating)
-- Spec: docs/WINEMAKER-UX-SPEC.md · docs/INVENTARIO-TERMINADO.md

alter table public.organizations
  add column if not exists features jsonb not null default '{}'::jsonb;

comment on column public.organizations.features is
  'Per-org feature overrides — keys e.g. numeracion_botellas (boolean). Plan defaults apply when absent.';
