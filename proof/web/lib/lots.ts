import { asUser } from './db'
import type { Session } from './session'

export type LotCard = {
  lot_id: string
  code: string
  name: string | null
  quantity: string | null
  unit: string | null
  stage: string | null
  stage_since: string | null
  vessel_code: string | null
  confidence: string | null
  last_activity: string | null
  variety: string | null
  source: string | null
  source_kind: string | null
  received_at: string | null
  received_quantity: string | null
  received_unit: string | null
  came_from: { lot_code: string; lot_name: string | null }[]
  became: { lot_code: string; lot_name: string | null }[]
  event_count: number
  data_origin: string
}

export type Change = {
  quantity: string
  unit: string
  reason: string
  label: string
  note: string | null
}

export type MaterialLine = {
  material: string
  quantity: string
  unit: string
  label: string
}

export type RelatedLot = {
  lot_code: string
  lot_name: string | null
  direction: 'from' | 'to'
  quantity: string | null
  unit: string | null
}

export type StoryRow = {
  seq: number
  event_id: string
  source_lot_code: string
  source_lot_name: string | null
  is_inherited: boolean
  kind: string
  headline: string
  occurred_at: string
  net_change: string
  balance_after: string
  unit: string | null
  moved_in: string
  moved_out: string
  changes: Change[]
  materials: MaterialLine[]
  related_lots: RelatedLot[]
  from_vessel: string | null
  to_vessel: string | null
  confidence: string | null
  event_confidence: string | null
  note: string | null
  metadata: Record<string, unknown>
  actor_name: string | null
  actor_email: string | null
}

/** One card per real-world event, with every lot it touched folded in. */
export type StoryEntry = {
  event_id: string
  occurred_at: string
  headline: string
  kind: string
  rows: StoryRow[]
  primary: StoryRow
  inputs: StoryRow[]
  outputs: StoryRow[]
}

export async function listLots(session: Session): Promise<LotCard[]> {
  return asUser(session.userId, async (tx) => {
    const rows = await tx<LotCard[]>`
      select * from public.lot_card
      where organization_id = ${session.organizationId}
      order by coalesce(last_activity, opened_at) desc
    `
    return rows as unknown as LotCard[]
  })
}

export async function getLot(
  session: Session,
  code: string,
): Promise<{ card: LotCard; story: StoryEntry[] } | null> {
  return asUser(session.userId, async (tx) => {
    const cards = await tx<LotCard[]>`
      select * from public.lot_card
      where organization_id = ${session.organizationId} and code = ${code}
    `
    const card = cards[0] as unknown as LotCard | undefined
    if (!card) return null

    const rows = (await tx<StoryRow[]>`
      select seq, event_id, source_lot_code, source_lot_name, is_inherited, kind,
             headline, occurred_at, net_change, balance_after, unit,
             moved_in, moved_out, changes, materials, related_lots,
             from_vessel, to_vessel, confidence, event_confidence, note, metadata,
             actor_name, actor_email
      from public.lot_story
      where subject_lot_id = ${card.lot_id}
      order by seq
    `) as unknown as StoryRow[]

    return { card, story: groupByEvent(rows) }
  })
}

/**
 * The same pressing appears twice in the projection — once as kilograms leaving
 * the fruit, once as litres arriving in the must. That is right in the data and
 * wrong on a screen, so the two sides are folded back into one moment.
 */
function groupByEvent(rows: StoryRow[]): StoryEntry[] {
  const order: string[] = []
  const groups = new Map<string, StoryRow[]>()

  for (const row of rows) {
    if (!groups.has(row.event_id)) {
      groups.set(row.event_id, [])
      order.push(row.event_id)
    }
    groups.get(row.event_id)!.push(row)
  }

  return order.map((id) => {
    const group = groups.get(id)!
    const primary = group.find((r) => !r.is_inherited) ?? group[0]
    return {
      event_id: id,
      occurred_at: primary.occurred_at,
      headline: primary.headline,
      kind: primary.kind,
      rows: group,
      primary,
      inputs: group.filter((r) => Number(r.net_change) < 0),
      outputs: group.filter((r) => Number(r.net_change) > 0),
    }
  })
}
