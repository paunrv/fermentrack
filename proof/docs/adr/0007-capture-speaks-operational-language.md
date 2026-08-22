# ADR 0007 — Derivation belongs in the capture layer, not the interface

**Status:** accepted · Cycle 1, Step 3
**Classification:** architectural decision

## Problem

The ledger is deliberately strict: movement lines must net to zero, every other
change carries a typed reason, quantities carry a basis. None of that is a
thought a winemaker should ever have. But the translation has to live somewhere,
and if it lives in the UI then every future surface — a second screen, a mobile
capture, a natural-language parser — reinvents it, and each gets it subtly
differently.

## Decision

A typed capture layer sits between the two, in `public`, as the API a session
calls. Six operations named for what a person does, taking the numbers a person
has.

The layer owns every derivation:

- an operator gives **quantity out** and **quantity arrived**; the shortfall line
  and its reason are computed
- an operator gives the **observed quantity**; the delta from the ledger's belief
  is computed
- an operator gives **nothing** for a press input; the whole remaining balance is
  consumed
- naming an unfamiliar vessel **creates** it, mid-capture
- naming a different lot at a destination **makes it a split**, with lineage

A structural test fails the build if any capture parameter name contains
`ledger`, `delta`, `projection`, `rls` or similar. Operational language is
enforced, not merely intended.

## Alternatives

**Derive in the UI.** Faster for one screen, and wrong by the second one.
**Expose `record_event` directly.** Correct but unusable: it demands the caller
already think in balanced lines.

## Consequence

Natural-language capture, when it arrives, targets these six operations rather
than the ledger — so it inherits every refusal and every derivation for free.
That is why it can be deferred without being designed around.
