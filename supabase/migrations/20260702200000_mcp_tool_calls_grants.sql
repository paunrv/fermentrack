-- PostgREST requires explicit GRANTs (see skus_grants migration).
-- service_role only — audit log is not exposed to authenticated clients.

grant select, insert on public.mcp_tool_calls to service_role;

notify pgrst, 'reload schema';
