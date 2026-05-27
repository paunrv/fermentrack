-- Estado pagado para deudas a productores (acción "Marcar como pagado")
do $$ begin
  alter type public.estado_deuda_productor add value if not exists 'pagado';
exception
  when duplicate_object then null;
end $$;
