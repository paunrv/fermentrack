# ADR 0008 — The timeline is a projection, and it is humanised in the database

**Status:** accepted · Cycle 1, Step 4
**Classification:** architectural decision

## Problem

The first screen has to make a lot's history legible to a producer at a glance.
Two temptations come with that.

The first is to store what the screen needs — a `current_volume`, a
`current_stage`, a `current_location` — because a timeline that reads its own
table is easy to build. That is exactly the second source of truth this
architecture was built to prevent, and the moment it exists the ledger stops
being authoritative.

The second is to humanise in React: let the component decide that a `transfer`
is called "Moved", that `expected_loss` reads as "expected loss", that a stage
should show the winemaker's own words. That works for one screen and fails at
the second, because the mobile capture view, the tank board and the AI narration
would each decide it differently and drift apart.

## Decision

`lot_story` and `lot_card` are **views**, computed at read time from events,
ledger lines and lineage. Nothing is stored. A structural test fails the build
if a table named `lot_story` ever appears, or if any table anywhere grows a
`current_volume`, `current_stage` or `current_location` column.

The humanising lives in those views: headlines, reason labels, running balances,
confidence. The interface renders what it is given and decides nothing about the
domain. This is ADR 0007's argument running the other way — one canonical
translation, many surfaces.

## The story follows the wine, not the row

A lot born in the press has no reception of its own. Showing its timeline
starting at "Processed" answers *what happened to this lot* but not *where did
this come from*, which is one of the five questions the screen exists to answer.

So the projection walks ancestry: everything that happened to the wine before it
had this name appears too, marked `is_inherited` with the lot it belonged to, and
rendered visibly differently. The running balance stays in the unit whichever lot
actually held the wine at the time, so an inherited row reports the fruit's
kilograms rather than pretending they were this lot's litres.

## Consequence

Rebuilding the screen, adding a second one, or letting an AI narrate the same
history costs nothing extra — they all read the same projection. And because the
projection is derived, a correction recorded three weeks late reshapes the
history correctly the next time anybody looks.
