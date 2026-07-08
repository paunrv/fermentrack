import type { Database } from './database'

/** Shorthand row types from generated Supabase schema. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

export type Vessel = Tables<'vessels'>
export type LabReport = Tables<'lab_reports'>
export type LabSample = Tables<'lab_samples'>
export type LabResult = Tables<'lab_results'>
export type Lot = Tables<'lots'>
export type Event = Tables<'events'>
export type LotRelationship = Tables<'lot_relationships'>
export type Label = Tables<'labels'>
export type LabelCase = Tables<'label_cases'>

export type VesselType = 'steel_tank' | 'barrel' | 'concrete' | 'amphora' | 'other'

export type LabOrigin = 'internal' | 'external'

export type ValueQualifier = '<' | '>' | null

export type RelationshipType = 'blend' | 'split' | 'transfer' | 'rack'

/** Append-only event catalog (`public.events.event_type`). */
export type EventType =
  | 'HARVEST_STARTED'
  | 'GRAPE_RECEIVED'
  | 'ANALYSIS_STARTED'
  | 'ANALYSIS_COMPLETED'
  | 'FERMENTATION_STARTED'
  | 'FERMENTATION_MONITORING'
  | 'MALOLACTIC_STARTED'
  | 'AGING_STARTED'
  | 'BOTTLING_STARTED'
  | 'BOTTLING_COMPLETED'
  | 'STAGE_CHANGED'
  | 'WINEMAKER_NOTE'
  | 'VINTAGE_OBSERVATION'
  | 'TASTING_NOTE'
  | 'DECISION_RECORDED'
  | 'VESSEL_ASSIGNMENT'
  | 'VESSEL_MOVE'
  | 'BLEND_COMPLETED'
  | 'BOTTLED'

export type LotStage =
  | 'harvest'
  | 'fermentation'
  | 'malolactic'
  | 'aging'
  | 'bottling'
  | 'bottled'

export type LotEtapa =
  | 'cosecha'
  | 'analisis'
  | 'fermentacion'
  | 'malolactica'
  | 'crianza'
  | 'embotellado'

export type VesselAssignmentPayload = {
  vessel_id: string
  lot_id: string
}

export type VesselMovePayload = VesselAssignmentPayload & {
  from_vessel_id?: string
}

export type BlendCompletedSource = {
  lot_id: string
  volume_liters: number
}

export type BlendCompletedPayload = {
  child_lot_id: string
  source: BlendCompletedSource[]
}

export type BottledPayload = {
  label_id: string
  case_count: number
  total_bottles: number
}

/** Row from `blend_proportions` view (generated; columns nullable in PostgREST). */
export type BlendProportionRow = Views<'blend_proportions'>

/** Blend % with metrics populated (view filters `volume_liters_contributed IS NOT NULL`). */
export type BlendProportion = Required<
  Pick<
    BlendProportionRow,
    | 'child_lot_id'
    | 'parent_lot_id'
    | 'volume_liters_contributed'
    | 'total_volume_liters'
    | 'proportion_pct'
  >
>

/** Parent contribution when this lot is the blend child (`child_lot_id`). */
export type LotParentContribution = LotRelationship & {
  parent_lot?: Lot
  proportion?: BlendProportion
}

/** Lote con linaje hacia arriba — relationships donde este lote es el child. */
export type LotLineage = Lot & {
  parent_relationships: LotParentContribution[]
}

export type LabSampleWithResults = LabSample & {
  lab_results: LabResult[]
}

/** Informe completo: report → samples → results (vista de detalle). */
export type LabReportWithSamples = LabReport & {
  lab_samples: LabSampleWithResults[]
}

/** Etiqueta con inventario embotellado (cajas / botellas). */
export type LabelWithCases = Label & {
  label_cases: LabelCase[]
}

export type { Database, Json } from './database'
