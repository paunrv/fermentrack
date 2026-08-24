# Dry run 01 — a harvest morning through Cycle 1 as it stands

Cycle 1, Step 7. Twelve things a winemaker says during one morning, put through the
built product with nothing changed and nothing added. The build under test is the
tank board commit; no product code was touched before, during or after the run.

```sh
cd web && npm run start &
./scripts/dryrun.sh
```

> **Since:** F1 was fixed in Step 8 — see
> [F1 · a transfer can go to more than one tank](f1-multi-destination.md). The
> harness was re-run against the fixed build and that utterance now reads CLEAN;
> everything else below stands. This document is the record of the run as it
> happened, and is left as it was written.

The run rebuilds the database from the committed migrations first, so the
measurement starts from a known cellar every time.

---

## What this can and cannot measure

The brief asked for human friction: hesitation, interpretation, not finding the
right action, needing information PROOF does not have.

**A script cannot hesitate.** Writing "the operator paused here" would be invented
data, and inventing the finding is worse than not having it. So friction was
converted into things a machine can actually observe, and the parts that need a
human are named as such at the end.

| | |
|---|---|
| **CLEAN** | one obvious action, and everything said survives |
| **LOSSY** | it records, but something said is dropped or distorted on the way in |
| **AMBIGUOUS** | more than one action plausibly applies — this is *where* a person hesitates, even if the script cannot feel it |
| **DETOUR** | the capability exists but there is no path to it, or one real event takes several operations |
| **BLOCKED** | nothing in the product can represent what was said |

Two further honesty rules were built into the harness:

1. Each utterance carries the verdict predicted **before** the run, and the run
   records what the app actually did. Where the two disagree the run says so, so
   this document cannot quietly inherit my assumptions. (One did disagree — see
   *the sheet stays open*, below.)
2. Every deviation is paired with a claim about **what the ledger therefore does
   not know**, and each claim is a SQL assertion checked against the database
   afterwards. All twelve pass. Nothing below is an impression of a screenshot.

**Seconds are not reported.** A script's seconds measure the script. Interactions
are counted instead, on the same basis as the Step 5 ratchet.

---

## The tally

```
12 things said · 45 taps · 9 screen changes
clean 3 · lossy 0 · ambiguous 1 · detour 2 · blocked 6
```

Eight operations were actually recorded, for 43 taps — **5.4 taps per operation,
against 5.2 in the Step 5 pace run.** 

That is the first result, and it is not the one I expected: **pace is not the
problem.** Capture keeps up with speech. What it writes down is the problem. Of
twelve things said, three survived intact.

---

## The morning, utterance by utterance

### 1 · "Two loads of Cabernet came in this morning from La Cañada, about a tonne and a half each." — DETOUR, 15 taps

One sentence became two receptions, ten fields each, with nothing recording that
they arrived on the same truck from the same block on the same pass.

The prediction here was wrong in one detail and it is worth saying so: I expected
the sheet to stay open holding the previous load's numbers, which would have been
a double-entry hazard. It stays open but **clears**, which is the right behaviour
for two loads in a row. Recorded as observed.

> *Verified:* two receipt events for CS-26-D1 and CS-26-D2, neither attached to any
> shared run and neither referencing the other.

### 2 · "The second load had some rot in it. We threw maybe eighty kilos on the floor." — BLOCKED, 4 taps

Nothing on the screen says *we lost some*. The five actions offered are move, note,
stage, process and "that number is wrong". The last one is the only one that moves
the number, so eighty kilos of fruit on the floor were recorded as a
**mismeasurement**.

The timeline now reads:

```
Corrected · 80 kg measurement corrected
"Threw about 80 kg of rotten fruit on the floor"
```

The words are there. The meaning is not. PROOF believes the scale was wrong.

> *Verified:* no `incident_loss` or `waste` line exists anywhere on CS-26-D2.

### 3 · "We crushed both loads together into Tank 4 — they co-ferment." — BLOCKED, 6 taps

Pressing takes one input lot. The second load's existence survives only as free
text in a note, which the lineage graph cannot see.

Two falsehoods follow:

- **CO-26-D descends from one parent, not two.** Ask this wine where it came from
  and it names half its fruit.
- **CS-26-D1 is still on the books.** 1,500 kg of Cabernet, sitting in BIN-1, in
  the cellar list, on the tank board, weeks after it went into the tank.

> *Verified:* one ancestor, and 1,500 kg still on CS-26-D1.

### 4 · "It is on skins, so I cannot tell you the volume yet." — BLOCKED, 2 taps

The volume box is `required`; the browser refuses the submit with *"Please fill out
this field."* A red wine on skins does not have a volume until it is pressed, so
the number recorded above — 1,050 L — was invented in order to proceed at all.

The confidence machinery then does its job perfectly on a fiction. Everything
downstream reads *estimated*, and the timeline says "The quantity this came from
was an estimate". PROOF is being carefully honest about the precision of a number
nobody measured, and has no way to say the number does not exist yet.

### 5 · "Added SO2, thirty grams per hectolitre." — BLOCKED, 3 taps

No operation consumes a material. The nearest fit is a note attached to a reading.
No stock moves, no cost attaches to the wine, no additive history exists for the
lot — and additions are exactly the thing a producer is later asked to prove.

> *Verified:* no SO2 material, and no `consumption` line anywhere in the winery.

### 6 · "Two pump-overs today, morning and evening." — AMBIGUOUS, 4 taps

"Something changed" and "took a reading" both plausibly fit. This is where a person
stops and decides, and the two choices file it differently and permanently.

Filed as a stage, the lot card now reads **DOING: remontado** — as though a
pump-over were a state the wine is in rather than work somebody did twice today.
The count is gone.

> *Verified:* one stage event; no structure anywhere holds the number two.

### 7 · "Brix is twenty-four." — CLEAN, 3 taps

One action, nothing dropped.

### 8 · "Tank 4 is the one with the cooling jacket. Tank 9 has not got one." — DETOUR, 3 taps

The tank board offers no capture actions at all, so a fact about a tank has to be
carried in on the back of whatever wine happens to be in it. It is now a note on
CO-26-D. When that wine is bottled the cooling jacket goes with it.

Tank 9 is never mentioned, because it holds nothing and therefore does not exist.

> *Verified:* the note is filed against a lot with `subject_vessel_id` null, and
> there is no TK-9.

### 9 · "Racked it into Tank 7 and Tank 8, about half each." — BLOCKED, 5 taps

**This is the worst thing that happened all morning.**

`capture_transfer` accepts an array of destinations. The sheet shows one box. So
1,050 L left Tank 4, 525 L arrived in Tank 7, and PROOF applied exactly the
mechanism it was built with — *the gap gets a reason* — and wrote down:

```
Moved · 525 L moved · TK-4 → TK-7
525 L expected loss
```

Half the wine, recorded as evaporation, stated as fact on the lot's own timeline.

The ledger did nothing wrong. Its invariant held, its arithmetic balanced, its
reason line is typed. It was handed a lie by the only sheet available and wrote it
down faithfully. **A 50 % loss on a racking is physically absurd and nothing
anywhere questioned it.**

Then the second-order damage: Tank 7 already held 1,685 L of MST-26-H in a 2,000 L
tank. PROOF knew that, accepted 525 L on top of it without a word, and now shows
TK-7 as **210 L over**.

> *Verified:* one destination; a 525 L `expected_loss` line; one vessel over-full.

### 10 · "Actually that racking was yesterday, not this morning." — BLOCKED, 0 taps

There is no way in. Zero controls on any recorded entry, and "that number is wrong"
takes a quantity and nothing else. `events.corrects_event_id` exists in the schema
and no operation writes it for anything but a quantity.

The entry stays wrong, and nothing records that it is wrong.

### 11 · "How much room have I got for tomorrow's pick?" — CLEAN interaction, incoherent answer, 0 taps

Instant, no questions asked. But the header reads:

```
FREE 4,790 L        biggest 5,000 L
```

The biggest single space is larger than the total. Tank 7's 210 L overflow is
carried as negative free space and netted against Tank 3's 5,000 L. Netting is
arguably right — that wine does have to go somewhere — but the two numbers side by
side cannot both be read as true, and this is the screen meant to answer a question
at speed.

### 12 · "What happened to that Cabernet?" — CLEAN, 0 taps

Eight entries, in order, in the operator's own words, with the ancestry followed
back through the press. This part works.

---

## What the ledger now believes about that morning

Everything below is in the database after a run in which nobody typed anything
untrue:

- 1,500 kg of Cabernet is sitting in a bin. It went into Tank 4 hours ago.
- 80 kg of rotten fruit was never thrown away; the scale was misread.
- Tank 4's wine came from one load of fruit.
- 525 L evaporated during a racking.
- Tank 7 contains 210 L more than it holds.
- No sulphur has ever been added to anything.
- There is 4,790 L of free space, in a cellar whose largest free tank is 5,000 L.

Every one of those is false, and every one was produced by an operator answering
honestly.

---

## Findings

Ranked by damage, not by effort. **Nothing here was fixed** — the brief was to
document first, and the build is unchanged.

| # | Finding | Where it lives |
|---|---|---|
| **F1** | ~~A racking to two tanks records the second tank's wine as an expected loss. Silent, plausible-looking, and wrong.~~ **Fixed in Step 8.** | capture sheet |
| **F2** | A co-ferment loses one parent's lineage *and* leaves its fruit on the books, so the cellar shows stock that is not there and a bin that is not free. | capture operation |
| **F3** | Throwing something away has no vocabulary. It files as a measurement correction. | capture surface |
| **F4** | Pressing demands a volume that does not exist yet for wine on skins, forcing an invented number that then propagates as a careful estimate. | model |
| **F5** | Additions cannot be recorded at all. No stock, no cost, no additive history. | capture operation |
| **F6** | An over-full tank nets against the board's headline, producing a total smaller than its own largest component. | tank board |
| **F7** | Nothing can be said about a vessel on its own; vessel facts ride on whatever wine is in it, and empty vessels do not exist. | capture surface |
| **F8** | A wrong date cannot be corrected, and the fact that it is wrong cannot be recorded either. | capture operation |
| **F9** | "Something changed" and "took a reading" overlap. Work performed twice becomes a state the wine is in. | naming |
| **F10** | Two loads arriving together become two unrelated receptions. | model |
| **F11** | An over-capacity transfer is accepted without comment and flagged only afterwards, on a different screen. | capture |
| **F12** | Spent lots stay in the cellar list at 0. Noise that will grow all vintage. | list |

### The shape of it

The four-layer separation held all morning. Not one finding is a case of the
layers collapsing into each other, and the ledger refused nothing that was true.

What the run actually exposes is a **width mismatch between the ledger and the
operations layer**. The ledger's `event_kind` has eleven values. The six capture
operations write eight of them. Three are unreachable — and all three were said
out loud this morning:

| said | ledger has | operation |
|---|---|---|
| "they co-ferment" | `blend`, and `lot_lineage` takes many parents | none |
| "added SO2" | `consume`, `materials`, `reason = 'consumption'` | none |
| "we threw it on the floor" | `loss`, `reason in ('incident_loss','waste')` | none |

Seven of the nine gaps sit over a ledger that already handles them: multi-destination
transfers (`capture_transfer` accepts an array — the *sheet* shows one box),
losses, additions, blends, vessel-subject events (`events.subject_vessel_id`
exists), and dated corrections (`events.corrects_event_id` exists).

**Two are genuine model gaps:**

- **A quantity that is not yet knowable.** `ledger_lines.quantity` is `not null`.
  `basis` can say a number is estimated; nothing can say there is no number yet.
  Red wine on skins is not an edge case in a Malbec country.
- **Arrival as one act.** Two loads, one truck, one pass. There is no concept of
  events that belong together, and no obvious place for one.

> *Verified:* no `blend`, `consume` or `loss` event exists after the full narrative.

---

## What worked, and should not be disturbed

- **Pace held.** 5.4 taps per recorded operation against 5.2 in Step 5, on a much
  harder transcript. The sheets are not the bottleneck.
- **Reading back cost nothing.** Both questions were answered in zero taps.
- **Confidence propagated correctly** — including onto the invented volume, which
  is the honest outcome given what it was told.
- **The lot story followed ancestry through the press** and read in the operator's
  own words.
- **The shortfall mechanism did exactly what it was designed to do.** It was fed a
  lie by the UI. That is F1, not a ledger defect.
- **The sheet clears after recording**, which was the one prediction the run
  overturned in the product's favour.

---

## What still needs a human

These are the things this run genuinely could not measure, and they are the reason
the winery visit is not optional:

1. **Does Aldo reach for the right button?** The run knows which sheets exist. It
   does not know whether "We pressed it" is what he'd look for when he means
   *despalillado y estrujado*.
2. **Is 5.4 taps fast enough?** Only somebody with wet hands and a truck waiting
   can answer that.
3. **Would he notice the 525 L loss?** The number is on the screen. Whether a
   person scanning a timeline registers it as absurd is exactly the question a
   script cannot answer — and F1 is much less dangerous if the answer is yes.
4. **Which of these actually happen at Viñas del Tigre?** Co-ferments and additions
   are certain. The rest is my reading of a harvest, not his.

---

## Recommendation for Step 8

Do not widen the model. It held. Widen the operations layer to reach what the
ledger already supports, in this order — F1 first because it writes a falsehood,
F2 second because it writes two:

1. **F1** — several destinations on the transfer sheet.
2. **F2** — several input lots on pressing, with lineage for each.
3. **F3 / F5** — a loss operation and an addition operation, over `loss` and
   `consume`.
4. **F11** — refuse, or at least query, a transfer that overfills a vessel of
   known size.
5. **F6** — decide what the headline free figure means when a tank is over.

**F4 and F10 are model questions and should go to Aldo before either is designed.**
Making quantity optional touches the invariant that made this ledger trustworthy in
the first place, and it should not be done on my reading of one narrative.
