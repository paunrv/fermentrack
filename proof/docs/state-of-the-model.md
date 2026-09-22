# State of the model — and what to build next

Everything learned from the Step 7 dry run, Aldo's Colombard Pet Nat 2026 notebook
and the four interview recordings, reconciled into one read, with a recommended
Step 9.

Sources: [dry run 01](dry-run-01.md) · [the notebook](aldo-notebook-01.md) ·
[the interview](aldo-interview-01.md) · [F1](f1-multi-destination.md)

---

## Where the build actually is

| | |
|---|---|
| Steps 1–8 complete | tenancy · ledger · capture · lot timeline · capture sheets · tank board · dry run · F1 |
| SQL | 224 assertions in six suites, built from migrations on every run |
| Browser | three harnesses — pace (32/36), the dry run, the F1 fidelity check |
| Last commit | `d843001` |

Six capture operations exist: `capture_reception`, `capture_processing`,
`capture_transfer`, `capture_stage`, `capture_observation`, `capture_correction`,
plus `set_vessel_size`. Between them they write eight of the ledger's eleven
`event_kind` values. **`blend`, `consume` and `loss` are reachable in the ledger
and unreachable from the product.**

---

## The four things we did not know a week ago

### 1 · Many-into-one is the spine, not an edge case

Step 8 made one wine go to several tanks. Almost nothing in the real data does
that. What the real data does constantly is the reverse.

From the notebook: two pressings of one crush into one tank; two juice fractions
per pressing; a second pick fed into a fermenting wine in two instalments.

From the interview, why:

> "Si tienes dinero para un chingo de tanques, puedes tener todos por separado
> desde el inicio. […] A veces **por espacio** mezclas, vas mezclando desde el
> inicio, **porque no tengo más tanques**."

**Separating wines is a budget question.** A small winery co-ferments by default.
The dry run treated the co-ferment as an awkward case; Aldo treats it as Tuesday.

And blends are the same shape at scale — *"un chingo de barricas"* for a red —
which means dozens of sources, not two.

### 2 · A racking is a separation, not a movement

The operation he performs most often — *"lo puedes hacer un chingo de veces"* —
is the one PROOF records with the wrong shape.

> "Es una decantación. Sacas el vino limpio desde arriba, **poco a poquito**,
> hasta que ya dejas solamente lo de hasta abajo."

PROOF models it as a movement with a gap that must be given a reason. He describes
two outputs: clean wine, and sediment left behind. And the sediment is not waste:

> "Yo todo eso, **o lo destilo** — casi siempre también lo destilo. Lías, todos los
> sedimentos, todo eso, **nada se tira**. […] Se lo puedes **vender** a alguien."

The losses are a known, diminishing cascade — 1,000 L off the press, then 50, then
20, then 15, *"cada vez le quitas menos"* — and **he sums them**: *"yo junto
todo."* The lees have their own running total.

### 3 · There is a layer above the ledger where his mental model lives

Asked whether a harvest arrives as a complete lot, he rejected the premise:

> "El **lote** ya te refieres como a **una etiqueta**. Ya es un vino que ya trae su
> receta." … "Ya cuando **compras uva** ya estás pensando en **cuántas botellas**
> quieres producir."

| | |
|---|---|
| PROOF's `lot` | a quantity of material, which exists because something arrived |
| his *lote* | a **label** — an intended wine with a recipe and a bottle target, decided before the fruit exists |

The same layer shows up twice more: a blend is planned (*"tienes que tener un
tanque donde le quepa todo"*), and the bottle order is a forward projection
(*"ahorita ya sé cuántos litros va a salir, entonces ya tendría que tener mi
conteo aproximado del pedido de botella"*).

That is the protocol layer — built in Step 2, unused since. It is not an advanced
feature. It is where he actually thinks.

### 4 · What he asked for first is nearly free

> "Estaría bueno saber, así como **en la tablita**: este vino lleva **7 días de
> fermentación**, tiene tal **temperatura** y tiene tanto **azúcar**."

One row per fermenting wine. `lot_card.stage_since` already exists, so *"lleva 7
días"* is `now() − stage_since`. `reading_temp_c` and `reading_brix` are already
captured. **It is a view and a screen over data we already store.**

And it is the head of a chain, not a status line:

```
days fermenting → expected bottling month → supplier lead time
                                          → order bottles, corks,
                                            labels and marbete now
```

---

## Where I was wrong

Recorded because both corrections came from Aldo and not from the code.

| I concluded | he said | what it changes |
|---|---|---|
| For most of the wine's life nobody measured the volume and nobody needed to | *"Siempre sabes el volumen, por lo menos aproximado, **siempre**"* — computed from tank capacity and fill height | **F4 is downgraded.** The gap is not an absent number, it is that nothing accepts his method |
| He never replaces a number; he appends and says why | *"Si ya ves que hay una inconsistencia… **lo reemplazas y lo utilizas**"* — he keeps both only for a reading with a known instrument bias | PROOF's correction model still fits, but he asked for **the right number in front of him**, not for immutability |

The pattern behind both: **a notebook tells you what somebody wrote down, not what
they know.** The dry run had the mirror blind spot — it measured what the product
does, not what the operator knows. Neither substitutes for asking.

---

## The register, re-ranked

Severity is *what PROOF ends up believing that is not true*, which is the ranking
Step 8 established.

### Wrong balance — PROOF believes quantities that do not exist

| | | source |
|---|---|---|
| **F2** | A co-ferment keeps only one parent's lineage **and leaves the other's fruit on the books.** 1,500 kg in a bin that is empty, and a bin the board says is full. **Upgraded: the default case for a small winery, not an exotic one.** | dry run + interview |
| **F13** | A transfer takes wine out of **one** vessel, so a lot spread across two tanks can be racked out of one that does not hold that much. | F1 step |

### Wrong characterisation — the balance is right, the meaning is not

| | | source |
|---|---|---|
| **A1** | **A trasiego is a separation.** Lees are an output he collects, sums, distils or sells; PROOF can only call them `expected_loss` or `waste`. Highest-frequency operation in the winery. | interview |
| **F3** | Throwing fruit away files as a measurement correction. | dry run |
| **F9** | Work performed becomes a stage — a pump-over reads as a state the wine is in. | dry run |

### Missing capability

| | | source |
|---|---|---|
| **F5** | No additions at all. **Sharpened: a dose is a rate × a volume, and he always has the volume.** Open-ended list — acid, sugar, enzymes, clarifiers, yeast, nutrients, lactic bacteria, metabisulfite, gums, tannins, copper, colorants, oak extract. "Nothing added" is itself a claim worth proving. | dry run + interview |
| **A2** | Byproducts are **inventory with destinations**: *vinícola → destilería → composta → viña*, or sold. And lees are sometimes deliberately kept in the wine and stirred, then removed — so they are not only an output. | interview |
| **A3** | **Barrel evaporation: a loss with no event.** Up to 5–6% a year, continuous, driven by cellar temperature and humidity, performed by nobody. Every quantity change in PROOF is attached to an event somebody did. | interview |
| **F8** | A wrong date cannot be corrected, and the fact that it is wrong cannot be recorded. | dry run |
| **F7** | Nothing can be said that is not attached to wine. **Now three separate needs:** the cellar's temperature (belongs to the building), whether the chiller is running (belongs to a machine), and "Tank 4 has the cooling jacket" (belongs to a vessel). | dry run + interview |

### Missing surface over data we already have

| | | source |
|---|---|---|
| **A4** | **The morning table** — days fermenting, temperature, sugar, per active ferment. Nearly free. The first thing he asked for. | interview |
| **F6** | The board's headline nets an over-full tank against the rest, so total free space reads smaller than the biggest single space. | dry run |
| **F12** | Spent lots stay in the cellar list at 0. | dry run |

### Model-level decisions, not fixes

| | | source |
|---|---|---|
| **N1** | ***Lote* means label.** A vocabulary collision, and behind it a whole planned-wine layer that exists before any fruit does. | interview |
| **A5** | **The consumables forecast** — expected litres per label converted into bottles, corks, labels and **marbete**, months ahead against slow suppliers. The first business-facing thing in the project. | interview |
| **F4** | A quantity not yet knowable. **Downgraded** — he always knows approximately, by tank geometry. The gap is the method, not the absence. | dry run, corrected |
| **F10** | Arrival as one act — one truck, one pass, several receptions. | dry run |

---

## Recommended Step 9 — F2: several lots into one

### Why this one

- It is the only remaining finding where **PROOF believes a quantity that does not
  exist**. Fruit sitting in a bin it left hours ago, and a bin the board reports
  as occupied. Step 8's principle was falsehoods first.
- The interview **upgraded it from edge case to default**. A small winery
  co-ferments because it has run out of tanks.
- It is the exact mirror of F1, so the shape is known and the pattern is already
  built: repeatable rows with progressive disclosure, and a server that refuses
  rather than guesses.
- It is the mechanism `blend` needs. Doing F2 properly builds many-into-one once.

### What exists already

- `lot_lineage` takes **many parents per child**. No schema change needed.
- `capture_processing` takes exactly one `p_input_lot_code` and consumes the whole
  lot. That is the thing to widen.
- `assert_event_valid` requires lineage for a transform that produces a new lot
  from an existing one — but only that **some** lineage exists for the output.
  A two-input co-ferment recording one parent would pass today. **That check has
  to become per consumed input.**

### Scope

1. **`capture_processing` takes several inputs.** `p_inputs jsonb` — an array of
   `{lot_code, quantity?, unit?}`, each defaulting to "all of it", which is
   exactly today's behaviour for one. One output lot, as now.
2. **Lineage per input**, and `assert_event_valid` tightened to require it for
   every lot consumed — not merely one.
3. **Every input lot actually empties**, so no fruit is left on the books and the
   bin reads free.
4. **The sheet mirrors F1's destinations**: one input row by default, `+ another
   lot` to add more, blank rows ignored, half-filled rows refused.
5. **The reads keep up**, the way they had to in F1 — *"came from"* must name
   every parent, not the biggest.

### Explicitly not in Step 9

Loss and separation (A1) · additions (F5) · byproduct inventory (A2) ·
evaporation (A3) · the morning table (A4) · the label layer (N1) · the
consumables forecast (A5) · blend as a distinct operation · anything about
barrels, the building or machines.

### Proof it has to pass

- The dry run's third utterance — *"We crushed both loads together into Tank 4,
  they co-ferment"* — flips to **CLEAN**, in the dry run itself.
- Its two checks invert: the co-ferment traces back to **both** loads, and
  CS-26-D1 holds **zero**, not 1,500 kg.
- SQL: two inputs; three inputs; partial quantities from one input; refusal when
  lineage would be incomplete; occupancy agrees with lots across the winery.
- Fidelity, in the browser: said → sheet → ledger → lot story → tank board, all
  agreeing.
- Pace: a **single-input pressing must stay at 6 taps.**

### The one thing that would change my recommendation

If the winery visit is close, build **A4, the morning table, first.** It is nearly
free, it is the first thing PROOF would ever *give* him rather than ask of him,
and it is what he named when asked what he wants. Arriving with his own table is a
different conversation from arriving with more forms.

That is a scheduling judgement, not a technical one, and it is yours.

---

## Questions still open for Aldo

Carried forward, plus what the recordings raised:

1. Are **escurrido and prensa suave** ever kept as separate wines?
2. Where did the other **~800 kg** of the 10 August pick go?
3. The **27 L of juice** left in the fridge — is that a wine?
4. *"Para lograr 1.008 · Resultado: 1.006"* — do you plan against a target and then
   record what happened?
5. Raw reading, corrected reading, or both — and **which one do you act on**?
6. Does an operation have a **duration**? (*Desfangado*, 8–9 °C → 11.5 °C.)
7. Do you want to record **which equipment** was used? The pump changed the
   density.
8. How do you count at bottling? *"23 cajas menos 4 botellas"*, and *"? cajas"*.
9. What was the **15 g of SO₂** calculated against?
10. *"Siempre tienes que pesar la uva, esa es la principal"* — against *"1,400 kg
    aprox"*. Which is it, and when?
11. **Marbete** — procurement, timing, and what paperwork it drags with it.
12. Does **"lote"** or **"etiqueta"** belong on the screen?
