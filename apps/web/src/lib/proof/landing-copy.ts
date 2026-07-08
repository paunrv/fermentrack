export type ProducerTab = 'winemaker' | 'brewer' | 'distiller'

/** Tab order for landing producer section — copy lives in next-intl `landing.productores.tabs`. */

export type ProducerStageStatus = 'done' | 'active' | 'pending'

export type ProducerTabStage = {
  label: string
  status: ProducerStageStatus
}

export type ProducerCycleDemoContent = {
  lotCode: string
  varietal: string
  /** Fallback when stageHints is missing an entry */
  hint?: string
  stages: string[]
  /** One message per stage — updates as the user explores the cycle */
  stageHints: string[]
  /** Initial highlighted stage (0-based). Defaults to 2. */
  defaultActiveIndex?: number
}

export type ProducerTabContent = {
  label: string
  bullets: string[]
  demo: ProducerCycleDemoContent
  /** @deprecated Use demo — kept for legacy tab JSON during migration */
  timelineTitle?: string
  stages?: ProducerTabStage[]
}

export const PRODUCER_TABS_ORDER: ProducerTab[] = ['winemaker', 'brewer', 'distiller']

/** Tabs shown on the marketing site — brewer/distiller hidden until launch. */
export const LANDING_PRODUCER_TABS_VISIBLE: ProducerTab[] = ['winemaker']
