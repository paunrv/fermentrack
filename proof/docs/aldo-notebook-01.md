# Aldo's notebook — Colombard Pet Nat 2026

The first real producer data this project has had. A whole wine, from a pick on
10 August to bottling on 28 August, written by the person doing the work while he
was doing it.

Everything below is read off that notebook. Where a number is checked it says so;
where the notebook cannot answer something the question is left open for Aldo
rather than guessed at.

> **Status:** written before the audio answers to the ten questions arrived. It
> covers the notebook only. Merge with the interview when it lands.

---

## The headline

**The pattern that dominates this wine is many-into-one, and we have not built
it.** Step 8 fixed one wine going to several tanks. The notebook barely does
that. What it does constantly is the mirror:

- two pressings of one crush, both into the same 500 L tank
- two juice fractions per pressing — *escurrido* and *prensa suave* — recorded
  separately, then totalled
- a second, separate harvest on 25 August pressed into 64 L, then fed into the
  fermenting wine in **two instalments** (30 L, then 7 L) two days later

Not one of those is expressible today. `capture_processing` takes one input lot
and yields one output lot. `capture_transfer` moves one lot out of one vessel.
The `blend` event kind exists in the ledger and nothing in the product writes it.

F13 — multi-source — was filed as an observation at the end of Step 8. The first
real data says it is not an edge case. It is how he works.

---

## The notebook, reconciled

Arithmetic checked, not eyeballed.

| step | in | out | closes? |
|---|---|---|---|
| Cosecha → Molienda | 1,400 kg aprox | 35 cajas @ 16–17 kg ≈ **560–595 kg** | **no** — 805–840 kg unaccounted |
| Molienda | 35 cajas | 480 L mosto · 1.086 / 20.5 Brix | transformation |
| Prensa 1 | 220 L | 130 escurrido + 30 prensa suave = 160 | |
| Prensa 2 | 260 L | 120 escurrido + 40 prensa suave = 160 | |
| **both pressings** | **480 L** ✓ matches the molienda | **320 L** ✓ matches his total | 160 L became solids |
| Desfangado 12/8 | — | — | **no volume recorded** |
| Trasiego 22/8 | — | — | no volume; density left blank |
| Trasiego 27/8 | −20 L lías · +30 L jugo | — | partial |
| 27/8, 22:00 | +7 L jugo | — | |
| Embotellado 28/8 | ? | 23 cajas − 4 botellas, **plus "? cajas"** of a second format | **no** |

Two things the notebook cannot answer about its own wine:

- **Where did the other ~800 kg of the pick go?** Either the 1,400 kg was the
  whole day and only 35 boxes became this wine, or the figures measure different
  things. Only Aldo knows.
- **How much wine did he make?** 23 cases less four bottles of one format, and an
  unknown number of the other. The question PROOF exists to answer is the one
  question this notebook structurally cannot.

The second pick has the same shape: 117 kg → 64 L pressed, 30 + 7 = 37 L used,
**27 L left in the kitchen fridge** with no further mention. Is that wine? Does it
have a name? It is the kind of thing that quietly disappears from a vintage.

---

## Your questions, and what the notebook already answers

Worth knowing before the interview, so the time goes on what is still unknown.

### 1 · Joining wine from several vessels

**Partly answered, and it is bigger than expected.** The notebook shows three
distinct kinds of many-into-one, and they are not the same operation:

| | what it is | identity afterwards |
|---|---|---|
| two pressings of one crush | one logical operation, run twice | one wine |
| escurrido + prensa suave | two *fractions* of one pressing | totalled here — but are they ever kept apart? |
| juice added to fermenting wine | a different pick, a different day | ? |

**Still to ask:** are escurrido and prensa suave ever kept as separate wines? And
when he adds 30 L of Colombard juice to a fermenting Colombard, does he think of
it as the same wine, or as two wines becoming one?

### 2 · Wine in a tank without knowing how much

**Confirmed, repeatedly.** After *desfangado* on 12 August there is no volume in
the notebook, and there is none again after the 22 August *trasiego*. The next
volume-bearing entry is 27 August — fifteen days later — and even then it is only
a delta (−20 lías, +30 jugo), never a total.

So the honest reading is stronger than F4 assumed: it is not that a volume is
temporarily unknowable, it is that **for most of this wine's life nobody measured
it and nobody needed to.** He tracked density instead.

**Still to ask:** does he ever want PROOF to tell him the running volume, or is
"what is in the tank" only interesting at racking and bottling?

### 3 · What a loss really means

**One hard number: "se quitaron 20 litros de lías."** Lees leaving the wine, with
a volume, deliberately. Not a spill, not evaporation, not a mismeasurement.

And 160 L of the must became solids at pressing — which he does *not* write down
as a loss at all. He writes the input and the output and lets the difference be
implied. That is exactly how `transformation` already behaves, so the model has
this one right.

**Still to ask:** the 20 L of lees — thrown away, or kept for something?

### 4 · Lees, pomace and solids

**The notebook measures lees in litres and does not measure pomace at all.** Two
byproducts, two different treatments, in one wine. Current model: pomace is an
optional byproduct quantity on a pressing; lees have no representation whatsoever.

### 5 · Additions

**The one addition in the notebook is the harvest SO₂ — and it does not
reconcile.** He wrote *"2 gr/hL, total 15 gr"*. Two grams per hectolitre gives
15 g at 750 L; the must was 480 L, and the fruit was 1,400 kg. Three candidate
denominators, none of which produces the number written.

That is not a mistake in the notebook. It is the point: **the dose is a rate, and
at the moment of dosing the thing it is a rate of does not exist yet.** You dose
fruit on a trailer in grams per hectolitre of a wine that has not been pressed.

The juice additions are the second kind entirely — not a dosed material but wine
added to wine, with a target: *"se agregaron 30 litros de jugo para lograr
1.008 · Resultado: 1.006."*

### 6 · Work that changes no inventory

**Richly confirmed, and with a consequence nobody has raised.** From this wine
alone:

- *se pasó a tanque 500 L con placa y máximo frío posible* — cooling plate on
- *desfangado, 8–9 °C, terminado 11.5 °C* — a settling with a start and an end
- *se quitó placa de enfriamiento* — cooling plate off
- *se puso cobija eléctrica porque se sintió que bajó fermentación* — electric
  blanket on, and **why**
- *se usó la bombita diafragma de agua* — which pump

The last one matters more than it looks. He records the pump because it changed
the result: *"saca mucha espuma con mostos fermentando y es probable que saque
CO₂ disuelto del mosto."* The equipment chosen altered the measurement taken.
That is not a stage and not a reading — it is work performed, with an instrument,
having an effect on the numbers. Your WORK PERFORMED class is real.

### 7 · What constitutes a reception

**Look at what he actually wrote down.** The 10 August entry records, in order:
the date, the Brix, then — at length — the *condition* of the fruit.

> "muy buena, semilla café negra, casi toda sana. Algunas picadas por pájaros, y
> algunas quemadas con el sol. Casi nada de cenicilla. **MUCHA HOJA! Exagerado**"

Only then the quantity, and it is an approximation. No supplier, no transport, no
scale ticket — because it is his own fruit. **He records the condition of the pick
in far more detail than its quantity**, because the condition is what he has to
act on. "Mucha hoja" is a decision about how to press, not a note.

And the second half of your question is answered outright: **yes, a load ends up
split.** 1,400 kg picked, 35 cajas crushed. Whatever else happened to that fruit
happened outside this wine's page.

Then there is the 25 August pick — 117 kg, pressed, chilled — whose entire purpose
was to feed a wine that already existed. **A reception can exist to serve a lot,
not to start one.**

### 8 · Operations that start in several containers

Covered by the headline above, with one detail worth having in your pocket: on
27 August the operation draws from the 500 L fermenting tank **and the kitchen
fridge**.

A vessel, in this winery, can be a kitchen fridge. Anything that assumes vessels
are tanks somebody registered will meet that on day one — which is also why
inline vessel creation was the right call in Step 3.

### 9 · How you know an earlier measurement was wrong

**Answered, and it is the strongest validation the model has had.** Three places
in this one wine:

> *27/8* — "Se agregaron 30 litros de jugo **para lograr 1.008** · **Resultado:
> 1.006** debido a que mosto bajó mucho después del cálculo"

Target, actual, and the reason for the gap. All three kept.

> *28/8, 19:00* — "Densidad: **1.005** · Ojo! Densímetro calibrado a 15.57 grados
> · **Densidad real: 1.006** más el CO₂ disuelto en mostos"

The instrument reading, the correction, and the reason, side by side.

> "Se usó la bombita diafragma de agua. Saca mucha espuma con mostos fermentando
> y **es probable** que saque CO₂ disuelto del mosto"

The suspected cause, recorded as a hypothesis and hedged.

So the second half of your question already has an answer. **He never replaces.
He appends, and he writes down why.** His notebook is append-only — which is
PROOF's immutability rule, arrived at independently by a winemaker with a pen.

And the first half — 55 L, loss or bad measurement? The notebook shows he does
not reason from the numbers at all. He reasons from **cause**: the calibration
temperature of the hydrometer, a known physical effect, the pump that was used,
or the process itself (*"el trasiego le gustó mucho y se secó"*). The arithmetic
never decides. The explanation does.

That has a direct product consequence. PROOF's correction sheet asks for the
observed quantity and files it as `resolution` or `count_variance` — a category.
Aldo's notebook says the field carrying the meaning is the **reason**, and it is
free text about physics, not a category.

**Still to ask:** when you keep both numbers, which one do you act on afterwards?
Does the corrected density replace the reading in your head, or do you carry both?

### 10 · What should PROOF know

The first half needs him. **The second half is partly answered by the fact that
this document exists.** It *is* the libreta. It is where the density trend lives,
where the temperature log lives, and where the only record of the 25 August
second pick lives.

And the reconciliation above is a list of what it cannot give back:

- how much wine he made — the second bottle format is *"? cajas"*
- where the other ~800 kg of the pick went
- what the 15 g of SO₂ was calculated against
- what is in the fridge

**Suggestion:** after he names his five things, ask the counter-question —
*"¿cuáles de esas cinco podrías contestar ahora mismo con la libreta?"* The gap
between those two lists is the product.

Worth being ready for this too: two or three of the five are probably things the
current build already answers — where the next load can go, what is in a tank,
what happened to a wine. If so, ask him to rank them. Knowing which of the three
he reaches for first is worth more than a longer list.

---

## Eight questions the notebook raises that are not on the list

1. **Do escurrido and prensa suave ever stay apart?** Decides whether one
   pressing has one output or several.
2. **Where did the other ~800 kg of the 10 August pick go?**
3. **The 27 L of juice left in the fridge — is that a wine?** What happens to
   leftovers held back for topping or adjusting?
4. **"Para lograr 1.008 · Resultado: 1.006."** Does he plan an intervention
   against a target and then record what actually happened? PROOF has a protocol
   layer built in Step 2 and unused since.
5. **"Densímetro calibrado a 15.57 grados. Densidad real: 1.006 más el CO₂
   disuelto."** Does he want the raw reading, the corrected one, or both? PROOF
   can say how *well* a number is known but not that it was corrected for a known
   instrument bias.
6. **Does an operation have a duration?** *Desfangado* starts at 8–9 °C and ends
   at 11.5 °C. Every event in PROOF happens at an instant.
7. **Does he want to record which equipment was used?** The pump changed the
   density.
8. **How does he count at bottling?** *"23 cajas menos 4 botellas"* is cases
   adjusted in bottles, and the second format was left as *"? cajas"* — unknown at
   the moment of writing, presumably countable later.

And one that is not a question so much as a warning: on 27 and 28 August the
entries are timestamped **1:00pm, 10:00pm, 7:00am, 4:00pm, 7:00pm**. During active
fermentation — and this is a pét-nat, so the last measurement before bottling is
the whole wine — the unit of time is the hour, not the day.

---

## What this validates in the current build

Not everything is a gap. The notebook confirms several decisions:

- **Units as spoken.** kg, cajas, litros, grams per hectolitre, Brix and density
  all appear in the same wine, and the conversion between them is derived, not
  typed ([ADR 0006](adr/0006-generic-event-kinds.md)).
- **`basis` is not academic.** *"1,400 kg aprox"*, *"16-17 kg caja"*, *"?
  cajas"*. Approximation is the normal case, not the exception
  ([ADR 0004](adr/0004-movement-nets-to-zero.md)).
- **Stage labels stay soft.** *Molienda, Prensa, Desfangado, Trasiego* are his
  words and there is no state machine that would survive meeting them
  ([ADR 0003](adr/0003-no-lot-state-machine-in-cycle-1.md)).
- **Transformation does not invent a loss.** 480 L of must yields 320 L of juice
  and the 160 L difference needs no reason line. That is already how it behaves.
- **Readings are open-ended.** Density is the number he actually uses, and it is
  storable today — it is simply not on the sheet.
- **And F1 was worth doing**, because it is the same shape seen from the other
  side. The fix that let one wine go to two tanks is the fix that has to run
  backwards for two pressings to reach one.

---

## What I would change about the interview

Questions 1, 5 and 9 are the ones where the notebook has already given us half
the answer, so they can go deeper rather than starting from scratch:

- **On question 1**, ask about the *press fractions* specifically. That is the
  case the notebook exposes and the one the abstract question would miss.
- **On question 5**, lead with the SO₂ arithmetic. Show him *"2 gr/hL, total
  15 gr"* and ask what the 15 g was calculated against. His answer defines how
  every dose in the system is stored.

- **On question 9**, skip the hypothetical. He has already done it twice in this
  wine. Read him his own line — *"densímetro calibrado a 15.57 grados, densidad
  real 1.006"* — and ask what he does with the two numbers afterwards.

Question 2 can be sharpened too. He does not lack a volume for a few days — he
goes two weeks without one and does not miss it. Worth asking whether a running
volume is something he wants at all, or only at racking and bottling.

And question 10 is the one to leave time for. It is the only one that is about
the product rather than the winemaking, and the counter-question — what of that
can you answer today — is where the answer actually is.
