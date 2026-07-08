export const WINEMAKER_ETAPA_KEYS = [
  'cosecha',
  'analisis',
  'fermentacion',
  'malolactica',
  'crianza',
  'embotellado',
  'bodega',
] as const

export type WinemakerEtapaKey = (typeof WINEMAKER_ETAPA_KEYS)[number]

export function isWinemakerEtapaKey(value: string | null | undefined): value is WinemakerEtapaKey {
  return WINEMAKER_ETAPA_KEYS.includes(value as WinemakerEtapaKey)
}
