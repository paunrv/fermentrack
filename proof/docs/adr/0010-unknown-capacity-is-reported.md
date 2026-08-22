# ADR 0010 — A vessel of unknown size is reported, not assumed

**Status:** accepted · Cycle 1, Step 6
**Classification:** architectural decision

## Problem

Step 3 made vessels come into existence by being named mid-capture, because an
equipment setup wizard would have wrecked the pace the sheets exist to protect.
That was right, and it has a consequence the tank board is the first thing to
meet: **a vessel created that way has no recorded size.**

Building the board against the demo winery made it concrete — every vessel in it
had a null capacity, so "how much room have I got?" was unanswerable for the
whole cellar.

Three ways to handle it, two of them dishonest:

- treat missing capacity as zero — the tank reads as full when it is empty
- leave unsized vessels out silently — the headline total is then a subset
  pretending to be a whole
- report them

## Decision

Report them. Unsized vessels are their own status (`unknown_size`), excluded
from the totals, and the board says how many were excluded and why. This is the
same rule as `basis`: PROOF states how well it knows a number rather than
implying a precision it does not have.

The board may then **ask for the one fact it is missing** — the vessel's size,
inline, on the card that is short of it. That is the only mutation the board
offers: no creating, no renaming, no deleting, no vessel list to maintain. A
vessel still comes into existence by being used and stops mattering by being
empty.

## Also decided here

**Over-full is a state, not a negative number.** More wine in a tank than the
tank holds means either the volume or the capacity is wrong, and both deserve
somebody's attention rather than a minus sign in a column.

**Free space is reported per unit and never summed across units.** A bin of
kilograms and a tank of litres do not add up, so the board shows two totals or
none.

**Total free space is not the useful number.** Five thousand litres spread
across ten tanks will not take a single lot, so the largest single space is
shown beside it — that is what actually answers "will this harvest fit".

## The defect it caught

The board disagreed with the lot: Tank 7 read 1,700 L while the wine in it read
1,685. Both were derived and both were arithmetically correct — the correction
had been recorded without a vessel, so its −15 L belonged to no tank.

Two derived views disagreeing about the same wine is precisely what the single
ledger exists to prevent, so the fix went to the source rather than into a view
that reconciles them: a correction about a lot sitting in a tank now defaults to
the tank the wine is already in.
