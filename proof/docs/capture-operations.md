# The six harvest capture operations

The first operational surface over the ledger. Each one is named for something a
person does, and takes the numbers a person actually has.

Nothing below asks the operator for a delta, a reason code, a ledger line or a
balance. Where the ledger needs one, PROOF derives it.

---

## 1 · Reception

> *"Tuesday we brought in about two and a half tonnes of Cabernet from La Cañada.
> It went into the reception bin."*

| | |
|---|---|
| **User action** | `capture_reception(lot, quantity, unit, vessel, source, variety, …)` |
| **Domain event** | `receipt` |
| **Ledger** | one line, `+2.4 t`, basis `estimated`, reason `receipt` |
| **Derived state** | the lot appears holding **2,400 kg**; the bin appears on the tank board |

The tonnes he said are the tonnes stored. Kilograms are a derivation.
Basis defaults to `estimated`, because the first number at a crush pad is
usually a judgement and recording a guess as a measurement is the failure this
whole model exists to prevent. Naming a bin that does not exist creates it —
there is no equipment setup screen.

Where the fruit came from is kept as context on the event, not in a supplier
catalogue. We have not yet seen how this winery names its blocks and growers.

---

## 2 · Processing

> *"We crushed it the same day. There's about 1,730 litres in Tank A now, and the
> pomace went to the pile."*

| | |
|---|---|
| **User action** | `capture_processing(input lot, output lot, output quantity, unit, vessel, byproduct…)` |
| **Domain event** | `transform` + lineage |
| **Ledger** | `−2,400 kg` (all of it), `+1,730 L`, `+640 kg` pomace |
| **Derived state** | fruit lot empty; must lot in Tank A; **yield 0.72 L/kg**, derived |

He never says how much fruit went in — all of it did. Leaving the input quantity
blank consumes whatever the ledger says is left.

Kilograms become litres. No conservation is possible and none is attempted.
Pomace is an **output**, not a loss. Lineage is written automatically, so the
must can always name the fruit it came from.

---

## 3 · Transfer

> *"We racked it into Tank B. Seventeen-thirty came out, seventeen hundred went in."*
>
> *"Racked it into Tank 7 and Tank 8, about half each."*

| | |
|---|---|
| **User action** | `capture_transfer(lot, quantity out, destinations[], shortfall reason)` |
| **Domain event** | `transfer` — or `split`, if a destination names a different lot |
| **Ledger** | `−1,700` / `+1,700` movement (cancels) **plus `−30` `expected_loss`** |
| **Derived state** | source tank empty; destination holds 1,700; lot down by exactly 30 |

**This is the operation that justifies the whole layer.** Two real numbers go in.
PROOF works out that thirty litres are unaccounted for, insists they carry a
reason, and writes the movement legs so they cancel. Asking anyone to reason
about netting would be a design failure.

**Wine can go to more than one tank.** The sheet shows one destination row and
adds another on request, so the common racking is unchanged and the second half
of "Tank 7 and Tank 8" has somewhere to go. Split evenly, nothing is
unaccounted for and no reason is asked for, because nothing is missing.

**A gap with no explanation is refused, not named for you.** Before Step 8 the
shortfall reason defaulted to `expected_loss`, which is how a racking into two
tanks came to record half the wine as evaporated. There is no default now:

```
525 L unaccounted for — say which tank the rest went into,
or what happened to it
```

Two answers close it — name another destination, or say what happened to the
wine — and the operator picks. PROOF does not
([ADR 0011](adr/0011-missing-information-is-not-a-loss.md)).

More arriving than left is refused, because it is almost always a typo. A
destination row with a tank and no amount is refused for the same reason; a row
left completely blank is simply not a destination.

Naming a different lot at a destination makes it a split, and the lineage is
recorded without anyone requesting it — for every destination, so both halves of
a divided wine can answer "where did this come from".

---

## 4 · Stage

> *"It started fermenting on Thursday."*

| | |
|---|---|
| **User action** | `capture_stage(lot, stage, note)` |
| **Domain event** | `stage` |
| **Ledger** | nothing — no quantity changed |
| **Derived state** | the lot's current stage, derived from the latest such event |

Free text on purpose, accents and all. `inicio de fermentación` is stored exactly
as typed. The words a winemaker uses are a finding, not a form value — and they
are the vocabulary a future parser will be trained on.

---

## 5 · Observation

> *"Brix is 24.1 this morning. Smells right."*

| | |
|---|---|
| **User action** | `capture_observation(lot, readings, note, vessel)` |
| **Domain event** | `observation` |
| **Ledger** | nothing |
| **Derived state** | appears on the lot's timeline |

Cheap to record, and the catch-all for anything PROOF cannot yet model. What
gets typed here during the first visits is the list of what we got wrong.

---

## 6 · Correction

> *"We gauged Tank B properly. It's 985, not a thousand."*

| | |
|---|---|
| **User action** | `capture_correction(lot, observed quantity, unit, why)` |
| **Domain event** | `adjustment` — or `count`, or `observation` if it agrees |
| **Ledger** | `−15`, reason `resolution`, computed from the derived balance |
| **Derived state** | the lot now reads 985; both figures survive on the event |

He states what he sees. PROOF works out the difference from what it believed and
records **that**, so nobody edits a number in place and nobody computes a delta.

An estimate becoming a measurement is a `resolution`, never a loss — collapsing
those two would make every future loss report worthless.

A count that **agrees** is recorded as a confirmed observation rather than thrown
away: evidence the memory is sound is still evidence.

---

## What the surface reads back

`lot_overview` — one row per lot in operational language: what it is, where it
is, how much, how well that is known, its current stage, and when it was last
touched.

`confidence` follows the wine, not just the row. A lot whose every litre descends
from *"about two and a half tonnes"* reads `estimated` no matter how carefully
its later transfers were gauged.

---

## Not in this step

**Blend** exists in the ledger and is tested, but has no capture operation:
blending is rare during harvest, and we would rather watch how Aldo describes it
before designing the call.

Bottling, warehouse, exits and cost attribution all belong to later cycles. So
does a supplier or vineyard-block catalogue.
