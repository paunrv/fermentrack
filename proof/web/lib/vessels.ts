import { asUser } from './db'
import type { Session } from './session'

export type VesselContent = {
  lot_code: string
  lot_name: string | null
  quantity: string
  unit: string
  /** The same amount in the unit he last used for this wine. */
  quantity_said: string | null
  unit_said: string | null
  stage: string | null
  confidence: string | null
  last_operation: string | null
  last_note: string | null
  last_at: string | null
  next_action: string | null
}

export type BoardVessel = {
  vessel_id: string
  code: string
  name: string | null
  vessel_type: string
  capacity: string | null
  capacity_unit: string | null
  unit: string | null
  capacity_base: string | null
  occupied: string
  available: string | null
  fill: string | null
  contents: VesselContent[]
  lot_count: number
  status: 'empty' | 'in_use' | 'unknown_size' | 'over'
  last_activity: string | null
}

/** Room, counted per unit — litres and kilograms are never added together. */
export type Room = { unit: string; capacity: number; occupied: number; free: number; largest: number }

export type Board = {
  ready: BoardVessel[]
  inUse: BoardVessel[]
  unknown: BoardVessel[]
  room: Room[]
}

export async function getBoard(session: Session): Promise<Board> {
  const rows = await asUser(session.userId, async (tx) => {
    return (await tx<BoardVessel[]>`
      select vessel_id, code, name, vessel_type, capacity, capacity_unit, unit,
             capacity_base, occupied, available, fill, contents, lot_count,
             status, last_activity
      from public.vessel_board
      where organization_id = ${session.organizationId}
    `) as unknown as BoardVessel[]
  })

  // Most free space first, because during harvest the question is always
  // "where can I put this?" rather than "list my equipment".
  const bySpace = (a: BoardVessel, b: BoardVessel) =>
    Number(b.available ?? 0) - Number(a.available ?? 0)

  // What is in a vessel decides where it appears, not whether we know its size.
  // Sorting by size first buried a fermenting tank under "size not known",
  // which is not how anybody describes their own cellar.
  const holding = (v: BoardVessel) => v.contents.length > 0

  const inUse = rows.filter(holding).sort((a, b) => a.code.localeCompare(b.code))
  const ready = rows.filter((v) => !holding(v) && v.status !== 'unknown_size').sort(bySpace)
  const unknown = rows
    .filter((v) => !holding(v) && v.status === 'unknown_size')
    .sort((a, b) => a.code.localeCompare(b.code))

  const room = new Map<string, Room>()
  for (const v of rows) {
    if (v.status === 'unknown_size' || !v.unit) continue
    const r = room.get(v.unit) ?? { unit: v.unit, capacity: 0, occupied: 0, free: 0, largest: 0 }
    r.capacity += Number(v.capacity_base ?? 0)
    r.occupied += Number(v.occupied)
    r.free += Number(v.available ?? 0)
    r.largest = Math.max(r.largest, Number(v.available ?? 0))
    room.set(v.unit, r)
  }

  return { ready, inUse, unknown, room: [...room.values()].sort((a, b) => b.free - a.free) }
}
