# ADR 0006 — Twelve generic kinds, and the winery's own words beside them

**Status:** accepted · Cycle 1, Step 2
**Classification:** architectural decision

## Problem

The ledger must serve winemakers, brewers and distillers, but we are mid-way
through discovery with one winemaker. Encoding `destemming_completed` as a type
would freeze one industry's vocabulary — and one winery's — into the schema.
Encoding nothing would leave the ledger unable to enforce anything.

## Decision

Two levels.

- **`event_kind`** — twelve industry-neutral primitives (`receipt`, `transfer`,
  `split`, `blend`, `transform`, `package`, `consume`, `loss`, `adjustment`,
  `count`, `observation`, `stage`). Each carries a balance rule. Expected to
  stay small and stable.
- **`type_key`** — free text, the organization's own word, recorded verbatim:
  `despalillado_prensado`, `trasiego`, `mezcla`.

Vocabulary is data. A brewery needs rows, not a migration. `vessel_type` and
`materials.category` are text for the same reason: a still is not a tank and a
distillery's categories are not a winery's.

## Consequence

The words Aldo uses are captured as findings rather than forced into our
taxonomy — which is also the training data for natural-language capture later.
When patterns emerge across organizations, a curated catalogue can be added
without touching the ledger.
