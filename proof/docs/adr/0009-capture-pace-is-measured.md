# ADR 0009 — Capture pace is measured, not asserted

**Status:** accepted · Cycle 1, Step 5
**Classification:** architectural decision

## Problem

Step 5's gate is a usability claim: *can a producer record what happened as fast
as they can say it?* Claims like that normally get answered by someone looking
at a form and deciding it seems fine. That is not evidence, and it silently
degrades — every sprint adds one more field that "is only one more field".

## Decision

`scripts/pace.sh` drives the real app in a real browser through a transcript of
things a winemaker actually says, and counts **every interaction** it takes to
record each one. Each utterance has a budget. Over budget fails the build.

The metric is interactions, not seconds. Wall-clock measures the machine and the
script's typing speed; taps and fields measure the design. Seconds are reported
and nothing is asserted on them.

The run also reloads the page at the end and checks that what was recorded is
what was *said* — a fast form that records the wrong thing has failed the more
important test.

## What this is and is not

It is a **ratchet**, not a proof. The budgets are ones we set ourselves, so
passing does not establish that capture is fast enough for a person; only Aldo
can establish that. What it establishes is that nobody can quietly add three
mandatory fields without the build noticing, and that the six operations still
record correctly end to end.

Current cost: **31 interactions for six operations** — a reception, a pressing,
a stage change, a reading, a racking with a shortfall, and a correction.

## What the budgets bought

The budgets forced decisions that a form-first approach would not have reached:
the date defaults to today with one-tap relatives, the vessel and quantity a
transfer starts from are prefilled from the ledger, pressing consumes the whole
lot without asking, and every field except quantity and date is optional.

## The failure it caught immediately

The first run passed every budget and still failed: a transfer had silently not
recorded, because a jsonb parameter was pre-stringified and Postgres received a
JSON string containing JSON. The symptom was an opaque "function does not
exist". The original wait condition — counting timeline entries — had let it
through, because four entries already existed.

Counting is not evidence. The harness now waits for the specific thing being
recorded and treats a sheet's refusal as a failure rather than waiting it out.
