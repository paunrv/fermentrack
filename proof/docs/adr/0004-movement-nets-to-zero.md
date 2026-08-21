# ADR 0004 — Movement nets to zero; everything else names its reason

**Status:** accepted · Cycle 1, Step 2
**Classification:** architectural decision

## Problem

"No quantity appears from nowhere, and none disappears without a reason" has to
be a rule the database enforces, not a habit. The obvious encoding — make every
event's lines sum to zero — is wrong, because a transfer that loses 20 L to lees
genuinely removes 20 L from the world.

The tempting alternative is worse. Writing that transfer as
`−6020 / +6000 / −20` double-counts: the 6020 that left the tank already
contains the 20 that was lost.

## Decision

Split the two ideas apart.

- Lines with reason `movement` are the legs of a transfer, split or blend. They
  **must net to exactly zero per base unit**, on every event and across all
  history.
- Any quantity that truly enters or leaves carries its own reason —
  `receipt`, `transformation`, `expected_loss`, `incident_loss`, `waste`,
  `consumption`, `adjustment`, `resolution`, `count_variance`.

So the racking above is `−6000 / +6000` (movement, balanced) **plus** `−50`
(`expected_loss`). Tank 1 falls by 6050, the lot falls by 50, and the reason is
on the record.

Conversions are exempt from netting by nature: 8,500 kg of fruit becoming
6,200 L of must conserves nothing, because the unit changed. Yield is derived
from the input/output pair and is never stored, and never a reason.

## Enforcement

`app.assert_event_valid()`, on deferred constraint triggers on both `events` and
`ledger_lines` — deferred because an event's lines are inserted one at a time
but are only meaningful as a set. Eight negative tests prove each refusal.

## Consequence

Loss detection is a query, not a feature: expected inventory is the ledger sum,
and any gap is already typed and attributable.
