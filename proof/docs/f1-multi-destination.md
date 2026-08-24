# F1 — a transfer can go to more than one tank

Cycle 1, Step 8. One finding from [dry run 01](dry-run-01.md), fixed and proved.
Nothing else from that run is implemented here.

---

## The failure

The dry run said, into the real product:

> *"Racked it into Tank 7 and Tank 8, about half each."*

The sheet had one destination box. So 1,050 L went out, 525 L went in, and the
shortfall rule — which exists precisely so that a gap is never absorbed
silently — found the missing 525 L and gave it the reason its default argument
named:

```
Moved · 525 L moved · TK-4 → TK-7
525 L expected loss
```

Half a tank of Cabernet, evaporating during a racking, stated as fact on the
lot's own timeline. Nobody typed it. A 50% loss on a racking is physically
absurd and nothing in the system had an opinion about it.

**The ledger was never wrong.** Its invariant held, its arithmetic balanced, its
reason line was typed. It was handed incomplete input and produced a
mathematically balanced explanation of it — which is the most dangerous kind of
wrong, because it looks like knowledge.

---

## The rule this belongs to

The form change is the small half. The rule is
[ADR 0011](adr/0011-missing-information-is-not-a-loss.md):

> **PROOF must not turn missing information into a physical loss.**

| | |
|---|---|
| unknown destination | ≠ loss |
| unknown quantity | ≠ zero |
| estimated quantity | ≠ measured quantity |
| measurement correction | ≠ physical loss |

So `capture_transfer`'s `p_shortfall_reason` lost its default. A gap between what
left and what arrived is now refused unless the person recording accounts for it:

```
525 L unaccounted for — say which tank the rest went into,
or what happened to it
```

**The refusal is in the function, not the form.** The fidelity check proves this
by stripping the HTML `required` attribute off the radio group in the live page
and pressing submit anyway. The refusal still comes back from the database.

---

## What changed

| | |
|---|---|
| `supabase/migrations/20260821000600_transfer_to_many.sql` | `capture_transfer` — no default shortfall reason, blank rows ignored, half-filled rows refused; `lot_story` gains `to_vessels` |
| `web/app/capture.tsx` | destinations are a list starting with one row; the shortfall block pre-selects nothing and offers "+ it went into another tank" first |
| `web/app/actions.ts` | collects every destination row; never defaults the reason |
| `web/lib/lots.ts`, `web/app/lots/[code]/page.tsx` | the header names every vessel the wine is in; a move names every tank it went to |
| `tests/rls/60_transfer_destinations.sql` | 27 new assertions |
| `web/scripts/fidelity-f1.mjs` | the browser-driven proof |

**No ledger architecture changed.** No new tables, no new delta reasons, no new
event kinds. `blend`, `consume` and `loss` are still unreachable — those are F2,
F5 and F3.

Two reads had to widen, because a destination the ledger holds and the screen
hides is the same untruth in different clothes:

- `lot_story.to_vessels` — every tank an event put wine into. `to_vessel` still
  reports the largest, so nothing that already read it changed meaning.
- the lot header now reads `TK-7 · TK-8` instead of picking the bigger half.

---

## Proof

### The same sentence, through the same browser

`./scripts/fidelity.sh` — spoken → browser → sheet → database → ledger → lot
story → tank board, then all five surfaces asked the same question.

```
  What was said
    “Racked it into Tank 7 and Tank 8, about half each.”

  · captured · two destinations, not one
  · ledger · no wine was lost, because none was
  · ledger · the movement legs still cancel
  · ledger · half in each tank
  · timeline · names Tank 7
  · timeline · names Tank 8
  · timeline · says nothing was lost
  · timeline · and the header says the wine is in both
  · board · Tank 7 holds 525 L of it
  · board · Tank 8 holds 525 L of it
  · the gap is stated in the operator’s units
  · and nothing is pre-chosen for them
  · the server refuses an unexplained gap, not just the form
  · and it says so in words a person can act on
  · and nothing was written down while it was unexplained
  · nothing came out of a tank it was never in

  All 16 agree: what was said is what PROOF knows.
```

The timeline now reads:

```
Moved · 1,050 L moved
TK-4 → TK-7 525 L · TK-8 525 L
```

and the header reads `WHERE  TK-7 · TK-8`.

### The dry run itself

The Step 7 harness was re-run against the fixed build, and its own narrative
records the change:

```
· CLEAN  8 taps  “Racked it into Tank 7 and Tank 8, about half each.”
         app did: both tanks recorded, and no loss line invented for either

· both tanks of a racking into two tanks are recorded
· and no wine is written down as lost, because none was
· a tank still goes over capacity without being asked about it
```

That last line is deliberate. F11 was not in scope and is still true.

The morning that produced six BLOCKED verdicts now produces five, and the
seven false things the ledger believed are down to five.

### The three cases, in SQL

`./scripts/test-rls.sh` — **224 assertions, up from 197.**

| case | out | destinations | loss |
|---|---|---|---|
| A · exact | 1,000 | 500 + 500 | none at all — no line is written |
| B · partial | 1,000 | 500 + 400 | 100, `expected_loss`, named by the operator |
| C · three tanks | 1,000 | 300 + 300 + 250 | 150, `incident_loss`, named by the operator |
| one destination | 1,000 | 1,000 | unchanged from Step 3 |

Plus lineage in both directions for a split into two named wines, the refusals
(unexplained gap; a tank with no amount; more arriving than left), and the
agreement checks — every tank holds what the lots in it say it holds, and no
litre is anywhere PROOF cannot name.

---

## Pace

`./scripts/pace.sh` — **32 taps for six operations, budget 36. Still green.**

| | before | after |
|---|---|---|
| one tank, nothing missing | 4 | **4** |
| one tank, wine genuinely missing | 4 | **5** |
| two tanks | not possible | **7** |
| three tanks | not possible | **10** |

The exact common case is unchanged. The extra tap on a transfer with a real
shortfall is the one PROOF used to take on the operator's behalf, and it is the
whole point of the change — so it is measured here rather than argued about.

**The new cognitive step is not the tap.** It is that the operator now has to
decide something PROOF used to decide for them: *did that wine go somewhere, or
is it gone?* That is a question they can answer and PROOF cannot, but it is a
question, and it did not exist before. Whether it lands as reassuring or as
nagging in a working cellar is exactly the kind of thing only Aldo can tell us.

---

## What this run surfaced and did not fix

One new observation, recorded rather than acted on, because F1's brief was F1:

**F13 — a transfer takes wine out of one vessel.** Now that a lot can easily
live in two tanks, racking the whole lot picks a single source (the largest
position, prefilled) and can take out more than that tank holds, leaving a
negative position. Multi-source is the mirror of multi-destination and a
separate decision. The fidelity check asserts the F1 path itself leaves no
negative position anywhere in the winery.

Still open, untouched, exactly as the dry run left them: F2 (co-ferment
lineage), F3 (loss has no vocabulary), F4 (a quantity not yet knowable), F5
(additions), F6 (the board's headline nets an overflow), F7 (facts about
vessels), F8 (a wrong date), F9 (stage vs reading), F10 (arrival as one act),
F11 (over-capacity accepted silently), F12 (spent lots in the cellar list).

---

## Definition of done

| | |
|---|---|
| Multiple destinations can be captured | ✅ two and three, browser-driven |
| Exact multi-destination produces zero loss | ✅ case A — no line at all |
| Partial produces an explicit loss | ✅ cases B and C |
| The user never types the loss delta | ✅ they name a reason; PROOF computes the number |
| Missing destinations are not silently classified as loss | ✅ refused, server-side |
| Lineage preserved | ✅ both directions, every destination |
| Vessel occupancy agrees with lot state | ✅ asserted across the whole winery |
| Lot timeline agrees with the ledger | ✅ names both tanks and both amounts |
| Tank board agrees with the ledger | ✅ 525 L in each |
| Single-destination transfers still work | ✅ unchanged, still 4 taps |
| Step 5 pace benchmark green | ✅ 32/36 |
| Steps 1–6 tests green | ✅ 224/224 |
| The Step 7 failure reproduced and fixed | ✅ in the SQL suite and in the dry run itself |
| No unrelated findings implemented | ✅ F11 still demonstrably present |
