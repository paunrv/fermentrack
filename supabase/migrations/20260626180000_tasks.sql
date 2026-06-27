create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  title text not null,
  due_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  completed_at timestamptz
);

create index tasks_organization_id_idx on public.tasks (organization_id);
create index tasks_assigned_to_status_idx on public.tasks (assigned_to, status);
create index tasks_due_at_idx on public.tasks (due_at);

alter table public.tasks enable row level security;

create policy tasks_select on public.tasks
  for select using (public.organization_ids() @> array[organization_id]);

create policy tasks_insert on public.tasks
  for insert with check (public.organization_ids() @> array[organization_id]);

create policy tasks_update on public.tasks
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);

grant select, insert, update on public.tasks to authenticated;
