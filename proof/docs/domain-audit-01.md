# Domain audit 01 — the space we are building for

Cycle 1, between Step 8 and whatever comes next. **No code, schema, migration or
screen was changed to produce this document, and none should be changed because
of it without a decision made deliberately.**

This is a research and architecture audit. It maps real winery operations against
what PROOF actually is today, records what we do not know, proposes a
domain-neutral vocabulary for the things a producer does, and compares both
against published technical material.

The rule it is written under:

> **We are learning the domain without teaching the product our assumptions.**

and its two operating consequences, already law in this repository:

> **PROOF must not convert missing information into a physical loss**
> ([ADR 0011](adr/0011-missing-information-is-not-a-loss.md))
>
> **Never invent certainty.**

Which applies to this document as much as to the product. Where I do not know, it
says so, and it does not round the gap off into a recommendation.

---

## Before anything else — three things about this audit's own honesty

### 1 · The finding numbers in the brief do not match the finding numbers in the repository

The brief asked for special attention to *"F2 — arrival as one act, F3 —
consume/additions, F4 — loss vs correction, F5 — unknown quantity, F13 —
multi-source transfer."* Four of those five numbers are attached to different
findings in the committed register ([dry run 01](dry-run-01.md)).

I have used **the committed numbering** throughout, because it is what the tests,
the ADRs and the F1 write-up refer to, and silently renumbering a register is how
two people end up fixing different things while agreeing out loud. The crosswalk:

| Brief says | Committed register says | The subject both mean |
|---|---|---|
| F2 — arrival as one act | **F10** | two loads, one truck, one pass |
| F3 — consume / additions | **F5** | additions cannot be recorded at all |
| F4 — loss vs correction | **F3** | throwing something away files as a measurement correction |
| F5 — unknown quantity | **F4** | wine on skins has no volume yet, and the field is `not null` |
| F13 — multi-source transfer | **F13** ✓ | a transfer takes wine out of one vessel |
| F1 — missing information ≠ loss | **F1** ✓ | fixed in Step 8 |

**Every one of those five subjects is registered below under its committed
number.** Nothing in the brief has been dropped. If the brief's numbering is the
newer one, this document should be renumbered rather than re-argued — but that is
a decision, not something I should quietly adopt.

Also worth recording: **F13 has no entry in the dry run's findings table.** It was
observed during Step 8 and written into the middle of
[f1-multi-destination.md](f1-multi-destination.md). It is a real finding living in
someone else's document.

### 2 · The external research is thinner than it should be

Outbound fetching is blocked in this environment for every domain I tried
(`ecfr.gov`, `wineserver.ucdavis.edu`, `waterhouse.ucdavis.edu`, and `curl`
through the proxy returns 403). **Search worked; opening the sources did not.**

So Section 4 is built from search-result summaries with their URLs, and every row
is marked with how it was obtained. A summary of a page is not the page. Nothing
in Section 4 should be treated as a citation until someone opens the source — and
none of it should reach the product before that happens anyway, because of the
next point.

### 3 · Aldo has validated nothing

The "validated by Aldo" column in Section 1 is **`✕` for every single row**, and
that is not a defect in the table. No winery visit has happened. Everything the
build knows about how a winery works came from my reading of a harvest, and the
dry run says so in its own words: *"Co-ferments and additions are certain. The
rest is my reading of a harvest, not his."*

The column is kept anyway, because an empty column that should not be empty is
information, and because the moment it starts filling in, this table becomes the
thing that tracks it.

---

# 1 · Domain capability matrix

**Legend**

| | |
|---|---|
| ✅ | present and proven by test |
| ◐ | partly present — the note says which part |
| ✕ | absent |
| ? | unknown, and not knowable from here |

**Columns**

- **L · ledger** — can `events` + `ledger_lines` + `lot_lineage` represent it *today*, without a migration?
- **C · capture** — is there a typed `public.capture_*` operation for it?
- **U · UI** — can a person reach it from a screen in `proof/web`?
- **A · Aldo** — has the producer confirmed this is how his winery works?
- **S · source** — is it supported by published technical material (Section 4)?
- **B · safe to build now** — could it be built on proven foundations without a domain decision?
- **V · needs validation first** — does designing it require Aldo before design, not after?

## 1.1 · Movement and identity

| Operation | L | C | U | A | S | B | V | Note |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| **Reception** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ◐ | Built. `receipt` + `receipt`. Source/grower/block kept as event context, not a catalogue — deliberately, because we have not seen how this winery names blocks. |
| **Processing** (crush / destem) | ✅ | ✅ | ✅ | ✕ | ✅ | — | ◐ | Built for **one input lot → one output lot + one byproduct**. Multi-input is F2; multi-output (press fractions) has no capture path. |
| **Pressing** | ✅ | ◐ | ◐ | ✕ | ✅ | ✕ | ✅ | Collapsed into "We pressed it" together with crushing. Whether *despalillado*, *estrujado* and *prensado* are one act or three at this winery is unknown, and press fractions (free-run vs press wine) would be one input → several outputs, which `capture_processing` cannot express. |
| **Racking / transfer** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ✕ | Built and proven end-to-end. The strongest thing in Cycle 1. |
| **Multi-destination transfer** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ✕ | Step 8. 27 SQL assertions + 16 browser checks. |
| **Multi-source transfer** | ✅ | ✕ | ✕ | ✕ | ✅ | ◐ | ✅ | **F13.** The ledger takes lines from any number of vessels; `capture_transfer` takes one `p_from_vessel_code` and the sheet prefills the largest position. Can drive a vessel negative. |
| **Split** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ✕ | Naming a new lot at a destination makes it a split; lineage written without anyone asking. |
| **Blend** | ✅ | ✕ | ✕ | ✕ | ✅ | ◐ | ✅ | Ledger proven (scenario F, lineage two deep). No capture operation **on purpose** — we would rather hear how Aldo describes it first. |
| **Co-fermentation** | ✅ | ✕ | ✕ | ✕ | ✅ | ◐ | ✅ | **F2**, and the worst thing still standing. Ledger holds it (`blend`, or `transform` with two inputs; `lot_lineage` takes many parents). Nothing writes it, so a co-ferment loses one parent *and* leaves its fruit on the books. |
| **Barrel transfer** | ✅ | ✅ | ✅ | ✕ | ✅ | ◐ | ✅ | Mechanically it is a transfer into a vessel whose `vessel_type` is `barrel` — text, no migration. The open question is granularity: one lot across forty barrels, topping, and whether a barrel is a vessel or a position. |
| **Bottling** | ✅ | ✕ | ✕ | ✕ | ✅ | ✕ | ✅ | `package` + conversion rule + packaging consumption, proven in scenario G. Explicitly a later cycle. |
| **Packaging** (dry goods) | ✅ | ✕ | ✕ | ✕ | ✅ | ✕ | ✅ | Same event as bottling; `materials` + `consumption` carry it in the ledger and nothing reaches them. |

## 1.2 · Transformation and stage

| Operation | L | C | U | A | S | B | V | Note |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| **Fermentation** | ◐ | ◐ | ◐ | ✕ | ✅ | ✕ | ✅ | Recordable only as a **soft stage label** ([ADR 0003](adr/0003-no-lot-state-machine-in-cycle-1.md)) plus observations. The volume a ferment actually loses is not modelled at all. Whether that matters is Aldo's call, not mine. |
| **Malolactic fermentation** | ◐ | ◐ | ◐ | ✕ | ✅ | ✕ | ✅ | Same shape as above; may also involve a bacterial addition, which is F5. |
| **Filtration** | ◐ | ✕ | ✕ | ✕ | ✅ | ✕ | ✅ | Three things at once: a movement, a loss, and a consumption of filter media. Only the first is expressible. Unknown whether this winery filters at all, or hires it at bottling. |
| **Fining / cold stabilisation** | ◐ | ✕ | ✕ | ✕ | ✅ | ✕ | ✅ | An addition (F5), a settling loss, and often a racking. Same three-way shape as filtration. |
| **Stage** (soft label) | ✅ | ✅ | ✅ | ✕ | — | — | ✕ | Free text, accents and all, stored verbatim. The vocabulary is a finding, not a form value. Overlaps "took a reading" — **F9**. |

## 1.3 · Consumption and addition

Everything in this block sits over **one unreachable ledger primitive**:
`consume` / `consumption`. It is the only `delta_reason` of the ten that no
capture operation can write.

| Operation | L | C | U | A | S | B | V | Note |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| **SO2 addition** | ◐ | ✕ | ✕ | ✕ | ✅ | ◐ | ✅ | **F5.** `consume` + `materials` + `consumption` exist and are proven for packaging. But a dose is said as a **rate** — "thirty grams per hectolitre" — and a rate against a volume PROOF may not know is not a quantity. See **A1**. |
| **Nutrients** (DAP etc.) | ◐ | ✕ | ✕ | ✕ | ✅ | ◐ | ✅ | Same primitive, same rate problem, same missing operation. |
| **Enzymes** | ◐ | ✕ | ✕ | ✕ | ✅ | ◐ | ✅ | Same. |
| **Acid addition** | ◐ | ✕ | ✕ | ✕ | ✅ | ✕ | ✅ | Consumes stock **and** changes the wine's chemistry; mass added is real but small. |
| **Water addition** | ◐ | ✕ | ✕ | ✕ | ✅ | ✕ | ✅ | Consumes stock **and increases the lot's volume**. `consume` is a *sink* — only negative lines. This does not fit the primitive it looks like it fits. See **A3**. Also: legality varies by jurisdiction, and we have not checked Mexico's. |
| **Sugar / chaptalisation** | ◐ | ✕ | ✕ | ✕ | ✅ | ✕ | ✅ | As water. Adds mass, then most of it leaves as CO₂. |
| **Oak, tannin, fining agents** | ◐ | ✕ | ✕ | ✕ | ✅ | ◐ | ✅ | Straight consumption; the easiest members of this block. |

## 1.4 · Loss, discard, byproduct

| Operation | L | C | U | A | S | B | V | Note |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| **Loss** (standalone) | ✅ | ✕ | ◐ | ✕ | ✅ | ✅ | ✕ | **F3.** Precisely: `incident_loss` and `waste` **are** reachable from the UI — but only as the reason for a shortfall *on a transfer*. Wine you throw away while moving it is recordable; fruit you throw on the floor is not. The `loss` **event kind** is unreachable entirely. |
| **Discard / waste** | ✅ | ✕ | ◐ | ✕ | ✅ | ✅ | ◐ | As above. Who decides between `waste` and `incident_loss` — and whether Aldo distinguishes them at all — is a vocabulary question. |
| **Pomace** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ✕ | Recorded as an **output** of processing, not a loss. Correct, and worth protecting. |
| **Lees** | ◐ | ◐ | ◐ | ✕ | ✅ | ✕ | ✅ | Recorded as `expected_loss` on a transfer — a nameless quantity that leaves. Physically it is the same kind of thing as pomace, modelled as its opposite. See **A2**. |
| **Fermentation/evaporation losses** | ✅ | ✕ | ✕ | ✕ | ✅ | ✕ | ✅ | The reason exists; only a transfer can carry it. Wine that evaporates while nothing moves cannot be said. |

## 1.5 · Observation and correction

| Operation | L | C | U | A | S | B | V | Note |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| **Brix** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ◐ | `capture_observation(p_readings jsonb)`. Free-form on purpose. Nothing yet says which keys or units this winery uses. |
| **Temperature** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ◐ | Same — but a tank's temperature is a fact about the *tank*, and vessel-subject capture is **F7**. |
| **pH / TA** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ◐ | Same. |
| **Sensory notes** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ✕ | Free text. The catch-all, and deliberately so — what gets typed here on the first visits is the list of what we got wrong. |
| **Lab results from outside** | ◐ | ◐ | ◐ | ✕ | ✅ | ✕ | ✅ | Expressible as an observation with a document attached (`documents`, `event_documents` exist). No capture path, no upload path. |
| **Physical count** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ✕ | `count` + `count_variance`, proven (scenario I). A count that agrees is recorded as confirmation rather than discarded. |
| **Quantity correction** | ✅ | ✅ | ✅ | ✕ | ✅ | — | ✕ | `capture_correction`. Operator states what they see; PROOF computes the delta. |
| **Correcting anything else** | ◐ | ✕ | ✕ | ✕ | ✅ | ◐ | ✅ | **F8.** `events.corrects_event_id` exists in the schema and nothing writes it except a quantity correction. A wrong date cannot be corrected, and the fact that it is wrong cannot be recorded either. |
| **Facts about a vessel** | ✅ | ◐ | ◐ | ✕ | ✅ | ✅ | ✕ | **F7.** `events.subject_vessel_id` exists. Only a vessel's *size* can be set from a screen, and only where it is missing. "Tank 4 has a cooling jacket" rides in on whatever wine is in the tank and leaves with it. |

## 1.6 · What sits outside Cycle 1 entirely

Listed so nobody has to wonder whether they were forgotten. All of these are `✕`
in the L column too — the ledger carries cost *fields* but computes nothing.

| Area | Status |
|---|---|
| Cost attribution, yield economics | `ledger_lines` carries `unit_cost`, `cost_amount`, `currency` and computes none of it. Deliberate: the ledger will not need rebuilding when it arrives. |
| Warehouse, dispatch, SKUs, orders | The distributor product alongside this one does this. Whether they meet, and where, is unanswered. |
| Protocols as a working surface | `protocols`, `protocol_steps`, `protocol_runs`, `protocol_run_steps` exist, are tested for "the plan is never rewritten to match the outcome", and no screen touches them. |
| Compliance reporting | Nothing. Section 4 shows what a US winery is required to keep; what **Mexico** requires has not been researched and should not be guessed at. |
| Vineyard, blocks, growers, viticulture | Kept as event context only. No catalogue. |
| Natural-language capture | The reason `type_key` stores Aldo's words verbatim ([ADR 0006](adr/0006-generic-event-kinds.md)). Later cycles. |

## 1.7 · Two counting errors in our own documents

Found while building the matrix, reported rather than fixed:

- **`event_kind` has twelve values, not eleven.** [dry run 01](dry-run-01.md)
  says eleven; [ADR 0006](adr/0006-generic-event-kinds.md) and the migration
  both say twelve.
- **Four kinds are unreachable from capture, not three.** The six operations
  write eight: `receipt`, `transform`, `transfer`, `split`, `stage`,
  `observation`, `adjustment`, `count`. Unreachable: `blend`, `consume`,
  `loss` — **and `package`**, which the dry run omits because bottling was out
  of scope. It is still unreachable.

Of the ten `delta_reason` values, capture can write nine; only `consumption`
cannot be written by anything. From the **UI**, eight are reachable —
`adjustment` is accepted by `capture_correction` but not offered by any form.

---

# 2 · Domain unknowns register

Every finding F1–F13, at the state the code is actually in. **Nothing here is
solved, and nothing here should be solved from this document.**

Each entry carries the question we need Aldo to answer, written so it can be
asked out loud in a cellar without explaining the software first.

---

## F1 — a transfer can go to more than one tank · **FIXED, field-open**

| | |
|---|---|
| **Observed** | *"Racked it into Tank 7 and Tank 8, about half each."* One destination box. |
| **System behaviour then** | 525 L recorded as `expected_loss` — half a tank of Cabernet evaporating during a racking, stated as fact on the lot's own timeline. |
| **System behaviour now** | Destinations are a list. A gap is refused unless the operator names another tank or says what happened. The refusal is in the function, proven by stripping `required` off the live form. |
| **Assumption still live** | That the extra decision — *did that wine go somewhere, or is it gone?* — reads as reassurance rather than nagging. |
| **Why dangerous** | It is the one place PROOF now asks for something it used to decide. If it reads as friction at 6 a.m. with a truck waiting, operators route around it, and everything downstream degrades quietly. |
| **Ask Aldo** | "When wine goes missing between two tanks, do you already know why — or is that something you work out later?" And, watching him read a timeline: **would he notice a 525 L loss on a racking?** |
| **Ledger** | ✅ always did |
| **Capture** | ✅ Step 8 |
| **Deferrable** | Fixed. The field question is not deferrable — it is the visit. |

## F2 — a co-ferment loses a parent and leaves its fruit on the books · **worst open finding**

| | |
|---|---|
| **Observed** | *"We crushed both loads together into Tank 4 — they co-ferment."* |
| **System behaviour** | `capture_processing` takes one input lot. The second load survives as free text the lineage graph cannot see. |
| **Consequences, both verified** | The wine descends from one parent instead of two — ask it where it came from and it names half its fruit. And 1,500 kg of Cabernet sits in a bin on the tank board, weeks after it went into the tank. |
| **Current assumption** | That a co-ferment is a `transform` with several inputs. |
| **Why dangerous** | Two falsehoods from one honest sentence, and the second one **grows**: phantom fruit occupies a bin the board will offer for tomorrow's pick. |
| **Ask Aldo** | "When two loads go into the same tank — is that one wine from the start, or two wines you are keeping together? What do you call it, and when does it get its name?" |
| **Ledger** | ✅ `blend`; `lot_lineage` takes many parents; proven two deep |
| **Capture** | ✕ |
| **Deferrable** | **No.** Every day it stands, the cellar list drifts further from the cellar. |

## F3 — throwing something away has no vocabulary

| | |
|---|---|
| **Observed** | *"The second load had some rot in it. We threw maybe eighty kilos on the floor."* |
| **System behaviour** | The only action that moves a number is "that number is wrong". Eighty kilos of fruit on the floor were recorded as a **mismeasurement**. Verified: no `incident_loss` or `waste` line exists on that lot. |
| **Precisely** | `waste` and `incident_loss` *are* reachable — as reasons for a shortfall on a transfer. The `loss` event kind is not reachable at all. Loss exists only as a passenger on a movement. |
| **Current assumption** | That losing something and mismeasuring something are different acts. |
| **Why dangerous** | It is [ADR 0011](adr/0011-missing-information-is-not-a-loss.md) inverted: a physical loss converted into a correction. Collapsing the two makes every future loss report worthless — and yield, which is what a producer actually wants, is computed from exactly these numbers. |
| **Ask Aldo** | "When you throw fruit away — do you weigh it, guess it, or just not count it?" The answer decides whether this operation needs a quantity at all. |
| **Ledger** | ✅ `loss` + three reasons, scenario H |
| **Capture** | ✕ standalone |
| **Deferrable** | Briefly. It is cheap and it corrupts the number producers care about most. |

## F4 — a quantity that is not yet knowable · **genuine model gap**

| | |
|---|---|
| **Observed** | *"It is on skins, so I cannot tell you the volume yet."* |
| **System behaviour** | The volume box is `required`; the browser refuses. 1,050 L was invented in order to proceed. The confidence machinery then did its job perfectly on a fiction — everything downstream reads *estimated*, honestly describing a number nobody measured. |
| **Current assumption** | That every ledger line has a quantity. `ledger_lines.quantity` is `not null` and `<> 0`. |
| **Why dangerous** | The fix touches the invariant that makes this ledger trustworthy. Make quantity nullable and every balance rule, every view and every test has to be re-reasoned. Do not do it because one narrative asked. |
| **Why it is not an edge case** | Red wine on skins is normal in Malbec country. This will happen on day one of the visit. |
| **Ask Aldo** | "Between crushing and pressing — do you have a number for what is in that tank? Is it a guess, a tank chart, or nothing until it comes off skins?" A tank-chart estimate and no-number-at-all are different products. |
| **Ledger** | ✕ **model gap** |
| **Capture** | ✕ |
| **Deferrable** | Deferrable as *code*. Not deferrable as a *question* — it should be answered before anyone designs over it. |

## F5 — additions cannot be recorded at all

| | |
|---|---|
| **Observed** | *"Added SO2, thirty grams per hectolitre."* |
| **System behaviour** | No operation consumes a material. Nearest fit is a note on a reading. Verified: no SO2 material exists and no `consumption` line exists anywhere in the winery. |
| **Current assumption** | That an addition is a consumption of a material, attributed to a lot. |
| **Why dangerous** | Additions are **exactly** what a producer is later asked to prove — to a buyer, an auditor, or themselves. No stock, no cost, no additive history. And the rate problem in **A1** means the obvious implementation can quietly invent a number. |
| **Ask Aldo** | "When you add sulphur — do you say grams per hectolitre, or total grams for the tank? Do you know the volume when you say it? Where does the number come from — a bag, a scale, a recipe?" |
| **Ledger** | ✅ `consume` + `materials` + `consumption`, proven for packaging |
| **Capture** | ✕ — the only unwritable `delta_reason` |
| **Deferrable** | No, for the same reason as F2: certainty that it happens, plus zero ability to record it. |

## F6 — an over-full tank nets against the board's headline

| | |
|---|---|
| **Observed** | *"How much room have I got for tomorrow's pick?"* → `FREE 4,790 L · biggest 5,000 L`. |
| **System behaviour** | Tank 7's 210 L overflow is carried as negative free space and netted against Tank 3's 5,000 L. |
| **Current assumption** | That netting is right — the wine does have to go somewhere. |
| **Why dangerous** | Both numbers cannot be read as true at once, on the one screen designed to answer a question at speed. It is not a wrong number; it is a number that cannot be trusted at a glance, which on this screen is the same thing. |
| **Ask Aldo** | "If a tank is over-full, is that space you have lost or a problem you are about to fix?" |
| **Ledger** | ✅ untouched — this is presentation |
| **Capture** | n/a |
| **Deferrable** | Yes, and it should be: it is a decision about meaning, not a defect. |

## F7 — nothing can be said about a vessel on its own

| | |
|---|---|
| **Observed** | *"Tank 4 is the one with the cooling jacket. Tank 9 has not got one."* |
| **System behaviour** | The tank board offers no capture at all. The fact became a note on the wine. When that wine is bottled, the cooling jacket goes with it. Tank 9 was never mentioned, because it holds nothing and therefore does not exist. |
| **Current assumption** | That vessels come into existence by being named mid-capture ([ADR 0010](adr/0010-unknown-capacity-is-reported.md)) and need nothing else. |
| **Why dangerous** | Mild and permanent. Facts about equipment accumulate on whatever wine happened to be nearby, and are lost on a schedule nobody chose. |
| **Ask Aldo** | "What do you need to know about a tank before you decide to put wine in it?" |
| **Ledger** | ✅ `events.subject_vessel_id` exists |
| **Capture** | ◐ size only, and only where missing |
| **Deferrable** | Yes. |

## F8 — a wrong date cannot be corrected

| | |
|---|---|
| **Observed** | *"Actually that racking was yesterday, not this morning."* — 0 taps, because there is no way in. |
| **System behaviour** | Zero controls on any recorded entry. "That number is wrong" takes a quantity and nothing else. The entry stays wrong, and nothing records that it is wrong. |
| **Current assumption** | That corrections are corrections of quantity. |
| **Why dangerous** | Silent divergence between the ledger's story and the winery's. Also the first thing a producer tries after mistyping — failing there teaches them the record cannot be trusted, on day one. |
| **Ask Aldo** | "How often does something get written down on the wrong day? When you notice, what do you do about it now?" |
| **Ledger** | ✅ `events.corrects_event_id` exists; history is immutable and corrections are recorded, never applied in place |
| **Capture** | ✕ for anything but quantity |
| **Deferrable** | Yes, but it is cheap and the schema is already shaped for it. |

## F9 — "something changed" and "took a reading" overlap

| | |
|---|---|
| **Observed** | *"Two pump-overs today, morning and evening."* — the one AMBIGUOUS verdict in the run. |
| **System behaviour** | Filed as a stage, the lot card reads **DOING: remontado** — as though a pump-over were a state the wine is in rather than work somebody did twice. The count is gone: verified, no structure anywhere holds the number two. |
| **Current assumption** | That operations divide into "milestones" and "measurements". |
| **Why dangerous** | It is a **naming** failure that becomes a data failure: the two choices file the same sentence differently and permanently, and the operator is the one who has to pick. This is where a person hesitates, and the script could only observe that both fit. |
| **Ask Aldo** | "Is a pump-over something you *did*, or something the wine *is doing*? Do you count them?" |
| **Ledger** | ◐ `stage` and `observation` both exist; **work performed** has no primitive of its own (see Section 3) |
| **Capture** | ◐ both, ambiguously |
| **Deferrable** | The rename, yes. The question, no — it is one of the cheapest things to ask and it shapes the vocabulary. |

## F10 — arrival as one act · **genuine model gap**

| | |
|---|---|
| **Observed** | *"Two loads of Cabernet came in this morning from La Cañada, about a tonne and a half each."* |
| **System behaviour** | One sentence became two receptions, ten fields each, 15 taps. Verified: neither is attached to any shared run and neither references the other. Nothing records that they came on the same truck, from the same block, on the same pass. |
| **Current assumption** | That a reception is one lot arriving. |
| **Why dangerous** | Less dramatic than F2, more structural: **there is no concept of events that belong together, and no obvious place for one.** `protocol_runs` is the nearest existing shape and it means something else — it is the plan, not a grouping of what happened. Solving this wrong installs a second grouping mechanism forever. |
| **Ask Aldo** | "When two loads arrive together — is that one delivery or two? Do they stay separate, and until when? What decides whether they get one name or two?" |
| **Ledger** | ✕ **model gap** — no event-grouping concept |
| **Capture** | ✕ |
| **Deferrable** | Yes as code. **No as a question** — it is the other one that goes to Aldo before design. |

## F11 — an over-capacity transfer is accepted without comment

| | |
|---|---|
| **Observed** | 525 L accepted on top of a tank already holding 1,685 L of a different wine, in a 2,000 L tank. Not a word at capture; flagged afterwards, on a different screen. |
| **System behaviour** | Accepted, then shown as **210 L over** on the board. |
| **Current assumption** | That the ledger permits many lots per vessel and imposes no cardinality ([ADR 0005](adr/0005-vessel-lot-cardinality.md)) — correct — and therefore that the *product* should not intervene either — **not established**. |
| **Why dangerous** | The refusal-vs-warning choice is a product decision, and F1 has already shown what happens when PROOF makes such a decision on the operator's behalf. Refusing a physically-possible operation mid-work is its own failure mode; a tank *can* be over-filled, and sometimes is. |
| **Ask Aldo** | "Has a tank ever been over-filled? Would you want the system to stop you, warn you, or stay out of it?" |
| **Ledger** | ✅ capacity is known where recorded; occupancy is derived |
| **Capture** | ✕ no check |
| **Deferrable** | Yes — and it should wait for that answer. |

## F12 — spent lots stay in the cellar list at 0

| | |
|---|---|
| **Observed** | Noise that will grow all vintage. |
| **System behaviour** | An emptied lot remains in the list showing 0. The lot page correctly narrows what it offers (an empty lot can only take a note or a stage), so the ledger already knows the difference. |
| **Current assumption** | That the cellar list shows every lot. |
| **Why dangerous** | Barely, in itself. It matters because by vintage end the list is mostly wine that no longer exists, and a list nobody scans is a list nobody checks. |
| **Ask Aldo** | "When a wine is gone, do you want it out of the way — or is it still yours until the bottles are sold?" |
| **Ledger** | ✅ balances are derived; nothing to change |
| **Capture** | n/a |
| **Deferrable** | Yes. |

## F13 — a transfer takes wine out of one vessel

| | |
|---|---|
| **Observed** | Surfaced by the F1 fix, not by the dry run. Once a lot can easily live in two tanks, racking "the whole lot" picks a single source — the largest position, prefilled — and can take out more than that tank holds. |
| **System behaviour** | Leaves a negative position. The F1 fidelity check asserts the **F1 path** leaves no negative position anywhere; it does not close this one. |
| **Current assumption** | That wine leaves from one place. Multi-source is the exact mirror of multi-destination. |
| **Why dangerous** | It has the shape of F1: input the sheet cannot express, absorbed silently into a number that looks like knowledge. And a negative vessel position is worse than a wrong one — it is a state the physical world cannot be in. |
| **Ask Aldo** | "Do you ever bring two tanks together into one? When you rack a wine that is sitting in two tanks, is that one job or two?" |
| **Ledger** | ✅ lines carry any number of source vessels |
| **Capture** | ✕ one `p_from_vessel_code` |
| **Deferrable** | Yes — but it is not merely the mirror of F1. It belongs to the many-to-one family with **blend** and **F2** (see **A4**), and deciding the three separately risks three mechanisms for one ledger shape. |

---

## Audit observations — things this audit noticed that are not in the register

Numbered `A` to keep them clearly distinct from the findings, which came from a
run. **These are readings of code, not observations of a winery.** None is
solved here.

### A1 — a dose is a rate, and a rate against an unknown volume is not a quantity

*"Thirty grams per hectolitre"* × a volume = an absolute quantity, which is what
`ledger_lines` stores. But **F4 says the volume may not exist yet**, and a red
wine on skins is precisely when SO2 gets added.

So the naive implementation of F5 computes a quantity from a volume that was
invented to satisfy a `not null` constraint — a fabricated number multiplied by a
real one, stored as fact. **F5 and F4 are coupled, and F5 cannot be designed as
though F4 were not there.** ADR 0011 already names this class: *unknown quantity
≠ zero*.

### A2 — pomace is an output; lees are a nameless loss

Pomace leaves processing as a **material with an identity** — it can be weighed,
stored, sold, counted. Lees leave a racking as `expected_loss` — a quantity that
vanishes with a reason attached and no identity at all.

Physically they are the same kind of thing: solids separated from liquid, that a
winery may keep, sell, distil or dump. The asymmetry is not wrong today, but it
was never decided; it fell out of the order the operations were built in. If Aldo
does anything at all with lees, the model says he cannot.

### A3 — `consume` is a sink, so an addition that adds volume does not fit it

`app.event_balance_rule('consume')` is `sink`, and the validator refuses **any
positive line** on a sink event. SO2, nutrients and enzymes are fine — the mass
they add is negligible and nobody wants it in the balance.

**Water and sugar are not fine.** They consume stock *and* increase the wine, and
that is two signs on one event. The expressible shape is `transform` (a
conversion, inputs → outputs), which is a different sentence from the one the
operator says. Whichever way it goes, it is a modelling decision — and it should
not be discovered halfway through building F5.

### A4 — three findings are the same shape: many-to-one

Three separate items in the register are the same ledger shape — several sources,
one destination — seen through three different sentences:

| said | what joins | register |
|---|---|---|
| "we crushed both loads into Tank 4" | two **fruit** lots → one new must lot | **F2** |
| "I put these two tanks together" | two **wine** lots → one lot | **blend** (no capture operation, deliberately) |
| "rack the whole lot" when it sits in two tanks | one lot, from several **vessels** | **F13** |

They are genuinely different acts and should not be collapsed. But they will be
designed against the same lines, lineage and refusals, and if they are designed
weeks apart by different reasoning, the product ends up with three ways to say one
physical shape. Worth putting on one page before any of them is built.

---

# 3 · Winemaking operation taxonomy

A vocabulary for what a producer does, **written so that no wine-specific idea
enters the core.** A brewery, a distillery, a cheesemaker and a winery should all
be describable in it; the industry's words live beside the primitives as data,
never inside them ([ADR 0006](adr/0006-generic-event-kinds.md)).

Read this as a proposal to test against Aldo's speech, not as a model to install.

## 3.1 · The primitives

Eight classes. Each is defined by **what it asserts about quantity** — because
that is the only thing the ledger can enforce — and by whether it changes
identity.

| Class | Asserts | Identity | PROOF `event_kind` | Balance rule |
|---|---|---|---|---|
| **Movement** | the same quantity is now somewhere else; nothing entered or left the world | unchanged | `transfer` | movement legs net to zero |
| **Transformation** | inputs became outputs, possibly in another unit; no conservation is claimed | new identity from old | `transform`, `package` | conversion: ≥1 in, ≥1 out |
| **Consumption / addition** | something was used up; a material left stock and went into the work | unchanged | `consume` | sink: only negative lines |
| **Observation** | something was measured or noticed; **nothing moved** | unchanged | `observation` | no ledger lines permitted |
| **Stage** | an operational milestone was reached; **nothing moved** | unchanged | `stage` | no ledger lines permitted |
| **Loss / discard** | a quantity genuinely left, and says why | unchanged | `loss` | sink |
| **Correction** | the *record* was wrong, and is being corrected — **not** the world | unchanged | `adjustment`, `count` | only `adjustment`, `resolution`, `count_variance`; a note is required |
| **Lineage / identity** | this thing came from those things | created or merged | `split`, `blend` (and lineage on `transform` / `package`) | movement + lineage mandatory |

### Three rules that make the taxonomy hold

1. **Correction is not physical.** A correction changes what PROOF believed; a
   loss changes what exists. Collapsing them makes every loss report worthless
   and is half of [ADR 0011](adr/0011-missing-information-is-not-a-loss.md).
2. **Lineage is not an operation.** Nobody performs a lineage. It is a
   *consequence* of a transformation, a split or a blend, and the ledger writes
   it without being asked. If a user ever has to record ancestry by hand, the
   taxonomy has failed.
3. **A byproduct is an output, not a loss.** Pomace is a thing that exists.
   Evaporation is not. What separates them is whether the quantity still has an
   identity afterwards — which is exactly the question **A2** says we never
   asked about lees.

### The class the taxonomy does not have — and F9 is its symptom

**Work performed.** A pump-over, a punch-down, a topping-up, a stir. Nothing
moves between vessels, nothing is consumed in any quantity anyone tracks, nothing
is measured — but something was *done*, sometimes twice a day, and the number of
times matters.

Today it lands on `stage` (and the lot then reads *"DOING: remontado"*, as though
it were a state the wine is in) or on `observation` (and it is filed as a reading
that read nothing). Both are wrong in a small way that compounds: **F9 is not a
naming problem, it is a missing primitive wearing a naming problem's clothes.**

Whether it deserves its own class, or is a `stage` that carries a count, is a
decision. It is not one to make from here. It is, however, one of the cheapest
things to settle in a cellar: watch what he does twice a day and ask what he
calls it.

### The relation the taxonomy does not have — and F10 is its symptom

**Belonging-together.** Two loads, one truck, one pass. Three rackings that were
one afternoon's job. This is not a class of event; it is a *relation between*
events, and PROOF has no place to put one. `protocol_runs` is the nearest
existing shape and means something different — it is the plan, not a grouping of
what happened.

## 3.2 · Mapping wine language onto the primitives

**This table is a hypothesis.** Every phrase in it is my reading, not Aldo's
usage — which is exactly why `events.type_key` stores the operator's own words
verbatim beside the primitive. When the words come back different, the words win
and the primitives should not move.

| What is said | Primitive | PROOF today | Reachable? |
|---|---|---|---|
| *"trasiego"* / "we racked it" | movement | `transfer` | ✅ |
| *"lo pasé a otro tanque"* | movement | `transfer` | ✅ |
| "Tank 7 and Tank 8, about half each" | movement, several destinations | `transfer` + destinations | ✅ Step 8 |
| "rack the whole lot" (lot in two tanks) | movement, several **sources** | `transfer` | ✕ **F13** |
| *"despalillado y estrujado"* / "we crushed it" | transformation | `transform` + lineage | ✅ |
| *"prensado"* / "we pressed it" | transformation | `transform` | ◐ collapsed with crushing |
| free-run vs press wine | transformation, several outputs | `transform` (ledger) | ✕ no capture |
| *"mezclé estos dos tanques"* / "I blended them" | lineage + many-to-one movement | `blend` | ✕ ledger only |
| *"cofermentan"* / "they co-ferment" | transformation, several inputs | `transform` / `blend` | ✕ **F2** |
| *"le agregué SO2"* / "added sulphur" | consumption | `consume` | ✕ **F5** |
| *"le puse nutriente"* / enzymes / oak | consumption | `consume` | ✕ **F5** |
| *"le agregué agua"* / *"chaptalicé"* | consumption **+** quantity increase | no single fit | ✕ **A3** |
| *"empezó a fermentar"* | stage | `stage`, free text | ✅ |
| *"hice dos remontados"* | *work performed* | no primitive | ◐ **F9** |
| *"el Brix está en 24"* | observation | `observation` + readings | ✅ |
| *"huele bien"* | observation | `observation` note | ✅ |
| "Tank 4 has a cooling jacket" | observation, **subject is a vessel** | `subject_vessel_id` | ✕ **F7** |
| *"tiramos la fruta podrida"* / "we threw it away" | loss / discard | `loss` + `waste` | ◐ only during a transfer — **F3** |
| *"se derramó"* / "it spilled" | loss | `loss` + `incident_loss` | ◐ same |
| lees left behind in a racking | loss **or** byproduct? | `expected_loss` | ◐ undecided — **A2** |
| pomace to the pile | byproduct (an output) | `transform` output | ✅ |
| *"la báscula estaba mal"* / "the scale was wrong" | correction | `adjustment` + `resolution` | ✅ |
| *"medí el tanque bien: son 985"* | correction | `adjustment` | ✅ |
| *"lo conté: hay 240 cajas"* | correction (count) | `count` + `count_variance` | ✅ |
| *"eso fue ayer, no hoy"* | correction, **non-quantity** | `corrects_event_id` | ✕ **F8** |
| *"no sé cuánto hay todavía"* | — | nothing can say this | ✕ **F4** |
| "two loads, same truck" | relation, not an event | nothing | ✕ **F10** |
| *"embotellamos"* | transformation | `package` | ✕ ledger only |

## 3.3 · What must not leak into the core

Recorded so a later cycle does not undo it by accident:

- **No wine words in `event_kind`.** Not `racking`, not `pressing`, not
  `sulfiting`. Those are `type_key`, which is data.
- **No stage machine.** ([ADR 0003](adr/0003-no-lot-state-machine-in-cycle-1.md))
  We do not yet know the valid transitions, and a wrong one refuses a legitimate
  operation in front of the user, mid-work.
- **No "wine" in the units table.** Netting happens per base unit; bottles,
  cases and boxes are separate bases on purpose.
- **No vessel cardinality rule in the ledger.**
  ([ADR 0005](adr/0005-vessel-lot-cardinality.md)) Co-fermentation exists;
  breweries blend in vessel. Any rule the product wants is an application
  decision against visible data.
- **No derived state stored.** Volume, location and stage are all derived, and a
  structural test asserts the columns never appear
  ([ADR 0008](adr/0008-timeline-is-a-projection.md)).

---

# 4 · Source vs field reality

**Read the limitation first.** Outbound fetching is blocked in this environment
for every domain attempted, so **every row below is drawn from a search-result
summary, not from the source itself.** URLs are given so someone can open them;
until someone does, treat these as leads.

**And read the purpose second.** This section is discovery, not prescription. A
textbook operation is evidence that something *exists in the world*, never
evidence that Viñas del Tigre does it, nor that PROOF should have a screen for
it. **A winery may choose different methods, and the product must support
different wineries rather than force one recipe.** Every row therefore carries a
"needs Aldo" mark, and almost all of them say yes.

| Operation (external) | Source | What it says | PROOF today | Needs Aldo |
|---|---|---|---|---|
| Crush, press, ferment, filter, age as the core sequence | [UC Davis CPE · Step by Step Winemaking](https://cpe.ucdavis.edu/section/step-step-winemaking-part-1), [UC Davis CPE · Winemaking](https://cpe.ucdavis.edu/areas-study/winemaking) | Working with incoming fruit, crushing red and white, pressing by traditional and non-traditional methods; juice and yeast preparation, fermentation, filtration, aging; must analysis, alcoholic and malolactic fermentation, fining, sanitation | Reception ✅, processing ✅ (single input/output), transfer ✅. Fermentation only as a soft stage. Filtration, fining, MLF: nothing | ✅ — which of these are *separate acts* to him is the whole question |
| SO2 at crush and after fermentation | [UC Davis V&E · oxidation management](https://pasowine.com/wp-content/uploads/PRWCA_Oxygen-Managment_032019nn.pdf) (UC Davis material, third-party host) | 50–80 mg/L at crushing depending on fruit condition, temperature and pH; ~30 mg/L free SO2 targeted immediately after alcoholic fermentation | **Cannot be recorded at all** — F5. Note both figures are **rates**, which is A1 | ✅ |
| Molecular SO2 as the maintenance target | [UC Davis · Waterhouse lab research spotlight](https://news.bftv.ucdavis.edu/viticulture-and-enology/research-spotlight-dr-andy-waterhouse-wine-chemistry-many-froonts), [AJEV 71(3):222](https://www.ajevonline.org/content/71/3/222) | 0.8 mg/L molecular SO2 as a cellaring maintenance level (attributed to Boulton); inhibitory thresholds differ by organism; measurement method itself is contested — "weakly bound" sulfites read as free in Ripper and aspiration methods | Nothing. It is a **derived value** from free SO2, pH and temperature — a later-cycle "what it means" question, not a capture one | ◐ only if he tracks it |
| Cold stabilisation | [AWRI · cold stabilisation](https://www.awri.com.au/industry_support/winemaking_resources/storage-and-packaging/pre-packaging-preparation/cold-stabilisation/) | Wine chilled to precipitate potassium bitartrate, then racked or filtered off the crystals; warming before that racking re-dissolves crystals, so the wine is only stable to the temperature it was filtered at | Composite: a temperature regime + a racking + a loss. Only the racking is expressible | ✅ |
| Crystallisation inhibitors (CMC, KPA) | [AWRI · carboxymethylcellulose](https://www.awri.com.au/industry_support/winemaking_resources/frequently_asked_questions/carboxymethylcellulose/) | An addition as an alternative to cold stabilisation — inhibitors bind crystal faces after nucleation and prevent visible growth | An addition — F5 | ✅ |
| Filtration | [AWRI · filtration](https://www.awri.com.au/industry_support/winemaking_resources/storage-and-packaging/pre-packaging-preparation/filtration-physical-removal-of-microorganisms/) | Clarity for style, and removal of microorganisms for microbiological stability after packaging | Nothing. Three primitives at once: movement + loss + consumption of media | ✅ — including *whether he filters at all* |
| Fining | [AWRI](https://www.awri.com.au/industry_support/winemaking_resources/) via search summary; [Wikipedia · clarification and stabilization](https://en.wikipedia.org/wiki/Cold_stabilization) | A fining agent is added to bind suspended particles into larger ones that precipitate | An addition + a settling loss + usually a racking | ✅ |
| Chaptalisation | [Must Adjustments · Lum Eisenman](https://www.gencowinemakers.com/docs/Must%20Adjustments.pdf), [WineMaker · chaptalization](https://winemakermag.com/technique/chaptalization-and-fermentation) | Sugar added to raise alcohol; overdone it stresses yeast and risks a stuck fermentation | Nothing, and it does not fit `consume` — **A3**. Legality varies by jurisdiction; **Mexico's rules have not been checked** | ✅ |
| Acidification | [Wine acidification methods · OENO One](https://oeno-one.eu/article/view/7476), [Winemakers Research Exchange](https://winemakersresearchexchange.com/library/post-fermentation-and-aging/strategies-for-acid-adjustment/) | Tartaric acid most common for adjusting acidity and pH in warm-climate fruit | An addition — F5 | ✅ |
| Water addition / amelioration | [Must Adjustments · Lum Eisenman](https://www.gencowinemakers.com/docs/Must%20Adjustments.pdf), [WineMaker · adjust your must](https://winemakermag.com/technique/adjust-your-must) | Water added to crushed grapes to reduce alcohol or dilute TA into range | Nothing, and it **increases the lot's volume** — **A3**. Also jurisdiction-dependent | ✅ |
| Yeast nutrients (DAP) | [Must Adjustments · Lum Eisenman](https://www.gencowinemakers.com/docs/Must%20Adjustments.pdf) | ~0.5 g/gal DAP and proprietary nutrient at fermentation start; excess produces off-odours | An addition — F5. Again a **rate** | ✅ |
| Co-fermentation and field blends | [Co-fermentation · Wikipedia](https://en.wikipedia.org/wiki/Co-fermentation), [Ridge Vineyards](https://www.ridgewine.com/about/news/co-fermentation-of-syrah-and-viogner/), [Wine Enthusiast · blending vs co-fermenting](https://www.wineenthusiast.com/basics/blending-and-co-fermenting/) | Two or more varieties fermented together in one vessel — explicitly distinguished from blending finished wines later in the cellar | **F2.** The distinction the sources draw is exactly the one PROOF cannot express: co-ferment ≠ blend | ✅ — and this one is *certain* to occur |
| Records a US winery must keep | [27 CFR 24 subpart O](https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-24/subpart-O), [§24.300](https://www.law.cornell.edu/cfr/text/27/24.300), [TTB · winery requirements](https://www.ttb.gov/business-central/requirements-wineries), [TTB Boot Camp · records (PDF)](https://www.ttb.gov/system/files/2024-12/Boot_Camp_for_Wine_Records_Presentation.pdf) | Materials received and used — including **chemicals and acids**; bulk wine records; bottling records; transfer records; taxpaid removal; three-year retention | Materials received/used is **F5**. Bottling is a later cycle. Bulk wine records ≈ the ledger, which is the one part that is genuinely strong | ◐ **jurisdiction**: this is US law and Viñas del Tigre is in Mexico. Cited as evidence of *what wineries are asked to prove*, not as a requirement to implement |
| Inventory losses | [27 CFR 24.313](https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-24/subpart-O/section-24.313), [§24.266](https://www.law.cornell.edu/cfr/text/27/24.266) | A physical inventory of bulk wine determines losses from spillage, leakage, soakage, evaporation "and other losses normally occurring from racking and filtering"; unexplained losses are treated differently from explained ones | **This is `delta_reason` almost verbatim** — `expected_loss` / `incident_loss` / `waste` / `count_variance`. Independent corroboration that the ledger's distinctions are the ones the industry actually draws | ✕ — the model is corroborated; how *he* names them is F3 |

### What the sources changed about my reading

- **Three of the ledger's distinctions were corroborated from outside**: loss-vs-correction, expected-vs-incident loss, and count variance as its own category. That is the strongest external result here, and it argues for leaving the ledger alone.
- **Additions are more of the domain than one line item.** SO2, nutrients, enzymes, acid, sugar, water, fining agents and crystallisation inhibitors are all the same missing operation, and one of the two things the regulator's list is *about*.
- **Doses are stated as rates in every source that gives numbers.** mg/L, g/hL, g/gal. Not one gives a total for a tank. That makes **A1** a domain fact rather than a modelling worry.
- **Composite operations are normal.** Cold stabilisation, filtration and fining are each two or three primitives at once. If capture only ever offers one primitive per sheet, common work will always take several sheets — or get filed as whichever primitive is nearest.
- **The sources agree on a sequence and disagree on everything else.** Which is precisely why none of this becomes a workflow. **A textbook sequence is not a recipe to install.**

---

# 5 · Final output

## A · SAFE TO BUILD NOW

Proven by the current model and the dry run. Each rests on a ledger primitive
that already has passing tests, needs no migration to the invariant layer, and
needs no domain decision to begin.

| | Why it is safe | Caveat |
|---|---|---|
| **A standalone loss operation (F3)** | `loss` + `incident_loss` / `waste` proven in scenario H; the same three reasons are already worded on the transfer sheet | Whether he weighs, guesses or ignores discarded fruit shapes the *form*, not the model |
| **Multi-input processing for co-ferments (F2)** | `transform` takes many inputs; `lot_lineage` takes many parents, proven two deep; the dry run's own recommendation, and it clears two verified falsehoods at once | The *mechanism* is safe; **what the co-ferment is called** is Aldo's. See **A4** before building blend or F13 alongside |
| **Additions as an absolute quantity of a named material** | `consume` + `materials` + `consumption` proven in scenario G | **Only** absolute quantities. A dose entered as a rate is not safe — that is **A1**, and it belongs in list B |
| **Facts about a vessel (F7)** | `events.subject_vessel_id` already exists; an observation with a vessel subject writes no ledger lines and cannot unbalance anything | Empty vessels need a way onto a screen first |
| **Correcting things other than quantity (F8)** | `events.corrects_event_id` exists; history stays immutable — a correction is recorded, never applied in place | Which fields are correctable is a small product decision |
| **Hiding spent lots from the cellar list (F12)** | Balances are derived; the lot page already narrows what it offers for an empty lot | Reversible presentation. Show him anyway — he may not want them gone |

**A note on order.** This list is not a plan. F2 clears two verified falsehoods
and F3 corrupts the number producers care about most; the rest can wait for
someone to ask for them.

## B · WAIT FOR ALDO

Real producer behaviour is needed **before design**, not after. Split by what
kind of answer is missing.

**Model questions — the two the dry run already escalated**

- **F4 · a quantity that is not yet knowable.** Making `quantity` nullable touches the invariant that makes the ledger trustworthy. Ask what he actually has between crush and press: a guess, a tank chart, or nothing.
- **F10 · arrival as one act.** There is no concept of events that belong together and no obvious place for one. Installing the wrong grouping mechanism is forever.

**Shape questions — decide the family together (A4)**

- **Blend** — no capture operation, deliberately, until we hear him describe one.
- **F13 · multi-source transfer** — and whether a lot living in two tanks is even a thing he does.

**Modelling decisions this audit surfaced**

- **A1 · a dose is a rate.** Every source states doses per volume; F4 says the volume may not exist. F5 cannot be designed as though F4 were not there.
- **A3 · additions that add volume.** Water and sugar consume stock *and* increase the wine. `consume` is a sink and refuses positive lines. Also: check what is even legal in Mexico before designing it.
- **A2 · are lees a loss or a byproduct?** Pomace has an identity; lees do not. Nobody decided that. Ask whether he keeps, sells, distils or dumps them.
- **F9 · is "work performed" a primitive?** A pump-over is not a state the wine is in. Watch him do one and ask what he calls it.

**Product-behaviour questions**

- **F11** — refuse, warn, or stay out of the way when a tank would be over-filled.
- **F6** — what the headline free-space figure should mean when a tank is over.
- **Pressing granularity** — one act or three, and whether press fractions become separate lots.
- **Barrel granularity** — is a barrel a vessel, and what does topping-up look like.
- **Fermentation volume loss** — does the wine that leaves as CO₂ matter to him.
- **Reading vocabulary** — which keys, which units, whose thresholds.
- **Reception context** — do blocks and growers need to become a catalogue, or stay as words on the event.
- **F1, in the field** — does the new question read as care or as nagging; and would he notice a 525 L loss on a racking.

## C · RESEARCH ONLY

Worth understanding. Not currently relevant to implementation, and building any
of it now would be building on the unanswered half of list B.

| | Why it is not now |
|---|---|
| **Bottling and packaging** | `package` + packaging consumption proven in scenario G; explicitly a later cycle. The ledger is ready and nothing else is |
| **Filtration, fining, cold stabilisation** | Each is two or three primitives at once. Composite operations should not be designed before the primitives they compose are reachable |
| **Malolactic fermentation** | A stage plus possibly an addition. Waits on F5 and on the stage question |
| **Compliance recordkeeping** | The TTB material is US law and this winery is in Mexico. Valuable as evidence of *what wineries are asked to prove*; researching Mexico's actual requirements is its own piece of work and has not been done |
| **Molecular SO2 and other derived indices** | "What it means" belongs to a later cycle. Recording the addition comes first, and cannot yet be done at all |
| **Cost attribution and yield economics** | `unit_cost`, `cost_amount` and `currency` are carried and computed nowhere, on purpose |
| **Protocols as a working surface** | Four tables, tested, and no screen. The plan layer earns its keep when there is a plan to compare against |
| **Natural-language capture** | The reason `type_key` stores his words verbatim. The vocabulary has to be collected before anything can parse it |
| **Lab results as documents** | `documents` and `event_documents` exist; no upload path, no capture path |
| **Where this meets the distributor product** | Two products, one repository, and no decided boundary. Not a Cycle 1 question |

---

## The one-page version, for the visit

If only a few questions get asked, ask these — they are the ones where a wrong
assumption costs the most to undo:

1. When two loads go into the same tank, is that one wine or two? *(F2)*
2. Between crush and press, do you have a number for what is in that tank? *(F4)*
3. When you add sulphur, do you say it per hectolitre or as a total? *(F5, A1)*
4. When you throw fruit away, do you weigh it? *(F3)*
5. Two loads on one truck — one delivery or two? *(F10)*
6. Do you ever put two tanks together, or rack a wine that sits in two? *(blend, F13)*
7. A pump-over — something you did, or something the wine is doing? Do you count them? *(F9)*
8. If a tank would be over-filled, should we stop you? *(F11)*
9. What do you do with the lees? *(A2)*
10. *(watching him read a timeline)* Does anything on that screen look wrong? *(F1)*

---

## What this audit did not do

- It did not change code, schema, migrations or UI. The working tree was clean when it started; the diff is this file, plus the one line in `proof/README.md` that points at it.
- It did not implement or design F2–F13.
- It did not decide anything in list B.
- It did not open a single one of the sources in Section 4 — the environment blocked every fetch, and the rows say so.
- It did not ask Aldo anything, which is why the fourth column of Section 1 is empty from top to bottom.
