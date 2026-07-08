import type { SupabaseClient } from '@supabase/supabase-js'
import { varietalNamesFromInputs } from '@/lib/supabase/winemaker-owner-home'
import type { BlendProportionRow, LabelWithCases } from '@proof/types'

export type BlendParentRow = {
  parentLotId: string
  parentLotCode: string
  varietal: string | null
  volumeLitersContributed: number
  totalVolumeLiters: number
  proportionPct: number
}

export type LotLineageEventType = 'BLEND_COMPLETED' | 'WINEMAKER_NOTE' | 'BOTTLED'

export type LotLineageEvent = {
  id: string
  eventType: LotLineageEventType
  occurredAt: string
  payload: Record<string, unknown>
}

export type LotLineageViewModel = {
  blendParents: BlendParentRow[]
  events: LotLineageEvent[]
  finishedProduct: LabelWithCases | null
}

type ParentLotRow = {
  id: string
  code: string
  lot_grape_inputs: unknown
}

function isLineageEventType(value: string): value is LotLineageEventType {
  return value === 'BLEND_COMPLETED' || value === 'WINEMAKER_NOTE' || value === 'BOTTLED'
}

function toBlendParentRow(
  proportion: BlendProportionRow,
  parent: ParentLotRow | undefined
): BlendParentRow | null {
  if (!proportion.parent_lot_id) return null
  const volume = proportion.volume_liters_contributed
  const total = proportion.total_volume_liters
  const pct = proportion.proportion_pct
  if (volume == null || total == null || pct == null) return null

  const varietalNames = parent ? varietalNamesFromInputs(parent.lot_grape_inputs) : []

  return {
    parentLotId: proportion.parent_lot_id,
    parentLotCode: parent?.code ?? proportion.parent_lot_id.slice(0, 8),
    varietal: varietalNames.length > 0 ? varietalNames.join(', ') : null,
    volumeLitersContributed: Number(volume),
    totalVolumeLiters: Number(total),
    proportionPct: Number(pct),
  }
}

export async function fetchLotLineage(
  supabase: SupabaseClient,
  lotId: string,
  orgId: string
): Promise<LotLineageViewModel> {
  const [proportionsRes, eventsRes, labelsRes] = await Promise.all([
    supabase.from('blend_proportions').select('*').eq('child_lot_id', lotId),
    supabase
      .from('events')
      .select('id, event_type, payload, occurred_at')
      .eq('lot_id', lotId)
      .eq('organization_id', orgId)
      .in('event_type', ['BLEND_COMPLETED', 'WINEMAKER_NOTE', 'BOTTLED'])
      .order('occurred_at', { ascending: true }),
    supabase
      .from('labels')
      .select('*, label_cases(*)')
      .eq('lot_id', lotId)
      .eq('organization_id', orgId)
      .maybeSingle(),
  ])

  if (proportionsRes.error) throw proportionsRes.error
  if (eventsRes.error) throw eventsRes.error
  if (labelsRes.error) throw labelsRes.error

  const proportions = (proportionsRes.data ?? []) as BlendProportionRow[]
  const parentIds = [
    ...new Set(
      proportions
        .map(row => row.parent_lot_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ]

  let parentLots = new Map<string, ParentLotRow>()
  if (parentIds.length > 0) {
    const { data: parents, error: parentsError } = await supabase
      .from('lots')
      .select('id, code, lot_grape_inputs(varietals(name))')
      .eq('organization_id', orgId)
      .in('id', parentIds)

    if (parentsError) throw parentsError
    parentLots = new Map((parents ?? []).map(row => [row.id, row as ParentLotRow]))
  }

  const blendParents = proportions
    .map(row => toBlendParentRow(row, parentLots.get(row.parent_lot_id ?? '')))
    .filter((row): row is BlendParentRow => row != null)
    .sort((a, b) => b.proportionPct - a.proportionPct)

  const events: LotLineageEvent[] = (eventsRes.data ?? [])
    .filter(row => isLineageEventType(row.event_type))
    .map(row => ({
      id: row.id,
      eventType: row.event_type,
      occurredAt: row.occurred_at,
      payload:
        row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
          ? (row.payload as Record<string, unknown>)
          : {},
    }))

  const labelRow = labelsRes.data
  const finishedProduct: LabelWithCases | null = labelRow
    ? {
        ...(labelRow as LabelWithCases),
        label_cases: Array.isArray(labelRow.label_cases) ? labelRow.label_cases : [],
      }
    : null

  return {
    blendParents,
    events,
    finishedProduct,
  }
}
