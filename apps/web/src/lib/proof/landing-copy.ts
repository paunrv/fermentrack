export type ProducerTab = 'winemaker' | 'brewer' | 'distiller'

/** Tab order for landing producer section — copy lives in next-intl `landing.productores.tabs`. */

export type ProducerStageStatus = 'done' | 'active' | 'pending'

export type ProducerTabStage = {
  label: string
  status: ProducerStageStatus
}

export type ProducerTabContent = {
  label: string
  bullets: string[]
  timelineTitle: string
  stages: ProducerTabStage[]
}

export const PRODUCER_TABS_ORDER: ProducerTab[] = ['winemaker', 'brewer', 'distiller']
