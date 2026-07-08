-- Invited team members must read org name during onboarding (organization_ids() is active-only).

drop policy if exists organizations_select on public.organizations;

create policy organizations_select on public.organizations
  for select
  using (
    id = any (public.organization_ids())
    or exists (
      select 1
      from public.organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
        and om.status = 'invited'
    )
  );
