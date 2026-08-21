# PROOF

Operational memory for wine producers. The producer works normally; PROOF does the
remembering.

Currently in **Cycle 1** — the smallest system that can walk into Viñas del Tigre
during an active harvest, capture what has arrived and where it is, and keep pace
as work continues.

This directory is a clean rebuild. The `fermentrack` code alongside it is reference
material only — its domain knowledge is valuable, its architecture is not.

---

## Where this is

**Step 1 of Cycle 1 is complete: tenancy.** Organizations, memberships, RLS, and the
test that proves isolation holds. No features yet, by design — multi-tenancy is the
one thing that cannot be retrofitted, so it exists before anything is built on it.

```
supabase/migrations/   the schema, applied only from here — never by hand
supabase/seed/         organizations, idempotent
tests/rls/             the two-organization isolation suite
docs/adr/              decisions and why they were made
```

## Running the tests

The suite builds a database from nothing but the committed migrations on every run.
That is the point: it continuously proves the repository can still reproduce the
database, which is the guarantee the legacy system lost.

```sh
./scripts/test-rls.sh
```

Needs a Postgres 16 cluster. Point at another with `PGHOST`, `PGPORT`, `PGUSER`.

```sh
# a throwaway local cluster
initdb -D /tmp/proofdb -U postgres --auth=trust
pg_ctl -D /tmp/proofdb -o '-p 5433 -k /tmp' start
```

50 assertions, covering cross-organization reads, write refusal, privilege
escalation attempts, revoked members, suspended organizations, anonymous callers,
and the structural invariants (every table has RLS, no table lacks a policy, `anon`
holds nothing, `authenticated` holds no writes).

`tests/rls/00_supabase_shim.sql` recreates the `auth` schema and roles that a hosted
Supabase project provides. It is **test scaffolding and is never applied to a real
project** — the migrations themselves assume Supabase supplies them.

## Granting someone access

Cycle 1 has no invitation flow. A person signs in through Supabase Auth once, then
is attached deliberately from the server:

```sql
select app.grant_membership('vinas-del-tigre', 'aldo@…', 'owner');
select app.revoke_membership('vinas-del-tigre', 'someone@…');
```

Both are idempotent and both are service-role only. `authenticated` cannot reach
them, and the test proves it.

---

## The rules this is built on

- **The organization is the tenant.** Never the user. ([ADR 0001](docs/adr/0001-organization-is-the-tenant.md))
- **RLS from the first migration**, on every table, with no exceptions.
- **No client-writable value is ever an authorization input.** ([ADR 0002](docs/adr/0002-supabase-auth.md))
- **Default-deny grants.** A table added later is unreachable until someone grants
  it deliberately.
- **Access ends by revocation, not deletion.** Not even the service role can delete
  an organization or a membership.
- **`real` and `synthetic` data are marked**, because development data and Aldo's
  real operation will share this database for months.

## Coming in Cycle 1

Step 2 is the ledger — events and lines carrying quantity, unit, **basis**
(measured / estimated / stated / derived) and a **typed delta reason**. Then the six
harvest events, the lot timeline, capture sheets, and the tank board.

The decisions those steps must preserve: the unit Aldo actually says is the unit
stored, conversions are derived; blend and split exist in the model from the start;
a vessel holds one lot at a time but a lot may occupy many vessels; occupancy is
derived from the ledger and never stored separately; stage labels stay soft
([ADR 0003](docs/adr/0003-no-lot-state-machine-in-cycle-1.md)); Ready to Bottle is a
live assessment, never a boolean; and the model must accept natural-language capture
later without being rebuilt.
