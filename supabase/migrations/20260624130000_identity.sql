create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  settings jsonb not null default '{}'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  full_name text,
  avatar_url text
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  invited_by uuid references public.profiles (id),
  unique (organization_id, user_id)
);

create index if not exists organization_members_organization_id_idx on public.organization_members (organization_id);
create index if not exists organization_members_user_id_idx on public.organization_members (user_id);
create index if not exists organization_members_user_active_idx on public.organization_members (user_id, status)
  where status = 'active';

create or replace function public.organization_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(organization_id),
    '{}'::uuid[]
  )
  from public.organization_members
  where user_id = auth.uid()
    and status = 'active';
$$;

grant execute on function public.organization_ids() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role, status)
  values (new.id, auth.uid(), 'owner', 'active');
  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
  after insert on public.organizations
  for each row
  execute function public.handle_new_organization();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select
  using (id = any (public.organization_ids()));

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
  for insert
  with check (auth.uid() is not null);

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
        and om.role = 'owner'
        and om.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
        and om.role = 'owner'
        and om.status = 'active'
    )
  );

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  using (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists organization_members_select on public.organization_members;
create policy organization_members_select on public.organization_members
  for select
  using (organization_id = any (public.organization_ids()));

drop policy if exists organization_members_insert on public.organization_members;
create policy organization_members_insert on public.organization_members
  for insert
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organization_members.organization_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
        and om.status = 'active'
    )
  );

drop policy if exists organization_members_update on public.organization_members;
create policy organization_members_update on public.organization_members
  for update
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organization_members.organization_id
        and om.user_id = auth.uid()
        and om.role = 'owner'
        and om.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organization_members.organization_id
        and om.user_id = auth.uid()
        and om.role = 'owner'
        and om.status = 'active'
    )
  );

grant select, insert, update on public.organizations to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.organization_members to authenticated;
