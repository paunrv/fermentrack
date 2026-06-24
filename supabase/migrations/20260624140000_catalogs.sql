create table public.varietals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  color text check (color in ('white', 'red', 'rosé', 'orange')),
  category text not null default 'grape' check (category in ('grape', 'grain', 'agave')),
  unique (organization_id, name)
);

create table public.vintages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  year int not null check (year >= 1800 and year <= 2200),
  notes text,
  status text not null default 'active' check (status in ('planned', 'active', 'completed')),
  unique (organization_id, year)
);

create index vintages_organization_id_year_idx on public.vintages (organization_id, year);

create table public.vineyards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  location text,
  area_ha numeric check (area_ha > 0),
  ownership_type text not null default 'own' check (ownership_type in ('own', 'contracted', 'purchased')),
  notes text
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vineyard_id uuid not null references public.vineyards (id) on delete cascade,
  varietal_id uuid references public.varietals (id) on delete set null,
  name text not null,
  area_ha numeric check (area_ha > 0),
  planted_year int,
  notes text,
  unique (vineyard_id, name)
);

create table public.harvest_cuts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vintage_id uuid not null references public.vintages (id) on delete cascade,
  block_id uuid references public.blocks (id) on delete set null,
  vineyard_id uuid references public.vineyards (id) on delete set null,
  varietal_id uuid references public.varietals (id) on delete set null,
  cut_number int not null default 1,
  intended_style text not null check (
    intended_style in ('sparkling', 'white', 'rosé', 'red', 'orange', 'dessert')
  ),
  cut_date date not null,
  weight_kg numeric check (weight_kg > 0),
  notes text,
  unique (vintage_id, block_id, cut_number)
);

create index harvest_cuts_vintage_id_idx on public.harvest_cuts (vintage_id);
create index harvest_cuts_block_id_idx on public.harvest_cuts (block_id);
create index harvest_cuts_intended_style_idx on public.harvest_cuts (intended_style);

alter table public.varietals enable row level security;
alter table public.vintages enable row level security;
alter table public.vineyards enable row level security;
alter table public.blocks enable row level security;
alter table public.harvest_cuts enable row level security;

create policy varietals_select on public.varietals
  for select using (public.organization_ids() @> array[organization_id]);
create policy varietals_insert on public.varietals
  for insert with check (public.organization_ids() @> array[organization_id]);
create policy varietals_update on public.varietals
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);
create policy varietals_delete on public.varietals
  for delete using (public.organization_ids() @> array[organization_id]);

create policy vintages_select on public.vintages
  for select using (public.organization_ids() @> array[organization_id]);
create policy vintages_insert on public.vintages
  for insert with check (public.organization_ids() @> array[organization_id]);
create policy vintages_update on public.vintages
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);

create policy vineyards_select on public.vineyards
  for select using (public.organization_ids() @> array[organization_id]);
create policy vineyards_insert on public.vineyards
  for insert with check (public.organization_ids() @> array[organization_id]);
create policy vineyards_update on public.vineyards
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);
create policy vineyards_delete on public.vineyards
  for delete using (public.organization_ids() @> array[organization_id]);

create policy blocks_select on public.blocks
  for select using (public.organization_ids() @> array[organization_id]);
create policy blocks_insert on public.blocks
  for insert with check (public.organization_ids() @> array[organization_id]);
create policy blocks_update on public.blocks
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);
create policy blocks_delete on public.blocks
  for delete using (public.organization_ids() @> array[organization_id]);

create policy harvest_cuts_select on public.harvest_cuts
  for select using (public.organization_ids() @> array[organization_id]);
create policy harvest_cuts_insert on public.harvest_cuts
  for insert with check (public.organization_ids() @> array[organization_id]);
create policy harvest_cuts_update on public.harvest_cuts
  for update
  using (public.organization_ids() @> array[organization_id])
  with check (public.organization_ids() @> array[organization_id]);

grant select, insert, update, delete on public.varietals to authenticated;
grant select, insert, update on public.vintages to authenticated;
grant select, insert, update, delete on public.vineyards to authenticated;
grant select, insert, update, delete on public.blocks to authenticated;
grant select, insert, update on public.harvest_cuts to authenticated;
