# ADR 0011 — Missing information is never converted into a physical loss

**Status:** accepted · Cycle 1, Step 8 (F1)
**Classification:** product invariant

## Problem

The Step 7 dry run said, into the real product:

> *"Racked it into Tank 7 and Tank 8, about half each."*

The ledger has always taken an array of destinations. The capture sheet offered
one box. So the operator recorded 1,050 L out and 525 L in, and
[ADR 0004](0004-movement-nets-to-zero.md)'s shortfall rule did exactly what it
was built to do: it found the gap, refused to absorb it, and gave it a reason.

The reason was `expected_loss`, because that was the default argument.

The result was a lot timeline reading **"525 L expected loss"** — half a tank of
Cabernet evaporating during a racking, stated as fact, on a screen a producer
would later use to work out their yield. Nobody typed it. Nothing questioned it.
A 50% loss on a racking is physically absurd and the system had no opinion.

The mechanism was right. It was fed incomplete input and produced a
mathematically balanced explanation of it, which is the most dangerous kind of
wrong: it looks like knowledge.

## Decision

**PROOF must not turn missing information into a physical loss.**

Concretely, and generalising past this one sheet:

| | |
|---|---|
| unknown destination | ≠ loss |
| unknown quantity | ≠ zero |
| estimated quantity | ≠ measured quantity |
| measurement correction | ≠ physical loss |

For transfers this means `capture_transfer`'s `p_shortfall_reason` **has no
default**. A gap between what left and what arrived is refused unless the person
recording says which tank the rest went into, or what happened to it:

```
525 L unaccounted for — say which tank the rest went into,
or what happened to it
```

The refusal lives in the function, not in the form. The fidelity check proves
this by stripping the HTML `required` attribute off the radio group and pressing
submit anyway: the refusal still comes back from the database.

## Why not keep a default and let the operator override it

Because the operator never sees a default they did not choose. A pre-ticked
"lees, normal" is indistinguishable, at speed, from PROOF knowing something —
and the whole product is a claim about what PROOF knows. A default here is a
guess wearing the clothes of a record.

The cost is one tap, and only on a transfer that actually has a gap. An exact
transfer costs exactly what it cost before.

## Consequences

- **The ledger did not change.** No new tables, no new reasons, no new event
  kinds. `blend`, `consume` and `loss` remain unreachable — those are F2, F5 and
  F3, and deliberately not touched here.
- **The capture sheet takes a list of destinations**, starting with one row. The
  second row costs one tap and only exists if somebody asks for it.
- **Two reads had to widen to match.** A destination the ledger holds and the
  screen hides is the same untruth in different clothes, so `lot_story` gained
  `to_vessels` (every tank an event put wine into, not the biggest one) and the
  lot header names every vessel the wine is actually in.
- **Existing call sites now name their reason.** The demo seed and the Step 3
  suite both racked off lees and relied on the default; both now say
  `expected_loss` out loud. That is the point of the change, not a cost of it.

## What this does not fix

The same class of guess exists elsewhere and is left standing on purpose, so
that fixing it is a decision rather than a side effect:

- a transfer still takes wine **out of one vessel**, so a lot spread across two
  tanks can be racked out of a tank that does not hold that much
- an over-capacity destination is still accepted without a word (F11)
- `ledger_lines.quantity` is still `not null`, so "I cannot tell you the volume
  yet" is still unrepresentable (F4)

## Alternatives rejected

**Compute the shortfall client-side and block there.** The browser is not the
guarantee. Anything a form can enforce, a script, an import or a future API can
skip.

**Infer the reason from size** — a small gap is lees, a large one is a missing
destination. It would be right most of the time, which is worse than being
absent: it would be wrong occasionally and silently, and the operator would have
no way to know which.

**Record the gap as `adjustment` instead of `expected_loss`.** Still a decision
PROOF is not entitled to make. The wine is either somewhere or gone, and only
the person in the cellar knows which.
