-- Dirección del cliente (cartera distribuidor)

alter table public.clientes
  add column if not exists direccion text;

notify pgrst, 'reload schema';
