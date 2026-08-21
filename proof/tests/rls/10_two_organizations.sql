-- =============================================================================
-- PROOF · Cycle 1 · Step 1 — The two-organization test
--
-- The one test that cannot be skipped. It answers a single question:
--
--     Can a member of one organization observe, or touch, anything belonging
--     to another?
--
-- Every assertion runs as a genuinely unprivileged `authenticated` role with a
-- forged JWT claim, which is exactly the posture of an attacker calling the
-- Data API directly with a valid session and someone else's identifiers. The
-- UI is not involved and is not a boundary.
-- =============================================================================

create schema if not exists t;

create table t.results (
  seq   serial primary key,
  name  text not null,
  want  text,
  got   text,
  ok    boolean generated always as (got is not distinct from want) stored
);

-- Test-only schema in a throwaway database; the wide grants let assertions be
-- recorded from inside an impersonated session.
grant usage on schema t to anon, authenticated, service_role;
grant all on t.results to anon, authenticated, service_role;
grant all on sequence t.results_seq_seq to anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- Fixtures
--
-- Two real organizations that must never see each other, plus the three cases
-- that break naive implementations: a user with no membership at all, a user
-- whose membership was revoked, and a user whose membership is active inside a
-- suspended organization.
-- -----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'aldo@vinasdeltigre.example'),
  ('22222222-2222-2222-2222-222222222222', 'maria@vinasdeltigre.example'),
  ('33333333-3333-3333-3333-333333333333', 'carlos@otherwinery.example'),
  ('44444444-4444-4444-4444-444444444444', 'dana@nobody.example'),
  ('55555555-5555-5555-5555-555555555555', 'erik@vinasdeltigre.example'),
  ('66666666-6666-6666-6666-666666666666', 'frank@dormant.example');

insert into public.organizations (id, slug, name, status, data_origin) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'vinas-del-tigre', 'Viñas del Tigre', 'active',    'real'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'other-winery',    'Other Winery',    'active',    'synthetic'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dormant-co',      'Dormant Co',      'suspended', 'synthetic');

insert into public.memberships (organization_id, user_id, role, status, accepted_at, revoked_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner',    'active',  now(), null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'operator', 'active',  now(), null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'owner',    'active',  now(), null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'operator', 'revoked', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 'owner',    'active',  now(), null);


-- =============================================================================
-- ALDO — owner at Viñas del Tigre
-- =============================================================================
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into t.results (name, want, got)
select 'aldo sees exactly one organization', '1', count(*)::text from public.organizations;

insert into t.results (name, want, got)
select 'aldo''s organization is Viñas del Tigre', 'vinas-del-tigre',
       coalesce(max(slug), '<none>') from public.organizations;

insert into t.results (name, want, got)
select 'aldo cannot see the other winery', '0', count(*)::text
from public.organizations where slug = 'other-winery';

-- Membership history is visible inside the organization, revocations included.
-- The requirement is that access never changes silently, so an owner must be
-- able to see that somebody's access ended. Hiding revoked rows would be an
-- audit gap wearing the costume of a privacy feature.
insert into t.results (name, want, got)
select 'aldo sees every membership row of his org', '3', count(*)::text
from public.memberships;

insert into t.results (name, want, got)
select 'two of them are active members', '2', count(*)::text
from public.memberships where status = 'active';

insert into t.results (name, want, got)
select 'aldo can see that a former member was revoked', '1', count(*)::text
from public.memberships where status = 'revoked';

insert into t.results (name, want, got)
select 'aldo sees no membership of another org', '0', count(*)::text
from public.memberships
where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

insert into t.results (name, want, got)
select 'aldo sees his own profile', '1', count(*)::text
from public.profiles where id = '11111111-1111-1111-1111-111111111111';

insert into t.results (name, want, got)
select 'aldo sees his teammate''s profile', '1', count(*)::text
from public.profiles where id = '22222222-2222-2222-2222-222222222222';

insert into t.results (name, want, got)
select 'aldo cannot see a stranger''s profile', '0', count(*)::text
from public.profiles where id = '33333333-3333-3333-3333-333333333333';

insert into t.results (name, want, got)
select 'is_member_of returns false for a foreign org', 'false',
       app.is_member_of('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')::text;

insert into t.results (name, want, got)
select 'is_member_of returns true for his own org', 'true',
       app.is_member_of('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text;

insert into t.results (name, want, got)
select 'aldo holds the owner role', 'true',
       app.has_org_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array['owner']::public.membership_role[])::text;


-- Write attempts. Cycle 1 has no client write path at all: organizations and
-- memberships are managed server-side with the service role. Both the missing
-- policies and the revoked grants must refuse these.
do $$
begin
  begin
    insert into public.organizations (slug, name) values ('forged', 'Forged Winery');
    insert into t.results (name, want, got) values ('aldo cannot create an organization', 'denied', 'ALLOWED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('aldo cannot create an organization', 'denied', 'denied');
  end;

  begin
    update public.organizations set name = 'Seized' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    insert into t.results (name, want, got) values ('aldo cannot rename a foreign organization', 'denied', 'ALLOWED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('aldo cannot rename a foreign organization', 'denied', 'denied');
  end;

  begin
    update public.organizations set name = 'Renamed' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    insert into t.results (name, want, got) values ('aldo cannot rename even his own organization', 'denied', 'ALLOWED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('aldo cannot rename even his own organization', 'denied', 'denied');
  end;

  begin
    delete from public.organizations where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    insert into t.results (name, want, got) values ('aldo cannot delete his organization', 'denied', 'ALLOWED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('aldo cannot delete his organization', 'denied', 'denied');
  end;

  -- The legacy system's fatal flaw, attempted directly: grant yourself access
  -- to somebody else's tenant by writing a membership row.
  begin
    insert into public.memberships (organization_id, user_id, role)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'owner');
    insert into t.results (name, want, got) values ('aldo cannot grant himself a foreign membership', 'denied', 'ALLOWED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('aldo cannot grant himself a foreign membership', 'denied', 'denied');
  end;

  begin
    update public.memberships set role = 'owner'
    where user_id = '11111111-1111-1111-1111-111111111111';
    insert into t.results (name, want, got) values ('aldo cannot edit his own membership row', 'denied', 'ALLOWED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('aldo cannot edit his own membership row', 'denied', 'denied');
  end;
end $$;


-- =============================================================================
-- MARIA — operator at the same organization
-- =============================================================================
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

insert into t.results (name, want, got)
select 'maria sees the same single organization', '1', count(*)::text from public.organizations;

insert into t.results (name, want, got)
select 'maria does not hold the owner role', 'false',
       app.has_org_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array['owner']::public.membership_role[])::text;

insert into t.results (name, want, got)
select 'maria does hold the operator role', 'true',
       app.has_org_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array['operator']::public.membership_role[])::text;


-- =============================================================================
-- CARLOS — the other winery. The mirror image must also hold.
-- =============================================================================
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

insert into t.results (name, want, got)
select 'carlos sees exactly one organization', '1', count(*)::text from public.organizations;

insert into t.results (name, want, got)
select 'carlos''s organization is the other winery', 'other-winery',
       coalesce(max(slug), '<none>') from public.organizations;

insert into t.results (name, want, got)
select 'carlos cannot see Viñas del Tigre', '0', count(*)::text
from public.organizations where slug = 'vinas-del-tigre';

insert into t.results (name, want, got)
select 'carlos sees no membership from the other org', '0', count(*)::text
from public.memberships
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

insert into t.results (name, want, got)
select 'carlos cannot see aldo''s profile', '0', count(*)::text
from public.profiles where id = '11111111-1111-1111-1111-111111111111';


-- =============================================================================
-- The three cases that break naive implementations
-- =============================================================================

-- Authenticated, but a member of nothing.
set request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

insert into t.results (name, want, got)
select 'a user with no membership sees no organization', '0', count(*)::text from public.organizations;

insert into t.results (name, want, got)
select 'a user with no membership sees no membership', '0', count(*)::text from public.memberships;

insert into t.results (name, want, got)
select 'a user with no membership sees only their own profile', '1', count(*)::text from public.profiles;

-- Revoked. Access must end the moment status changes, with no session replay.
set request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

insert into t.results (name, want, got)
select 'a revoked member sees no organization', '0', count(*)::text from public.organizations;

insert into t.results (name, want, got)
select 'a revoked member sees no membership', '0', count(*)::text from public.memberships;

-- Active membership, suspended organization. Deactivating an organization must
-- lock out every member at once.
set request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';

insert into t.results (name, want, got)
select 'a member of a suspended org sees nothing', '0', count(*)::text from public.organizations;


-- =============================================================================
-- ANON — the unauthenticated caller holding only the publishable key
-- =============================================================================
set role anon;
set request.jwt.claims = '{"role":"anon"}';

do $$
begin
  begin
    insert into t.results (name, want, got)
    select 'anon sees no organization', '0', count(*)::text from public.organizations;
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('anon sees no organization', '0', '0');
  end;

  begin
    insert into t.results (name, want, got)
    select 'anon sees no membership', '0', count(*)::text from public.memberships;
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('anon sees no membership', '0', '0');
  end;

  begin
    insert into t.results (name, want, got)
    select 'anon sees no profile', '0', count(*)::text from public.profiles;
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('anon sees no profile', '0', '0');
  end;
end $$;


-- =============================================================================
-- MEMBERSHIP ADMINISTRATION
--
-- The admin path must be unreachable from a session, and idempotent from the
-- server. Onboarding that cannot be retried safely is onboarding that strands
-- somebody halfway.
-- =============================================================================
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
begin
  begin
    perform app.grant_membership('other-winery', 'aldo@vinasdeltigre.example', 'owner');
    insert into t.results (name, want, got) values ('authenticated cannot call grant_membership', 'denied', 'ALLOWED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('authenticated cannot call grant_membership', 'denied', 'denied');
  end;

  begin
    perform app.revoke_membership('other-winery', 'carlos@otherwinery.example');
    insert into t.results (name, want, got) values ('authenticated cannot call revoke_membership', 'denied', 'ALLOWED');
  exception when insufficient_privilege then
    insert into t.results (name, want, got) values ('authenticated cannot call revoke_membership', 'denied', 'denied');
  end;
end $$;

reset role;
set role service_role;

do $$
declare v_first uuid; v_second uuid;
begin
  v_first  := (app.grant_membership('vinas-del-tigre', 'dana@nobody.example', 'operator')).id;
  v_second := (app.grant_membership('vinas-del-tigre', 'dana@nobody.example', 'operator')).id;

  insert into t.results (name, want, got)
  values ('granting the same membership twice is idempotent', 'true', (v_first = v_second)::text);
end $$;

insert into t.results (name, want, got)
select 'the repeated grant produced exactly one row', '1', count(*)::text
from public.memberships
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and user_id = '44444444-4444-4444-4444-444444444444';

do $$
begin
  perform app.revoke_membership('vinas-del-tigre', 'dana@nobody.example');
end $$;

insert into t.results (name, want, got)
select 'revocation is recorded, not deleted', 'revoked', status::text
from public.memberships
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and user_id = '44444444-4444-4444-4444-444444444444';

insert into t.results (name, want, got)
select 'revocation stamps a timestamp', 'true', (revoked_at is not null)::text
from public.memberships
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and user_id = '44444444-4444-4444-4444-444444444444';

-- Re-granting must restore access cleanly rather than stranding a revoked row.
do $$
begin
  perform app.grant_membership('vinas-del-tigre', 'dana@nobody.example', 'viewer');
end $$;

insert into t.results (name, want, got)
select 're-granting clears the revocation', 'active|', status::text || '|' || coalesce(revoked_at::text, '')
from public.memberships
where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and user_id = '44444444-4444-4444-4444-444444444444';

reset role;
set role authenticated;
set request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

insert into t.results (name, want, got)
select 'the newly granted member now sees the organization', '1', count(*)::text
from public.organizations;


-- =============================================================================
-- STRUCTURAL INVARIANTS
--
-- These are the cheap static gates that would have caught most of what the
-- legacy audit found, without any database access at all.
-- =============================================================================
reset role;
reset request.jwt.claims;

insert into t.results (name, want, got)
select 'not even the service role may delete an organization', '0', count(*)::text
from information_schema.role_table_grants
where grantee = 'service_role' and table_schema = 'public'
  and privilege_type in ('DELETE', 'TRUNCATE');

insert into t.results (name, want, got)
select 'every table in public has RLS enabled', '0', count(*)::text
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

insert into t.results (name, want, got)
select 'every RLS table in public has at least one policy', '0', count(*)::text
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policy p where p.polrelid = c.oid);

insert into t.results (name, want, got)
select 'anon holds no privilege on any table in public', '0', count(*)::text
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';

insert into t.results (name, want, got)
select 'authenticated holds no write privilege in public', '0', count(*)::text
from information_schema.role_table_grants
where grantee = 'authenticated' and table_schema = 'public'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');

insert into t.results (name, want, got)
select 'every security-definer function pins its search_path', '0', count(*)::text
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('app', 'public')
  and p.prosecdef
  and not exists (
    select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
    where cfg like 'search\_path=%'
  );
