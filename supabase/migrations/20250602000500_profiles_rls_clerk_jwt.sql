-- PROOF · profiles RLS — Clerk JWT (sub / clerk_id), no auth.uid()
-- Corrige 403 en ProfileContext tras login con template supabase.
-- Aditivo · idempotente

-- JWT: sub y clerk_id (template Clerk) → clerk_id columna text
create or replace function proof.current_clerk_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'sub', ''),
    nullif(auth.jwt() ->> 'clerk_id', ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'clerk_id', ''),
    nullif(current_setting('app.clerk_id', true), '')
  );
$$;

grant execute on function proof.current_clerk_id() to authenticated, anon, service_role;

alter table public.profiles enable row level security;

-- Elimina políticas legacy (p. ej. auth.uid() = clerk_id creadas en Dashboard)
do $drop_profiles_policies$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end;
$drop_profiles_policies$;

create policy profiles_select on public.profiles
  for select
  using (
    proof.is_super_user()
    or clerk_id = proof.current_clerk_id()
  );

create policy profiles_insert on public.profiles
  for insert
  with check (
    proof.is_super_user()
    or clerk_id = proof.current_clerk_id()
  );

create policy profiles_update on public.profiles
  for update
  using (
    proof.is_super_user()
    or clerk_id = proof.current_clerk_id()
  )
  with check (
    proof.is_super_user()
    or clerk_id = proof.current_clerk_id()
  );

create policy profiles_delete on public.profiles
  for delete
  using (
    proof.is_super_user()
    or clerk_id = proof.current_clerk_id()
  );

grant select, insert, update, delete on public.profiles to authenticated, service_role;
