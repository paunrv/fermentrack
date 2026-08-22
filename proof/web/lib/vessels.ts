import { asUser } from './db'
import type { Session } from './session'

export type VesselContent = {
  lot_code: string
  lot_name: string | null
  quantity: string
  unit: string
  stage: string | null
  confidence: string | null
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

  const ready = rows.filter((v) => v.status === 'empty').sort(bySpace)
  const inUse = rows.filter((v) => v.status === 'in_use' || v.status === 'over').sort(bySpace)
  const unknown = rows.filter((v) => v.status === 'unknown_size').sort((a, b) =>
    a.code.localeCompare(b.code),
  )

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
