-- Service role removes cancelled invites from server actions (removeTeamMember).

grant delete on public.organization_members to service_role;
