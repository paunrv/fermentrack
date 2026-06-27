-- Restaura perfiles PROOF (brewer/winemaker/distiller/distributor) separados de auth.profiles.
-- Tras identity.sql, la app seguía consultando public.profiles con clerk_id/profile_type_v2.

do $rename_legacy$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles_clerk_legacy'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'proof_profiles'
  ) then
    alter table public.profiles_clerk_legacy rename to proof_profiles;
  end if;
end;
$rename_legacy$;

alter table public.proof_profiles
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists proof_profiles_user_id_idx on public.proof_profiles (user_id);

update public.proof_profiles
set user_id = clerk_id::uuid
where user_id is null
  and clerk_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

create or replace function public.proof_profiles_set_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null
    and new.clerk_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    new.user_id := new.clerk_id::uuid;
  end if;
  return new;
end;
$$;

drop trigger if exists proof_profiles_set_user_id on public.proof_profiles;
create trigger proof_profiles_set_user_id
  before insert or update on public.proof_profiles
  for each row
  execute function public.proof_profiles_set_user_id();

alter table public.proof_profiles enable row level security;

do $drop_proof_profiles_policies$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'proof_profiles'
  loop
    execute format('drop policy if exists %I on public.proof_profiles', pol.policyname);
  end loop;
end;
$drop_proof_profiles_policies$;

create policy proof_profiles_select on public.proof_profiles
  for select
  using (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  );

create policy proof_profiles_insert on public.proof_profiles
  for insert
  with check (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
  );

create policy proof_profiles_update on public.proof_profiles
  for update
  using (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
    or proof.auth_has_staff_access_to_scope(clerk_id, profile_type_v2)
  )
  with check (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
  );

create policy proof_profiles_delete on public.proof_profiles
  for delete
  using (
    user_id = auth.uid()
    or clerk_id = auth.uid()::text
  );

grant select, insert, update, delete on public.proof_profiles to authenticated, service_role;

-- batches: columnas de scope usadas en onboarding (brewer/winemaker/distiller)
alter table if exists public.batches add column if not exists clerk_id text;
alter table if exists public.batches add column if not exists profile_type_v2 text;
create index if not exists batches_scope_idx on public.batches (clerk_id, profile_type_v2);

notify pgrst, 'reload schema';
