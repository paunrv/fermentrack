-- Team invites: platform profile (winemaker | bodega) + 4-digit access code hash.

alter table public.organization_members
  add column if not exists platform_profile text
    check (platform_profile is null or platform_profile in ('winemaker', 'bodega'));

alter table public.organization_members
  add column if not exists access_code_hash text;

comment on column public.organization_members.platform_profile is
  'PROOF platform level for invited team members (winemaker | bodega).';

comment on column public.organization_members.access_code_hash is
  'SHA-256 hash of invite access code; cleared when invite is accepted.';

-- Invited users must read their own pending membership during onboarding.
drop policy if exists organization_members_select_own on public.organization_members;
create policy organization_members_select_own on public.organization_members
  for select
  using (user_id = auth.uid());

-- Invited users activate themselves after code validation (status invited → active).
drop policy if exists organization_members_update_own_invite on public.organization_members;
create policy organization_members_update_own_invite on public.organization_members
  for update
  using (user_id = auth.uid() and status = 'invited')
  with check (user_id = auth.uid() and status = 'active');
