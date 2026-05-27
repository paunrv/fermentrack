-- Asegurar tabla profiles + columnas para super-usuario y perfiles extra

create table if not exists profiles (
  clerk_id text primary key,
  username text,
  profile_type text check (profile_type in ('brewer', 'winemaker', 'distiller', 'distributor')),
  onboarding_complete boolean not null default false,
  is_super_user boolean not null default false,
  extra_profiles text[] not null default '{}',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles add column if not exists is_super_user boolean not null default false;
alter table profiles add column if not exists extra_profiles text[] not null default '{}';
alter table profiles add column if not exists email text;
alter table profiles add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_email_idx on profiles(email);
