-- =============================================================================
-- PROOF · Cycle 1 seed
--
-- Safe to run more than once. Creates no users: a person must sign in through
-- Supabase Auth at least once before they can be granted a membership, so that
-- identity always originates from the auth provider rather than from a script.
--
-- Run with the service role, and read app.environment first.
-- =============================================================================

-- Declare what this database is. Every destructive tool should read this before
-- acting, because a project name is not an environment.
insert into app.environment (id, name, label)
values (true, 'development', 'local')
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- Organizations
--
-- Viñas del Tigre is a real winery and its operational data will be real from
-- the first event. It is marked accordingly, and everything we invent during
-- development lives in a separate organization marked synthetic. The two must
-- never be confused, which is why the distinction is a column and not a
-- convention.
-- -----------------------------------------------------------------------------
insert into public.organizations (slug, name, status, data_origin) values
  ('vinas-del-tigre', 'Viñas del Tigre', 'active', 'real')
on conflict (slug) do nothing;

insert into public.organizations (slug, name, status, data_origin) values
  ('proof-sandbox', 'PROOF Sandbox', 'active', 'synthetic')
on conflict (slug) do nothing;


-- -----------------------------------------------------------------------------
-- Granting access, once the person has signed in
-- -----------------------------------------------------------------------------
--   select app.grant_membership('vinas-del-tigre', 'aldo@…', 'owner');
--   select app.revoke_membership('vinas-del-tigre', 'someone@…');
--
-- Both are idempotent and both are service-role only.
