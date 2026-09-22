# The field experiment

Eight sessions, two wineries, the same question every time:

> **“Cuéntame qué ha pasado con tu vendimia.”**

| | Viñas del Tigre · Aldo | Viñas Pijoan · Silvana |
|---|---|---|
| baseline | D1 | D3 |
| next day | D2 | D4 |
| after several days | D5 | D6 |
| around a real operation | D7 | D8 |

Dates are deliberately not fixed. The spacing is the experiment: we are testing
whether PROOF remembers what happened **between** visits, not whether somebody
can type during one.

## Running a session

```sh
./scripts/field.sh tigre        # or: pijoan
# …the session…
./scripts/backup.sh
```

One winery per session by construction — each site has its own sign-in and the
script refuses to start if it can see more than one. The two producers' data,
vocabulary and histories never meet.

Then copy `TEMPLATE.md` to `sessions/D1-tigre.md` and fill it in **the same day**.

## What is being tested

| | |
|---|---|
| **1 · Capture** | can we record what they actually say — their words, their units, their approximations — without inventing precision or forcing fields? |
| **2 · Continuity** | coming back the next day, does the story continue, and do they recognise the current state? |
| **3 · Reconstruction** | coming back after several days, does the history of a lot still read as one continuous operational story? |
| **4 · Variability** | does it work for a second producer who may organise work, speak and think about lots completely differently? |

## The rules in the room

- Do not turn it into an interview. Start with the sentence and follow.
- Do not teach them how PROOF wants a winery to work.
- Do not steer them toward our terminology. **Their language is evidence.**
- Do not defend the model when their vocabulary differs.
- **If something does not fit: do not stop, and do not invent a meaning.**
  Capture the event, the quantity, the unit and the note, and log the gap.
  Losing the information is the only unrecoverable mistake.

## After the session

Fill the log. Do not build anything yet.

A gap becomes a candidate change only after it has been put to **both** wineries
and classified:

| | |
|---|---|
| **universal** | appears at both sites |
| **producer-specific** | belongs to one person's way of working |
| **UX problem** | the model is sufficient; the interface made it hard |
| **model gap** | the operational reality cannot be represented correctly |
| **not important** | happened once, does not justify complexity |

Then: *"During D5, Aldo did X and PROOF could not represent it. Does Silvana have
the same problem?"* Only then does it become a change.

## Already known, and deliberately not built

From Aldo's Colombard notebook and the rehearsal. Expect these to reappear —
log them when they do, because a second sighting is what turns an observation
into evidence:

- an SO₂ dose (a rate, applied to a volume that may not exist yet)
- several press runs, and fractions kept separate
- lees leaving the wine as something he keeps — **not waste**, and not
  necessarily kept either; Silvana may discard hers
- juice added to wine to reach a target density
- taking cooling equipment off
- bottling

## The gate

Not that the UI works, the tests are green or the board looks good. Those are
prerequisites.

**The experiment succeeds only if a real producer recognises their own operation
in PROOF, across time.**
