# Aldo, in his own words — the interview

Transcribed answers to the ten questions, and what each one does to the model.
Fragments arrive out of order and some are cut off mid-sentence; nothing is
filled in for him. Where an answer stops, it stops.

Companion to [the notebook reading](aldo-notebook-01.md).

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

*(The recording cuts off at "Esas…".)*
