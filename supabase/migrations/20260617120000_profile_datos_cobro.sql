-- Datos de cobro frecuentes por perfil (cuenta depósito + constancia fiscal)

alter table public.profiles
  add column if not exists cuenta_deposito text,
  add column if not exists banco_deposito text,
  add column if not exists constancia_fiscal_path text;

comment on column public.profiles.cuenta_deposito is 'CLABE o número de cuenta para que clientes paguen';
comment on column public.profiles.banco_deposito is 'Nombre del banco (opcional)';
comment on column public.profiles.constancia_fiscal_path is 'Ruta en storage (bucket comprobantes) al PDF de constancia fiscal';

notify pgrst, 'reload schema';
