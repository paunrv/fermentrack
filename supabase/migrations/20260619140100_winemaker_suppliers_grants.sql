grant select, insert, update, delete on public.wm_suppliers to authenticated, service_role;
grant select, insert on public.wm_document_lines to authenticated, service_role;
grant usage on type public.wm_supply_kind to authenticated, service_role;
