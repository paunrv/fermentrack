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

**Steps 1–4 of Cycle 1 are complete: tenancy, the ledger, the capture layer, and
the first screen.** Organizations and memberships with RLS proven by test; the event
ledger that records what physically happened; six operations named for what a person
does; and the lot timeline that reads it all back.

Each layer is proven by scripted scenarios before the next is built on it.

```
supabase/migrations/   the schema, applied only from here — never by hand
supabase/seed/         organizations and units, idempotent
tests/rls/             isolation + ledger scenarios A–I + a full harvest, captured
web/                   the Next.js app — currently the lot timeline
docs/capture-operations.md   the six operations, in the operator's words
docs/adr/              decisions and why they were made
```

## The four layers

They are kept apart on purpose, and none of them may collapse into another.

| Layer | Question | Where it lives |
|---|---|---|
| Protocol | what we planned to do | `protocols`, `protocol_steps`, `protocol_runs`, `protocol_run_steps` |
| Event | what actually happened | `events` |
| Ledger | what physically changed | `ledger_lines` |
| Derived state | what is true right now | views only — never a column |
| AI | what it means, what is next | later cycles |

A lot has no volume column, no location column and no stage column. All three
change constantly and all three are derived from the ledger; storing any of them
would create the second source of truth this design exists to prevent. A
structural test asserts those columns never appear.

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

178 assertions in four suites.

**Isolation (50)** — cross-organization reads, write refusal, privilege escalation
attempts, revoked members, suspended organizations, anonymous callers, and the
structural invariants.

**Ledger (57)** — one wine lot followed from fruit to bottles: harvest, pressing,
fermentation, racking with loss, split, blend, bottling, breakage and a physical
count. Then eight attacks that try to make the ledger lie, and each must be
refused.

**Capture (49)** — a whole harvest recorded the way it will be at the winery: as an
ordinary signed-in session calling the six operations with the numbers a person
actually has. Plus the refusals that protect the operator from recording nonsense.

**Timeline (22)** — that the story reads in human language, follows the wine back
through its ancestry, carries a running balance, and is a projection rather than a
stored table.

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
- **Movement nets to zero; everything else names its reason.**
  ([ADR 0004](docs/adr/0004-movement-nets-to-zero.md))
- **Recorded history is immutable.** Corrections are recorded, never applied in place.
- **Every view is `security_invoker`** — a view without it runs as its owner and
  silently bypasses RLS. A structural test enforces this.
- **The screen stores nothing.** The timeline is a projection; no table may grow a
  `current_volume`, `current_stage` or `current_location`
  ([ADR 0008](docs/adr/0008-timeline-is-a-projection.md)).

## Recording what happened

Six operations, named for what a person does. See
[the capture operations](docs/capture-operations.md) for the full mapping.

```sql
select public.capture_reception(org, '2026-08-18', 'CS-26-H', 2.4, 't',
                                p_vessel_code => 'BIN-A', p_source => 'La Cañada');

select public.capture_transfer(org, now(), 'MST-26-H', 1730, 'L',
         jsonb_build_array(jsonb_build_object('vessel_code','TK-B','quantity',1700)));
```

That second call is the whole idea: the operator gives two real numbers, and PROOF
works out that thirty litres are unaccounted for, insists they carry a reason, and
writes the movement legs so they cancel. Nobody types a delta
([ADR 0007](docs/adr/0007-capture-speaks-operational-language.md)).

Underneath, `app.record_event()` remains the only way to write history — it checks
membership, builds the event, lines and lineage atomically, and the deferred
constraint triggers validate the whole set at commit. Recorded history is then
immutable: a mistake is fixed by recording a correction, which leaves both the
error and the fix visible.

## Running the screen

```sh
./scripts/dev-db.sh          # builds proof_dev and records a demo harvest
cd web && npm install && npm run dev
```

Every query runs as `authenticated` with the signed-in user's claims set on the
transaction — the same posture PostgREST gives a Supabase client — so the database,
not the app, decides what a person may see.

Cycle 1 has no sign-in screen yet, so the session comes from `PROOF_DEV_USER`. That
shortcut asks the database what environment it is and refuses to work anywhere
calling itself production, so a misconfigured deploy fails closed.

## Coming next in Cycle 1

Steps 5–7: capture sheets, the tank board, and a dry run before the winery.

Decisions the remaining steps must preserve: the unit Aldo actually says is the
unit stored, conversions are derived; blend and split are already in the model;
occupancy is derived and never stored ([ADR 0005](docs/adr/0005-vessel-lot-cardinality.md));
stage labels stay soft ([ADR 0003](docs/adr/0003-no-lot-state-machine-in-cycle-1.md));
Ready to Bottle is a live assessment, never a boolean; and the model must accept
natural-language capture later without being rebuilt — which is why the words
Aldo uses are stored verbatim ([ADR 0006](docs/adr/0006-generic-event-kinds.md)).
