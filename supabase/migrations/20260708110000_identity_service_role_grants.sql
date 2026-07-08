-- PostgREST service_role bypasses RLS but still needs explicit GRANTs.
-- Without these, server actions using createServiceSupabase() fail with 42501
-- (e.g. inviteTeamMember, fetchTeamMembers, team onboarding).

grant select, insert, update on public.organizations to authenticated, service_role;
grant select, insert, update on public.organization_members to authenticated, service_role;
grant select, update on public.profiles to authenticated, service_role;
grant select on public.plan_limites to authenticated, service_role;
