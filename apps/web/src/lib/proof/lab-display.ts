import type { LabResult } from '@proof/types'

const PARAMETER_LABELS: Record<string, string> = {
  glucose_fructose: 'Azúcar residual (G+F)',
  total_sugars: 'Azúcares totales',
  ethanol: 'Alcohol',
  ph: 'pH',
  titratable_acidity: 'Acidez titulable',
  titratable_acidity_ph7: 'Acidez tit. pH 7',
  titratable_acidity_ph82: 'Acidez tit. pH 8.2',
  volatile_acidity: 'Acidez volátil',
  gluconic_acid: 'Ácido glucónico',
  so2_free: 'SO₂ libre',
  so2_total: 'SO₂ total',
}

/** Logical groups — lower sorts first within ties, alphabetical fallback. */
const PARAMETER_SORT_RANK: Record<string, number> = {
  glucose_fructose: 100,
  total_sugars: 110,
  ethanol: 200,
  ph: 300,
  titratable_acidity_ph7: 310,
  titratable_acidity_ph82: 311,
  titratable_acidity: 312,
  volatile_acidity: 320,
  gluconic_acid: 330,
  so2_free: 400,
  so2_total: 410,
}

const PRODUCTION_STAGE_LABELS: Record<string, string> = {
  malolactic: 'Maloláctica',
  pre_bottling: 'Pre-embotellado',
  routine: 'Rutina',
}

export function labParameterLabel(parameter: string): string {
  return PARAMETER_LABELS[parameter] ?? parameter.replace(/_/g, ' ')
}

export function labProductionStageLabel(stage: string | null | undefined): string | null {
  if (!stage) return null
  return PRODUCTION_STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ')
}

export function labOriginLabel(origin: string): string {
  return origin === 'internal' ? 'Interno' : 'Externo'
}

export function isCriticalLabParameter(parameter: string): boolean {
  return parameter === 'glucose_fructose'
}

export function formatLabResultValue(result: Pick<LabResult, 'value_numeric' | 'value_qualifier' | 'unit'>): string {
  const { value_numeric, value_qualifier, unit } = result
  if (value_numeric == null && value_qualifier == null) return '—'

  const num =
    value_numeric != null
      ? Number.isInteger(value_numeric)
        ? String(value_numeric)
        : String(value_numeric)
      : ''

  const core = value_qualifier ? `${value_qualifier}${num}` : num

  if (unit === 'pH') return core || '—'
  if (!core) return '—'
  return unit ? `${core} ${unit}` : core
}

export function sortLabResults<T extends Pick<LabResult, 'parameter' | 'method'>>(results: T[]): T[] {
  return [...results].sort((a, b) => {
    const rankA = PARAMETER_SORT_RANK[a.parameter] ?? 900
    const rankB = PARAMETER_SORT_RANK[b.parameter] ?? 900
    if (rankA !== rankB) return rankA - rankB
    const methodA = a.method ?? ''
    const methodB = b.method ?? ''
    if (methodA !== methodB) return methodA.localeCompare(methodB, 'es')
    return a.parameter.localeCompare(b.parameter, 'es')
  })
}
