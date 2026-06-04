-- Campos para acciones del agente destilador (aditivo)

alter table public.corridas_embotellado
  add column if not exists fecha_embotellado date;

alter table public.lotes
  add column if not exists precio_venta numeric(14, 2)
    check (precio_venta is null or precio_venta >= 0);

alter table public.lotes
  add column if not exists nota text;

alter table public.lotes
  add column if not exists fecha_embotellado_programada date;

comment on column public.corridas_embotellado.fecha_embotellado is 'Fecha programada/real de embotellado (agente PROOF)';
comment on column public.lotes.precio_venta is 'Precio de venta referencia del lote';
comment on column public.lotes.nota is 'Nota libre del lote';
comment on column public.lotes.fecha_embotellado_programada is 'Fecha programada de embotellado (agente PROOF)';

-- Refrescar caché PostgREST para que la API vea las columnas nuevas
notify pgrst, 'reload schema';
