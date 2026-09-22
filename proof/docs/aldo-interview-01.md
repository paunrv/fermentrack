# Aldo, in his own words — the interview

Transcribed answers to the ten questions, and what each one does to the model.
Fragments arrive out of order and some are cut off mid-sentence; nothing is
filled in for him. Where an answer stops, it stops.

Companion to [the notebook reading](aldo-notebook-01.md).

> **On the transcription.** These are machine transcripts of spoken Mexican
> Spanish full of winery vocabulary, and some words come through mangled. Where I
> have reconstructed a word it is marked *[?]* so Aldo can correct it: *mazotitos*
> → metabisulfito, *bread* → brett, *dupo* → orujo, *guías/líos* → lías, *trazo de
> fermentación* → trasiego. Nothing else is filled in for him.

---

## Q1 · Joining wine from several vessels

### Trasiego

> "El trasiego, pues es una decantación de, en un tanque o en una barrica. […] Y
> es quitarle el vino limpio a ese recipiente, y quitarle la parte de… sucia, no
> sucia, pero el sedimento, que está en el fondo. Entonces es una decantación.
> **Sacas el vino desde arriba, poco a poquito, hasta que ya dejas solamente lo de
> hasta abajo.**"
>
> "Lo puedes hacer durante la, antes de la fermentación, durante la fermentación,
> después de la fermentación, en las barricas, dependiendo de… qué tal que quieras
> el vino. O sea, hay un chingo de — **lo puedes hacer un chingo de veces.**"

**This is the most model-relevant thing said so far, and it contradicts how PROOF
records it.**

PROOF treats a racking as a *movement*, and anything that fails to arrive as a
gap that must be given a reason. Aldo does not describe a movement with a gap. He
describes a **separation with two outputs**: the clean wine, and the sediment left
behind. The sediment is not what went missing — it is the other half of the point.

Four consequences, all supported by what he actually said:

1. **The lees are an output, not a loss.** The notebook's *"se quitaron 20 litros
   de lías"* is the second product of the operation, and PROOF has no way to say
   so. Today it would have to be filed as `expected_loss` or `waste`.
2. **It is uncomfortable for Step 8.** The shortfall block I just built offers
   *"lees, normal / spilled / thrown away"* — three kinds of loss. If lees are a
   byproduct rather than a loss, the first option is in the wrong list. F1's rule
   holds (don't invent a loss); the vocabulary under it may be wrong.
3. **"Poco a poquito" means the quantity is discovered, not planned.** You stop
   when you judge you are about to pull sediment. That is why the notebook so
   often has a trasiego with no volume against it — the volume is not the point,
   and sometimes nobody measures.
4. **It has no fixed position in the process** — before, during, after
   fermentation, in barrel. So it can never be a stage transition, and nothing
   may infer a lifecycle from it. That is [ADR 0003](adr/0003-no-lot-state-machine-in-cycle-1.md),
   confirmed by the person it was written about.

And *"un chingo de veces"* — many times per wine — makes this the operation whose
capture cost matters most. It is the one he will record most often.

### Blend

> "El blend pues ya es la **mezcla de varios vinos con algún propósito en
> especial**. En caso de los tintos es mucho más común, pues porque hay como un
> chingo de barricas, varias variedades. Entonces quieres hacer un blend de
> Merlot, Cabernet Sauvignon, Tempranillo. Entonces **tienes que tener un tanque
> donde le quepa todo.**"

So the two are cleanly separable, and not by shape:

| | what defines it |
|---|---|
| **trasiego** | one wine, separated from its own sediment |
| **blend** | several *different* wines, joined **on purpose** |

The distinguishing feature is **intent**, not arithmetic. Both can be
many-into-one; only one of them is a decision about the finished wine.

Three further things fall out of the blend answer:

- **A blend is planned before it happens.** *"Tienes que tener un tanque donde le
  quepa todo"* — the capacity has to exist first. That is the tank board's
  question asked in anger, and it is the first real use for the protocol layer
  built in Step 2 and unused since.
- **Reds mean barrels, and barrels mean many sources.** *"Un chingo de barricas"*
  — a red blend is F13 at a scale the dry run never suggested. Not two sources:
  potentially dozens.
- **Nothing in PROOF is barrel-aware** beyond a `vessel_type` string.

**Still open from the notebook, and not answered here:** the two pressings of one
crush, and the 30 L of Colombard juice added to fermenting Colombard. Neither is a
blend by his definition — same wine, no purpose beyond finishing the job. They may
simply be *the same wine arriving in instalments*, which is a third shape again.

### Blend, continued — two reasons, and two moments

> "Haces tu blend con las proporciones que tú quieres, **ya sea por necesidad**,
> porque esa es la cantidad que tienes y la vas a mezclar, no importa. […] O tienes
> un chingo de vinos y vas a hacer un súper blend **solamente con lo que más te
> gusta**."

Two different operations wearing one word:

| | why | when |
|---|---|---|
| **by necessity** | that is how much you have, and how many tanks | often at the very start |
| **by selection** | you picked the best of what you had | after fermentation |

> "A veces **por espacio** mezclas… vas mezclando desde el inicio, ya sabes que lo
> vas a mezclar de una vez, **porque no tengo más tanques**."
>
> "¿En qué proceso los mezclas? — **Después de la fermentación.** […] Siempre los
> blends casi siempre son ya terminando la fermentación. **A menos que tengas poco
> espacio.**"

So the default is a blend after fermentation, and the exception — co-fermenting
from day one — happens **because the cellar ran out of tanks.** Which means the
co-ferment in the Step 7 dry run was not an exotic case at all. It is what a small
winery does by default.

And separation is a budget question, not a winemaking one:

> "Si tienes dinero para un chingo de tanques, puedes tener todos por separado
> desde el inicio."

One more thing, easy to miss and worth keeping:

> "Puedes tener **dos tanques con las mismas mezclas de uvas** y que lleven **un
> diferente proceso**."

Two lots, identical in composition, different in treatment, and they must stay
apart. Identity is not content. PROOF already gets this right — a lot is
identified by the code a person gave it, never by what is in it.

---

## "Lote" does not mean what PROOF means by lot

This was not one of the ten questions and it may be the most important thing in
the recording. Asked whether a harvest arrives as a complete lot, Aldo corrected
the premise:

> "No, como que **el lote ya te refieres como a una etiqueta**. Ya es la etiqueta,
> ya es un vino que ya trae su receta."

And:

> "Ya cuando compras uva **ya estás pensando en cuántas botellas quieres
> producir**. […] Casi todos ya tienen **etiquetas definidas desde el inicio**."

| | |
|---|---|
| **PROOF's `lot`** | a quantity of material with an identity, which exists because something physically arrived |
| **Aldo's *lote*** | a **label** — an intended wine, with a recipe and a target bottle count, decided **before the grapes are bought** |

These are two different things and PROOF has only one of them. His *lote* is much
closer to the protocol layer — something planned — than to anything in the ledger.

Two immediate consequences:

1. **A vocabulary collision.** If a screen says "lot" and he reads "etiqueta", every
   conversation about the product will quietly mean two things. Worth settling
   before the visit.
2. **The intended wine exists before any fruit does.** Harvest is measured against
   a plan that already has a name and a bottle count. Nothing in Cycle 1 can hold
   that.

---

## Q2 · Wine in a tank without knowing how much — **I had this wrong**

The notebook reading concluded that for most of this wine's life nobody measured
the volume and nobody needed to. Aldo says the opposite, twice and emphatically:

> "**Siempre sabes el volumen, por lo menos aproximado, siempre.** Bueno, y si no,
> pues estás cabrón."
>
> "**De entrada, siempre sabes el volumen, porque todo lo tienes que calcular con
> el volumen.**"

So the notebook's silence is not ignorance. It is that **he can recompute the
volume whenever he wants**, from the tank:

> "Casi siempre con estos tanques. Sabes que tanques de 5 mil litros. Si está
> lleno, pues tiene 5 mil. Y si no está lleno, puedes medir más o menos y sacar el
> volumen. Por lo menos yo lo saco así **con la fórmula de volumen**."

That changes F4 substantially, and in PROOF's favour:

- **The problem is not that volume is unknowable.** It is that PROOF has no way to
  accept the method he actually uses — capacity and fill height, run through a
  formula. The tank board already knows vessel capacity; it has never been asked
  to work backwards from it.
- It also explains why the pressing sheet demanding a volume was less brutal than
  the dry run made it look. He would have had a number. It would have been
  approximate, and PROOF's `basis` already exists to say so.
- **Still open:** whether a volume calculated from a tank should read as
  *estimated*, or as its own kind of knowing.

Worth recording that this correction came from him and not from the code. The dry
run measured what the product does; it could not tell us what the operator knows.

---

## Q3 · What a loss really means — the cascade

He answered by walking a white wine from the press to the bottle, and the shape is
a **predictable, decreasing series**:

| step | volume | removed |
|---|---|---|
| out of the press | 1,000 L | |
| first trasiego / desfangado | 950 L | **50 L** — *"sabes que ahí lo vas a quitar a huevo"* |
| trasiego during fermentation | 930 L | **20 L** |
| trasiego after fermentation | 915 L | **15 L** |

> "**Cada vez le quitas menos.** Y vas sumando eso que vas quitando para tenerlo.
> **Yo junto todo.**"

Two things there. The losses are *expected* and diminishing — he knows the 50 L is
coming before it happens. And he **accumulates them**: the lees are collected, not
discarded, which makes them a running total in their own right.

### And then the thing this whole product is for

> "Tengo como una bitácora de cada vino. Desde el día de cosecha, todo: pesa, todo,
> todo. […] Se sacaron tantos litros de lías. Se anotaron. […] Entonces, **cuando
> voy a embotellar, leo mis notas y digo: ah, pues más o menos son como 900 litros.
> Ya con todos los trasiegos, necesito tantas botellas.**"

He reads his notebook back, subtracts every racking by hand, and arrives at a
bottle count. That is a running balance computed with a pen, at the one moment it
has to be right.

**PROOF already computes exactly this, continuously, for free.** It is the lot
timeline's balance line. He arrived at the requirement himself, unprompted, while
answering a question about losses — which is a better validation than anything the
dry run produced.

---

## Q4 · Lees, pomace and solids — they are inventory

> "Yo todo eso, o **lo destilo** — casi siempre también lo destilo. Entonces yo,
> lías, todos los sedimentos, todo eso, **nada se tira**."
>
> "Se lo puedes **vender** a alguien, o destilar, o lo que sea."

And his winery's loop, named as a sequence of places:

> "La composta, en caso del orujo *[?]* — **vinícola, destilería, composta,
> viña**. Así es nuestro proceso. Pero la mayoría de la gente prensa y va tirando
> el orujo al camino."

So byproducts have **value, a destination, and a next facility**. They are not a
disposal problem; they are stock that moves. That is a materials-and-movement
question, which the ledger can already express and the product cannot reach.

One nuance that complicates the model more than the value does:

> "Hay estilos de vinos como vino blanco **con lías** — estás revolviendo con las
> lías, y te funcionan para darle cierta característica al vino. Y ya después de
> ahí se tiene que quitar."

Sometimes the lees are deliberately kept in contact with the wine and stirred.
So lees are not always something removed — sometimes they are **part of the wine
for a while, on purpose**, and removed later. Any model that treats them purely as
an output of racking will get that wrong.

---

## Q5 · What you add to the wine

First, the answer to the SO₂ puzzle in the notebook:

> "**De entrada, siempre sabes el volumen, porque todo lo tienes que calcular con
> el volumen.** Y más para los convencionales, que agregan muchas cosas: siempre
> tienen que saber el volumen."

**A dose requires a volume.** The rate is the input; the volume is the
denominator; the quantity is derived. Which means the 15 g of SO₂ at harvest was
calculated against a volume he had in mind and did not write down.

The list, as he gave it, roughly in process order:

| when | what |
|---|---|
| at the start | **ácido tartárico** for acidity; **azúcar** if it is short (*"no es muy normal acá"*); **agua + ácido tartárico** if it is too sweet |
| before fermentation, whites | **enzimas** — proteolytic, for cleaning — and **clarificantes**, *"hay un chingo"* |
| fermentation | **levaduras**, if you work the traditional way, and often **nutrientes de levadura** |
| fermentation, natural | nothing. *"Fermentas con lo que ya viene. Solamente haces un fermento antes para inocular, pero no compras nada."* |
| malolactic | **bacteria láctica** / enzymes to start the second fermentation |
| anywhere | **metabisulfito** *[?]* |
| structure | **gomas** for body; **taninos**, liquid and powder |
| corrections | products for **brett** *[?]* and for reduction — *"para cargar cobre"* |
| finishing | **colorantes**; **extractos de barrica** |

Two things to take from the shape of that list rather than its contents:

- **It is open-ended and he knows it** — *"muchas más cosas que se le puede
  poner"*. Any fixed enumeration of additives will be wrong within a vintage.
- **The natural-wine row is the interesting one.** *Nothing added* is itself a
  claim worth being able to make and prove, and it is the claim Viñas del Tigre
  would actually want to defend.

---

## Not on the list: a loss with no event

> "Cuando metes a barrica el vino, **hay merma**, porque se va evaporando. Mientras
> más tiempo de barrica pase, **puedes perder hasta un 5 o 6% al año**, dependiendo
> de la temperatura y la humedad que tengas en tu bodega. **La madera transpira.**"
>
> "Fuera de eso, no pierdes, a menos de que hagas trasiego."

Every quantity change in PROOF is attached to an event — something that happened,
at a time, that somebody did. **Barrel evaporation is none of those.** It accrues
continuously, it depends on the cellar's temperature and humidity rather than on
any action, and nobody performs it.

That is a new class, and the ledger as built has no shape for it. It is also
bounded and known — five or six percent a year — so it is forecastable rather than
mysterious.

His second sentence is the useful one for the model: **apart from evaporation, wine
is only lost when somebody does something to it.** Clarification, filtration and
racking each take their cut, and each is an act.

## Not on the list: weighing the fruit

> "Siempre tienes que **pesar la uva**. Esa es la principal."

Said flatly, as the foundational measurement of the whole operation — which sits
oddly beside the notebook's *"1,400 kg aprox"* and is worth asking about directly.


---

## Q9 · How you know an earlier measurement was wrong — **and a second correction to me**

> "Si ya ves que hay una inconsistencia, pues te aseguras ahora sí de que sí sea
> la cantidad, y si es algo, pues **lo reemplazas y lo utilizas**."

The notebook reading concluded that he never replaces a number — that he appends
and writes down why. That was too broad, and it came from reading a notebook
rather than asking him.

The distinction he actually draws is between two different things:

| | what he does |
|---|---|
| **a reading** with a known instrument bias | keeps both, side by side — *"Densidad: 1.005 … Densidad real: 1.006"* |
| **a quantity** that turns out inconsistent | goes and verifies properly, then **replaces it and uses the new one** |

The correction he makes to a density is an *interpretation* of a reading that was
taken correctly, so both numbers stay. A volume that does not add up is simply
wrong, so he re-measures and moves on.

**PROOF's design still fits, but not for the reason I claimed.** Recording a
correction rather than editing in place gives him exactly what he asked for — the
new number is the one everything uses — and keeps the old one visible as a
by-product of how it works. He did not ask for immutability. He asked for the
right number to be in front of him. Those happen to be compatible, and the write-up
should not pretend he argued for the former.

Twice now the recordings have corrected an inference drawn from the notebook.
Worth stating plainly: **a notebook tells you what somebody wrote down, not what
they know or what they believe.** The dry run had the same blind spot from the
other side — it measured what the product does, not what the operator knows.

---

## Q10 · What should PROOF know — answered concretely

### The morning

Asked what he wants in front of him when he walks in during vendimia, he did not
hesitate or generalise:

> "**Temperatura de la bodega, temperatura de los tanques, de todos los tanques.**
> Y pues la medición de azúcar — **cómo va la fermentación**."

And then, unprompted, he described the screen:

> "Estaría bueno saber así como **si en la tablita**, si yo llego y sabes que: ah,
> pues es que este vino **lleva 7 días de fermentación** y tiene tal temperatura y
> tiene tanto azúcar. Como saber **cuántos días lleva desde que entró al tanque
> para fermentar**. Saber cuántos días van."

So the answer to the golden question is a table, one row per fermenting wine:

| | |
|---|---|
| **days** | since it went into the tank to ferment |
| **temperature** | latest, per tank |
| **sugar** | latest, and therefore how the fermentation is going |

Plus one figure for the cellar as a whole: its temperature.

**Almost all of it already exists in the database and is displayed nowhere.**
`lot_card` carries `stage` and `stage_since`, so *"lleva 7 días de fermentación"*
is `now() − stage_since` and nothing more. The observation sheet already takes
`reading_temp_c` and `reading_brix`, so the latest temperature and sugar per lot
are a projection away. Density is storable today and simply absent from the sheet.

The cellar's own temperature is the one thing with no home at all — it belongs to
the building, not to a wine or a vessel, and there is nothing in the model that
belongs to the building.

This is the highest value-to-effort item anyone has named in eight steps. It is a
view and a screen over data already being captured.

### And the thing he has to work out by hand

The second half of the question — what he has to dig for today — produced an
answer nobody on the list anticipated. It is not about winemaking at all.

> "Tienes que **pedir la botella**… y tienes que ir viendo las etiquetas con un
> chingo de tiempo. […] Básicamente tienes que **hacer los pedidos antes de
> terminar el año**."
>
> "**Ahorita ya sé cuántos litros** de blanco va a salir, ya sé cuántos litros de
> este va a salir. Entonces **ya ahorita ya tendría que tener mi conteo aproximado
> del pedido de botella**."
>
> "Porque se tarda… son los proveedores *[garbled]* … y tienes que estar
> chingando."

So the running volume is not only for bottling day. It is the input to
**purchasing**, months ahead, against suppliers with long and unreliable lead
times. He converts expected litres into a bottle order by hand, from his notes.

He then said what he would want from PROOF, in the plainest terms it has been put
all interview:

> "Si quieres que te mande **un estimado de pedido de botellas** para embotellar."

Bottles, corks and labels all have to be ready on the day. And the interviewer
raised one more item before the recording cut:

> "¿Y el **marbete**?"

**Unanswered.** The marbete is the fiscal strip required on alcoholic beverages in
Mexico, so it is a compliance artifact with its own procurement and its own
paperwork. It needs its own question.

### What this does to the roadmap

Two things Cycle 1 never contemplated, both arriving from the same answer:

1. **A fermentation board** — days, temperature, sugar, per active ferment. Nearly
   free, and it is what he asked for first.
2. **A forward projection** — expected litres per label, converted into a
   consumables order. That is derived state pointed at the future rather than the
   present, and it is the first thing in this project that is about the business
   rather than the cellar.
