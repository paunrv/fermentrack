-- BYOA Phase 5 (#30) — MCP write audit log
begin;

create table if not exists public.mcp_tool_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid null references public.organizations (id) on delete set null,
  profile_type text not null,
  tool_name text not null,
  idempotency_key text null,
  status text not null check (status in ('success', 'error', 'replay')),
  error_message text null,
  created_at timestamptz not null default now()
);

comment on table public.mcp_tool_calls is
  'Audit trail for MCP write tool invocations. Inserts via service role only.';

create index if not exists mcp_tool_calls_user_created_idx
  on public.mcp_tool_calls (user_id, created_at desc);

create index if not exists mcp_tool_calls_org_created_idx
  on public.mcp_tool_calls (organization_id, created_at desc)
  where organization_id is not null;

alter table public.mcp_tool_calls enable row level security;

-- No policies: authenticated users cannot read/write via Data API; service role bypasses RLS.

commit;
