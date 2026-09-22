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

**Steps 1–8 of Cycle 1 are complete: tenancy, the ledger, the capture layer, the
lot timeline, the capture sheets, the tank board, a dry run against all of it,
and the first fidelity fix it demanded.** Organizations and memberships with RLS proven by test; the event
ledger that records what physically happened; six operations named for what a person
does; the lot timeline that reads it all back; and the sheets a person actually
types into, with the pace they demand measured rather than assumed; and the board
that answers where the next load can go.

Each layer is proven by scripted scenarios before the next is built on it.

Step 7 then read a harvest morning through the finished build and wrote down where
it came apart. Pace held; fidelity did not. Twelve findings, each paired with a
verified claim about what the ledger ends up not knowing:
**[dry run 01](docs/dry-run-01.md)**.

Step 8 then fixed the worst of them — the one where PROOF wrote down 525 L of
wine as evaporated because the transfer sheet took one destination and the
operator named two: **[F1](docs/f1-multi-destination.md)**.

```
supabase/migrations/   the schema, applied only from here — never by hand
supabase/seed/         organizations and units, idempotent
tests/rls/             isolation + ledger scenarios A–I + a full harvest, captured
web/                   the Next.js app — the cellar, the lot timeline, the tank board
docs/capture-operations.md   the six operations, in the operator's words
docs/dry-run-01.md     what a harvest morning does to the build, and what it loses
docs/f1-multi-destination.md  the first of those findings, fixed and proved
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

232 SQL assertions in six suites, plus three browser-driven runs.

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

**Tank board (19)** — that occupancy agrees with the lot, that litres and kilograms
are never added together, that an over-full tank is flagged rather than shown as a
negative, and that a vessel nobody has measured is reported as unknown rather than
counted as empty.

**Destinations (27)** — that "Tank 7 and Tank 8, about half each" records two
tanks and no loss; exact, partial and three-way transfers; lineage in both
directions; and that an unexplained gap is refused rather than named for the
operator.

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
- **Missing information is never turned into a physical loss.** An unknown
  destination is not a loss, an unknown quantity is not zero, and a correction is
  not a spill ([ADR 0011](docs/adr/0011-missing-information-is-not-a-loss.md)).
- **Recorded history is immutable.** Corrections are recorded, never applied in place.
- **Every view is `security_invoker`** — a view without it runs as its owner and
  silently bypasses RLS. A structural test enforces this.
- **The screen stores nothing.** The timeline and the tank board are projections; no
  table may grow a `current_volume`, `current_stage` or `current_location`
  ([ADR 0008](docs/adr/0008-timeline-is-a-projection.md)).
- **What PROOF does not know, it says.** A vessel with no recorded size is reported
  as unknown and left out of the totals, never counted as zero
  ([ADR 0010](docs/adr/0010-unknown-capacity-is-reported.md)).

## Recording what happened

Six operations, named for what a person does. See
[the capture operations](docs/capture-operations.md) for the full mapping.

```sql
select public.capture_reception(org, '2026-08-18', 'CS-26-H', 2.4, 't',
                                p_vessel_code => 'BIN-A', p_source => 'La Cañada');

select public.capture_transfer(org, now(), 'MST-26-H', 1730, 'L',
         jsonb_build_array(jsonb_build_object('vessel_code','TK-B','quantity',1700)),
         p_shortfall_reason => 'expected_loss');
```

That second call is the whole idea: the operator gives two real numbers, and PROOF
works out that thirty litres are unaccounted for, insists they carry a reason, and
writes the movement legs so they cancel. Nobody types a delta
([ADR 0007](docs/adr/0007-capture-speaks-operational-language.md)).

The reason is spelled out because there is no default for it. Wine can go to
several tanks at once, so a gap between what left and what arrived might be lees
— or might be a tank nobody has mentioned yet. PROOF asks rather than deciding
([ADR 0011](docs/adr/0011-missing-information-is-not-a-loss.md)).

Underneath, `app.record_event()` remains the only way to write history — it checks
membership, builds the event, lines and lineage atomically, and the deferred
constraint triggers validate the whole set at commit. Recorded history is then
immutable: a mistake is fixed by recording a correction, which leaves both the
error and the fix visible.

## Measuring the pace

Step 5's gate is whether capture can keep up with somebody talking, so it is
measured rather than asserted:

```sh
cd web && npm run start &      # the app must be running
./scripts/pace.sh
```

It drives a real browser through a transcript of things a winemaker says and
counts every interaction. Currently **32 interactions for six operations**. Over
budget fails. It is a ratchet, not a proof — only Aldo can say whether it is fast
enough ([ADR 0009](docs/adr/0009-capture-pace-is-measured.md)).

## Taking it to the winery

One command leaves PROOF open in a browser, holding Viñas del Tigre's real
data, on a laptop with no internet:

```sh
PROOF_OPERATOR=you@example.com ./scripts/field.sh tigre    # Aldo
PROOF_OPERATOR=you@example.com ./scripts/field.sh pijoan   # Silvana
./scripts/backup.sh                                        # everything, in one file
```

**One winery per session, by construction.** The two field sites are separate
tenants whose data must never be read together, so each gets its own sign-in
derived from yours — `you@example.com` becomes
`you+vinas-del-tigre@example.com` — and the script refuses to start if that user
can see more than one. It also takes a backup before touching anything, because
the database holds every visit before this one.

See [the field experiment](field/README.md) for how the sessions are run.

Migrations are applied once and remembered, in a schema of the runner's own.
Not an optimisation: `create or replace view` refuses to drop a column, so
replaying an early migration over a later one fails outright, and every session
after the first would have died on startup. A hosted Supabase project tracks
applied migrations for the same reason.

The difference from `dev-db.sh` matters: **`field.sh` never drops anything.**
`dev-db.sh` rebuilds from empty on every run because that is what a test needs.
The field database is the only copy of what Aldo said, so it is created once and
then only ever migrated forward. It lives in `proof/.data/` and is never
committed.

A laptop has no Supabase, so the same shim the tests use stands in for the auth
schema, and the one operator is created by the script rather than by signing in.
That is the only thing in the setup that would not exist against a real project.

### Rehearsing first

```sh
./scripts/rehearsal.sh
```

Aldo's own Colombard Pet Nat notebook, read into PROOF through the real browser
against a throwaway database, ending with the board printed as he would see it.
Currently **10 of 10 notebook entries recorded in 52 interactions**, and six
things in his own vintage that the model cannot hold yet — listed by the run, so
the next thing to build comes from his vintage rather than from a roadmap.

The gate is not the count. It is whether he reads the board and says *"sí, así
está mi bodega."* A script cannot say that, so the run stops at printing it.

## Running the screen for development

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

## The dry run

Step 7's question was whether the event model matches how a winemaker actually
describes the work. It is answered the same way the pace was: by running it.

```sh
cd web && npm run start &      # the app must be running
./scripts/dryrun.sh
```

Twelve things a winemaker says in one morning, driven through the build exactly as
it stands. A script cannot hesitate, so friction is only recorded where it is
structurally observable — no action exists, no path to it, two actions plausibly
fit, or something said is dropped. Each utterance carries the verdict predicted
before the run so the write-up cannot inherit an assumption, and each deviation is
paired with a SQL assertion about what the ledger therefore does not know.

The result: capture keeps pace, and then writes down something else. Three of
twelve things said survived intact, and the ledger ended the morning believing
seven things that are false — the sharpest being 525 L of wine recorded as
evaporated because the transfer sheet takes one destination and the operator said
two. Read [dry run 01](docs/dry-run-01.md).

## Proving a fix

Step 8 answers a finding the same way the pace and the dry run are answered — by
running it, end to end, through the browser:

```sh
cd web && npm run start &
./scripts/fidelity.sh
```

The dry run's worst sentence, said again, and then put to every surface that has
to agree about it: what was captured, what the ledger holds, what the lot story
reads, and what the tank board shows. Sixteen checks, including one that strips
the HTML `required` attribute off the live page and presses submit anyway — the
refusal has to come back from the database, or the rule is only a form.

## Coming next in Cycle 1

The rest of the dry run's findings, worst first: F2 (a co-ferment loses one
parent's lineage and leaves its fruit on the books), then F3 and F5 — a loss
operation and an addition operation, over the `loss` and `consume` event kinds
the ledger already has and nothing in the product can write.

F4 and F10 are model questions, not capture ones, and go to Aldo before either
is designed.

Decisions the remaining steps must preserve: the unit Aldo actually says is the
unit stored, conversions are derived; blend and split are already in the model;
occupancy is derived and never stored ([ADR 0005](docs/adr/0005-vessel-lot-cardinality.md));
stage labels stay soft ([ADR 0003](docs/adr/0003-no-lot-state-machine-in-cycle-1.md));
Ready to Bottle is a live assessment, never a boolean; and the model must accept
natural-language capture later without being rebuilt — which is why the words
Aldo uses are stored verbatim ([ADR 0006](docs/adr/0006-generic-event-kinds.md)).
