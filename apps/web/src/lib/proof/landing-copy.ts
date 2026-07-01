export type ProducerTab = 'winemaker' | 'brewer' | 'distiller'

/** @deprecated fr/it locales removed in L1 — use next-intl messages under landing.productores.tabs */
export type LandingLang = 'es' | 'en'

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
