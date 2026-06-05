-- Anticipo en pedidos + unidad en líneas (latas / botellas / cajas)

alter table public.pedidos
  add column if not exists anticipo boolean not null default false;

alter table public.items_pedido
  add column if not exists unidad text default 'botellas'
    check (unidad in ('latas', 'botellas', 'cajas'));

notify pgrst, 'reload schema';
