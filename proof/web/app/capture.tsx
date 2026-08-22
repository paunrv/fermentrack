'use client'

import { useActionState, useState, type ReactNode } from 'react'
import {
  recordCorrection,
  recordObservation,
  recordProcessing,
  recordReception,
  recordStage,
  recordTransfer,
  type CaptureResult,
} from './actions'

/**
 * The capture sheets.
 *
 * The design rule everywhere below: anything PROOF can already work out, PROOF
 * works out. The lot, its unit, the vessel it is sitting in and today's date
 * are all context, not questions. What is left is the handful of things only
 * the person standing in the cellar knows.
 */

type Lot = {
  code: string
  unit: string | null
  quantity: string | null
  vessel_code: string | null
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 16)
}

/**
 * People say "Tuesday", not "2026-08-18T08:30". A date picker is where capture
 * loses its race with speech, so the common answers are one tap and the picker
 * is there for everything else.
 */
function When() {
  const [value, setValue] = useState(() => isoDaysAgo(0))

  const chips: [string, number][] = [
    ['today', 0],
    ['yesterday', 1],
    ['2 days ago', 2],
    ['3 days ago', 3],
  ]

  return (
    <div className="field">
      <label>when</label>
      <div className="chips">
        {chips.map(([label, days]) => {
          const iso = isoDaysAgo(days)
          const active = value.slice(0, 10) === iso.slice(0, 10)
          return (
            <button
              type="button"
              key={label}
              className={`chip-btn${active ? ' on' : ''}`}
              data-when={label}
              onClick={() => setValue(iso)}
            >
              {label}
            </button>
          )
        })}
        <input
          type="datetime-local"
          name="occurred_at"
          aria-label="when"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label>
        {label}
        {hint && <span className="hint"> {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function VesselInput({
  name,
  vessels,
  defaultValue,
  label,
}: {
  name: string
  vessels: string[]
  defaultValue?: string
  label: string
}) {
  return (
    <Field label={label} hint="type a new one to create it">
      <input name={name} list="vessel-list" defaultValue={defaultValue} autoComplete="off" />
      <datalist id="vessel-list">
        {vessels.map((v) => (
          <option value={v} key={v} />
        ))}
      </datalist>
    </Field>
  )
}

function Submit({ label, state }: { label: string; state: CaptureResult | null }) {
  return (
    <div className="sheet-foot">
      <button type="submit" className="primary">
        {label}
      </button>
      {state && !state.ok && <span className="err">{state.message}</span>}
    </div>
  )
}

/* ---------------------------------------------------------------- sheets */

function ReceptionSheet({ vessels }: { vessels: string[] }) {
  const [state, action] = useActionState(recordReception, null)
  return (
    <form action={action} className="sheet">
      <div className="sheet-grid">
        <When />
        <Field label="how much">
          <div className="pair">
            <input name="quantity" inputMode="decimal" required autoFocus data-f="quantity" />
            <select name="unit" defaultValue="kg" data-f="unit">
              <option value="kg">kg</option>
              <option value="t">tonnes</option>
              <option value="box">boxes</option>
              <option value="L">litres</option>
            </select>
          </div>
        </Field>
        <Field label="how well do you know that">
          <div className="chips">
            <label className="radio">
              <input type="radio" name="basis" value="estimated" defaultChecked />
              roughly
            </label>
            <label className="radio">
              <input type="radio" name="basis" value="measured" />
              weighed
            </label>
          </div>
        </Field>
        <Field label="what is it" hint="optional">
          <input name="variety" placeholder="Cabernet Sauvignon" data-f="variety" />
        </Field>
        <Field label="where from" hint="optional">
          <input name="source" placeholder="La Cañada" data-f="source" />
        </Field>
        <VesselInput name="vessel_code" vessels={vessels} label="into" />
        <Field label="call it" hint="a code you will recognise">
          <input name="lot_code" required data-f="lot_code" placeholder="CS-26-02" />
        </Field>
        <Field label="anything else" hint="optional">
          <input name="note" data-f="note" />
        </Field>
      </div>
      <Submit label="Record it" state={state} />
    </form>
  )
}

function ProcessingSheet({ lot, vessels }: { lot: Lot; vessels: string[] }) {
  const [state, action] = useActionState(recordProcessing, null)
  return (
    <form action={action} className="sheet">
      <input type="hidden" name="input_lot_code" value={lot.code} />
      <p className="sheet-lead">
        All {lot.quantity ?? ''} {lot.unit ?? ''} of {lot.code} goes in.
      </p>
      <div className="sheet-grid">
        <When />
        <Field label="what came out">
          <div className="pair">
            <input name="output_quantity" inputMode="decimal" required autoFocus data-f="quantity" />
            <select name="output_unit" defaultValue="L" data-f="unit">
              <option value="L">litres</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </Field>
        <Field label="how well do you know that">
          <div className="chips">
            <label className="radio">
              <input type="radio" name="basis" value="estimated" defaultChecked />
              roughly
            </label>
            <label className="radio">
              <input type="radio" name="basis" value="measured" />
              measured
            </label>
          </div>
        </Field>
        <VesselInput name="output_vessel_code" vessels={vessels} label="into" />
        <Field label="call it">
          <input name="output_lot_code" required data-f="output_lot_code" placeholder="MST-26-02" />
        </Field>
        <Field label="left over" hint="optional — pomace, skins">
          <div className="pair">
            <input name="byproduct_quantity" inputMode="decimal" data-f="byproduct" />
            <select name="byproduct_unit" defaultValue="kg">
              <option value="kg">kg</option>
            </select>
          </div>
        </Field>
        <input type="hidden" name="byproduct_key" value="pomace" />
        <Field label="anything else" hint="optional">
          <input name="note" data-f="note" />
        </Field>
      </div>
      <Submit label="Record it" state={state} />
    </form>
  )
}

function TransferSheet({ lot, vessels }: { lot: Lot; vessels: string[] }) {
  const [state, action] = useActionState(recordTransfer, null)
  const [out, setOut] = useState<string>(lot.quantity ? String(Math.round(Number(lot.quantity))) : '')
  const [arrived, setArrived] = useState<string>('')

  const shortfall =
    out !== '' && arrived !== '' ? Number(out) - Number(arrived) : null

  return (
    <form action={action} className="sheet">
      <input type="hidden" name="lot_code" value={lot.code} />
      <input type="hidden" name="unit" value={lot.unit ?? 'L'} />
      <div className="sheet-grid">
        <When />
        <Field label="how much came out">
          <input
            name="quantity_out"
            inputMode="decimal"
            required
            value={out}
            data-f="quantity_out"
            onChange={(e) => setOut(e.target.value)}
          />
        </Field>
        <VesselInput
          name="from_vessel_code"
          vessels={vessels}
          defaultValue={lot.vessel_code ?? ''}
          label="out of"
        />
        <Field label="how much went in">
          <input
            name="quantity_in"
            inputMode="decimal"
            required
            autoFocus
            value={arrived}
            data-f="quantity_in"
            onChange={(e) => setArrived(e.target.value)}
          />
        </Field>
        <VesselInput name="to_vessel_code" vessels={vessels} label="into" />
        <Field label="becomes a new wine" hint="optional — leave blank to keep this one">
          <input name="new_lot_code" data-f="new_lot_code" />
        </Field>
      </div>

      {/*
        The moment the whole capture layer exists for. Two real numbers go in,
        and the gap between them is named before anybody presses anything. The
        figure here is only a preview — the server recomputes it — but seeing it
        appear is what stops a shortfall becoming a silent rounding.
      */}
      {shortfall !== null && shortfall > 0 && (
        <div className="shortfall" data-shortfall={shortfall}>
          <strong>
            {shortfall} {lot.unit} unaccounted for.
          </strong>
          <div className="chips">
            <label className="radio">
              <input type="radio" name="shortfall_reason" value="expected_loss" defaultChecked />
              lees, normal
            </label>
            <label className="radio">
              <input type="radio" name="shortfall_reason" value="incident_loss" />
              spilled
            </label>
            <label className="radio">
              <input type="radio" name="shortfall_reason" value="waste" />
              thrown away
            </label>
          </div>
        </div>
      )}
      {shortfall !== null && shortfall < 0 && (
        <div className="shortfall bad">
          More went in than came out. Check the numbers.
        </div>
      )}

      <Submit label="Record it" state={state} />
    </form>
  )
}

function StageSheet({ lot }: { lot: Lot }) {
  const [state, action] = useActionState(recordStage, null)
  return (
    <form action={action} className="sheet">
      <input type="hidden" name="lot_code" value={lot.code} />
      <div className="sheet-grid">
        <When />
        <Field label="what changed" hint="your words, not ours">
          <input name="stage" required autoFocus data-f="stage" placeholder="inicio de fermentación" />
        </Field>
        <Field label="anything else" hint="optional">
          <input name="note" data-f="note" />
        </Field>
      </div>
      <Submit label="Record it" state={state} />
    </form>
  )
}

function ObservationSheet({ lot }: { lot: Lot }) {
  const [state, action] = useActionState(recordObservation, null)
  return (
    <form action={action} className="sheet">
      <input type="hidden" name="lot_code" value={lot.code} />
      <div className="sheet-grid">
        <When />
        <Field label="brix" hint="optional">
          <input name="reading_brix" inputMode="decimal" autoFocus data-f="brix" />
        </Field>
        <Field label="temperature" hint="optional">
          <input name="reading_temp_c" inputMode="decimal" data-f="temp" />
        </Field>
        <Field label="ph" hint="optional">
          <input name="reading_ph" inputMode="decimal" data-f="ph" />
        </Field>
        <Field label="what you noticed" hint="optional">
          <input name="note" data-f="note" placeholder="Smells right" />
        </Field>
      </div>
      <Submit label="Record it" state={state} />
    </form>
  )
}

function CorrectionSheet({ lot }: { lot: Lot }) {
  const [state, action] = useActionState(recordCorrection, null)
  const [seen, setSeen] = useState('')

  const believed = lot.quantity ? Number(lot.quantity) : null
  const delta = seen !== '' && believed !== null ? Number(seen) - believed : null

  return (
    <form action={action} className="sheet">
      <input type="hidden" name="lot_code" value={lot.code} />
      <input type="hidden" name="unit" value={lot.unit ?? 'L'} />
      <p className="sheet-lead">
        PROOF thinks there are {believed} {lot.unit}.
      </p>
      <div className="sheet-grid">
        <When />
        <Field label="what is actually there">
          <input
            name="observed_quantity"
            inputMode="decimal"
            required
            autoFocus
            value={seen}
            data-f="observed"
            onChange={(e) => setSeen(e.target.value)}
          />
        </Field>
        <Field label="why the difference" hint="required — this is the record">
          <input name="note" required data-f="note" placeholder="Dipped the tank properly" />
        </Field>
        <Field label="what kind of check">
          <div className="chips">
            <label className="radio">
              <input type="radio" name="reason" value="resolution" defaultChecked />
              a better measurement
            </label>
            <label className="radio">
              <input type="radio" name="reason" value="count_variance" />
              a stock count
            </label>
          </div>
        </Field>
      </div>

      {delta !== null && delta !== 0 && (
        <div className="shortfall" data-delta={delta}>
          <strong>
            {delta > 0 ? '+' : ''}
            {Math.round(delta * 100) / 100} {lot.unit} against what we thought.
          </strong>
        </div>
      )}
      {delta === 0 && seen !== '' && (
        <div className="shortfall ok">That matches. Worth recording anyway.</div>
      )}

      <Submit label="Record it" state={state} />
    </form>
  )
}

/* ------------------------------------------------------------------- bar */

type SheetKey = 'receive' | 'process' | 'move' | 'stage' | 'note' | 'correct'

export function CaptureBar({
  lot,
  vessels,
  offer,
}: {
  lot?: Lot
  vessels: string[]
  offer: SheetKey[]
}) {
  const [open, setOpen] = useState<SheetKey | null>(null)

  // The words on the buttons are what somebody would say happened, not the
  // names of the operations underneath.
  const labels: Record<SheetKey, string> = {
    receive: 'Something arrived',
    process: 'We pressed it',
    move: 'We moved it',
    stage: 'Something changed',
    note: 'Took a reading',
    correct: 'That number is wrong',
  }

  return (
    <div className="capture">
      <div className="capture-actions">
        {offer.map((key) => (
          <button
            key={key}
            type="button"
            data-sheet={key}
            className={`action${open === key ? ' on' : ''}`}
            onClick={() => setOpen(open === key ? null : key)}
          >
            {labels[key]}
          </button>
        ))}
      </div>

      {open === 'receive' && <ReceptionSheet vessels={vessels} />}
      {open === 'process' && lot && <ProcessingSheet lot={lot} vessels={vessels} />}
      {open === 'move' && lot && <TransferSheet lot={lot} vessels={vessels} />}
      {open === 'stage' && lot && <StageSheet lot={lot} />}
      {open === 'note' && lot && <ObservationSheet lot={lot} />}
      {open === 'correct' && lot && <CorrectionSheet lot={lot} />}
    </div>
  )
}
