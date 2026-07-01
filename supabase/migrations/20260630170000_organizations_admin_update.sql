-- Epic #3 issue #10 — owner y admin pueden editar nombre de la org
begin;

drop policy if exists organizations_update on public.organizations;

create policy organizations_update on public.organizations
  for update
  using (public.can_manage_org(id))
  with check (public.can_manage_org(id));

commit;
