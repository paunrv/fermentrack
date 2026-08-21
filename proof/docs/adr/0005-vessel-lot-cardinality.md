# ADR 0005 — The ledger permits many lots per vessel; the product need not

**Status:** accepted · Cycle 1, Step 2 · **supersedes an earlier position**
**Classification:** architectural decision

## Problem

Earlier planning stated "a vessel holds at most one lot at a time" as a
structural rule. On reflection that is a product convention wearing the costume
of a physical law. Co-fermentation exists; breweries and distilleries blend in
vessel; and we are still learning this winery's actual practice.

## Decision

The ledger imposes **no cardinality constraint at all**. Occupancy is derived
from ledger lines carrying an optional `vessel_id`, so the schema represents
one lot in one vessel, one lot across many vessels, and many lots in one vessel
without alteration.

`vessel_occupancy` exposes `lot_count`, so any rule the product later wants —
warn, block, allow — is an application decision made against visible data.

## Why the change

The stricter rule bought nothing the ledger needed and would have had to be
unpicked the first time a winemaker did something ordinary that we had not yet
observed. Recording the loosening here, rather than letting the permissiveness
look accidental, is the point of this ADR.

## Consequence

If PROOF later wants one-lot-per-vessel, it is enforced in the write API against
`lot_count`, and this ADR is superseded rather than quietly contradicted.
