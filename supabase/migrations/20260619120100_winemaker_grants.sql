-- PROOF · Winemaker — grants Data API
-- Aditivo · idempotente

grant select, insert, update, delete on public.wm_wine_lots to authenticated, service_role;
grant select, insert on public.wm_documents to authenticated, service_role;
grant select, insert, update, delete on public.wm_production_costs to authenticated, service_role;
grant select, insert on public.wm_events to authenticated, service_role;

grant usage on type public.wm_wine_lot_status to authenticated, service_role;
grant usage on type public.wm_document_type to authenticated, service_role;
grant usage on type public.wm_cost_category to authenticated, service_role;
grant usage on type public.wm_allocation_method to authenticated, service_role;
grant usage on type public.wm_event_type to authenticated, service_role;
