'use server'

import { revalidatePath } from 'next/cache'
import { asUser } from '@/lib/db'
import { currentSession } from '@/lib/session'

export type CaptureResult = { ok: true; message: string } | { ok: false; message: string }

/**
 * Marks a parameter that must reach Postgres as jsonb rather than text.
 *
 * The value is handed over as a live object, never pre-stringified. The driver
 * serialises it itself once the parameter is known to be jsonb, so passing a
 * string here produces a JSON string *containing* JSON — which Postgres
 * accepts as a scalar and the function then reports as "no destinations". A
 * whole transfer went missing that way, and the only visible symptom was a
 * function that suddenly "did not exist".
 */
type Json = { json: unknown }
const json = (value: unknown): Json => ({ json: value })
const isJson = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && 'json' in (v as Record<string, unknown>)

/**
 * Every sheet lands here. The capture functions already refuse anything that
 * would make the ledger lie, and they phrase their refusals for a person, so
 * the only job left is to pass the message through rather than swallowing it
 * behind "something went wrong".
 */
async function capture(
  run: (call: (fn: string, args: Record<string, unknown>) => Promise<void>) => Promise<void>,
  success: string,
): Promise<CaptureResult> {
  const session = await currentSession()
  if (!session) return { ok: false, message: 'No winery is open.' }

  try {
    await asUser(session.userId, async (tx) => {
      await run(async (fn, args) => {
        // Postgres will not implicitly cast text to jsonb, so a parameter that
        // is really JSON has to say so at the call site. Getting this wrong is
        // silent from the client's side — the function simply "does not exist"
        // — which is exactly how the first transfer went missing.
        const placeholders = Object.entries(args)
          .map(([name, value], i) => `${name} => $${i + 1}${isJson(value) ? '::jsonb' : ''}`)
          .join(', ')
        const values = Object.values(args).map((v) => (isJson(v) ? v.json : v))
        await tx.unsafe(`select ${fn}(${placeholders})`, values as never[])
      })
    })
  } catch (error) {
    return { ok: false, message: humanise(error) }
  }

  revalidatePath('/', 'layout')
  return { ok: true, message: success }
}

/** Postgres already speaks plainly here; strip only the machinery around it. */
function humanise(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/^error:\s*/i, '').trim() || 'That could not be recorded.'
}

const org = async () => (await currentSession())!.organizationId

/** Blank means "not known", which is different from zero and from empty text. */
const orNull = (v: FormDataEntryValue | null) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}
const num = (v: FormDataEntryValue | null) => {
  const s = orNull(v)
  return s === null ? null : Number(s)
}

export async function recordReception(
  _prev: CaptureResult | null,
  form: FormData,
): Promise<CaptureResult> {
  const organization_id = await org()
  return capture(
    (call) =>
      call('public.capture_reception', {
        p_organization_id: organization_id,
        p_occurred_at: form.get('occurred_at'),
        p_lot_code: orNull(form.get('lot_code')),
        p_quantity: num(form.get('quantity')),
        p_unit: orNull(form.get('unit')),
        p_lot_name: orNull(form.get('lot_name')),
        p_basis: form.get('basis') === 'measured' ? 'measured' : 'estimated',
        p_vessel_code: orNull(form.get('vessel_code')),
        p_source: orNull(form.get('source')),
        p_variety: orNull(form.get('variety')),
        p_note: orNull(form.get('note')),
      }),
    'Recorded.',
  )
}

export async function recordProcessing(
  _prev: CaptureResult | null,
  form: FormData,
): Promise<CaptureResult> {
  const organization_id = await org()
  return capture(
    (call) =>
      call('public.capture_processing', {
        p_organization_id: organization_id,
        p_occurred_at: form.get('occurred_at'),
        p_input_lot_code: orNull(form.get('input_lot_code')),
        p_output_lot_code: orNull(form.get('output_lot_code')),
        p_output_quantity: num(form.get('output_quantity')),
        p_output_unit: orNull(form.get('output_unit')),
        p_output_lot_name: orNull(form.get('output_lot_name')),
        p_output_basis: form.get('basis') === 'measured' ? 'measured' : 'estimated',
        p_output_vessel_code: orNull(form.get('output_vessel_code')),
        p_byproduct_key: orNull(form.get('byproduct_key')),
        p_byproduct_quantity: num(form.get('byproduct_quantity')),
        p_byproduct_unit: orNull(form.get('byproduct_unit')),
        p_note: orNull(form.get('note')),
      }),
    'Recorded.',
  )
}

export async function recordTransfer(
  _prev: CaptureResult | null,
  form: FormData,
): Promise<CaptureResult> {
  const organization_id = await org()

  // Wine goes where the operator says it goes, and that can be more than one
  // tank. The rows share their field names, so the browser sends them in the
  // order they appear and they line up by index without anybody numbering
  // anything. Rows left blank are not destinations and are dropped here; the
  // function refuses a half-filled one.
  const vessels = form.getAll('to_vessel_code')
  const amounts = form.getAll('quantity_in')
  const codes = form.getAll('new_lot_code')

  const destinations = amounts
    .map((amount, i) => ({
      vessel_code: orNull(vessels[i] ?? null),
      quantity: num(amount),
      lot_code: orNull(codes[i] ?? null),
    }))
    .filter((d) => d.vessel_code !== null || d.quantity !== null)

  return capture(
    (call) =>
      call('public.capture_transfer', {
        p_organization_id: organization_id,
        p_occurred_at: form.get('occurred_at'),
        p_lot_code: orNull(form.get('lot_code')),
        p_quantity_out: num(form.get('quantity_out')),
        p_unit: orNull(form.get('unit')),
        p_destinations: json(destinations),
        p_from_vessel_code: orNull(form.get('from_vessel_code')),
        p_basis: form.get('basis') === 'estimated' ? 'estimated' : 'measured',
        // Never defaulted. If wine is missing and nobody said why, the
        // function refuses — PROOF does not decide that unexplained means lost.
        p_shortfall_reason: orNull(form.get('shortfall_reason')),
        p_shortfall_note: orNull(form.get('shortfall_note')),
        p_note: orNull(form.get('note')),
      }),
    'Recorded.',
  )
}

export async function recordStage(
  _prev: CaptureResult | null,
  form: FormData,
): Promise<CaptureResult> {
  const organization_id = await org()
  return capture(
    (call) =>
      call('public.capture_stage', {
        p_organization_id: organization_id,
        p_occurred_at: form.get('occurred_at'),
        p_lot_code: orNull(form.get('lot_code')),
        p_stage: orNull(form.get('stage')),
        p_note: orNull(form.get('note')),
      }),
    'Recorded.',
  )
}

export async function recordObservation(
  _prev: CaptureResult | null,
  form: FormData,
): Promise<CaptureResult> {
  const organization_id = await org()

  // Readings arrive as loose pairs because we do not yet know which ones this
  // winery actually takes. Inventing a fixed set of fields before watching is
  // how you get a form with eleven boxes and two that ever get filled.
  const readings: Record<string, number | string> = {}
  for (const [key, value] of form.entries()) {
    const match = key.match(/^reading_(.+)$/)
    if (!match) continue
    const raw = typeof value === 'string' ? value.trim() : ''
    if (raw === '') continue
    readings[match[1]] = Number.isNaN(Number(raw)) ? raw : Number(raw)
  }

  return capture(
    (call) =>
      call('public.capture_observation', {
        p_organization_id: organization_id,
        p_occurred_at: form.get('occurred_at'),
        p_lot_code: orNull(form.get('lot_code')),
        p_readings: json(readings),
        p_note: orNull(form.get('note')),
      }),
    'Recorded.',
  )
}

export async function recordCorrection(
  _prev: CaptureResult | null,
  form: FormData,
): Promise<CaptureResult> {
  const organization_id = await org()
  return capture(
    (call) =>
      call('public.capture_correction', {
        p_organization_id: organization_id,
        p_occurred_at: form.get('occurred_at'),
        p_lot_code: orNull(form.get('lot_code')),
        p_observed_quantity: num(form.get('observed_quantity')),
        p_unit: orNull(form.get('unit')),
        p_note: orNull(form.get('note')),
        p_reason: form.get('reason') === 'count_variance' ? 'count_variance' : 'resolution',
      }),
    'Recorded.',
  )
}

/**
 * What happens next to this wine.
 *
 * The smallest piece of intent PROOF holds, and deliberately the only one: a
 * sentence somebody said, recorded as an ordinary event so it has a time and a
 * history. Saying something new supersedes it; clearing the box clears it.
 * What Aldo calls a "lote" — a label with a recipe and a bottle target — is a
 * different thing and is not this.
 */
export async function recordNextAction(
  _prev: CaptureResult | null,
  form: FormData,
): Promise<CaptureResult> {
  const organization_id = await org()
  return capture(
    (call) =>
      call('public.capture_next_action', {
        p_organization_id: organization_id,
        p_occurred_at: new Date().toISOString(),
        p_lot_code: orNull(form.get('lot_code')),
        p_note: orNull(form.get('note')),
      }),
    'Noted.',
  )
}

/**
 * The one thing the board can change: how big a vessel is. It asks because it
 * cannot answer "how much room have you got" without knowing, not because
 * PROOF wants to manage equipment.
 */
export async function setVesselSize(
  _prev: CaptureResult | null,
  form: FormData,
): Promise<CaptureResult> {
  const organization_id = await org()
  return capture(
    (call) =>
      call('public.set_vessel_size', {
        p_organization_id: organization_id,
        p_vessel_code: orNull(form.get('vessel_code')),
        p_capacity: num(form.get('capacity')),
        p_capacity_unit: orNull(form.get('capacity_unit')),
      }),
    'Noted.',
  )
}
