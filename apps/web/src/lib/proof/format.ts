const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Fechas `YYYY-MM-DD` de Postgres — mediodía local para evitar −1 día en MX. */
export function parseDateOnlyLocal(isoDate: string): Date {
  const day = isoDate.slice(0, 10)
  if (DATE_ONLY_RE.test(day)) return new Date(`${day}T12:00:00`)
  return new Date(isoDate)
}

export function fmtDateOnly(isoDate: string): string {
  return parseDateOnlyLocal(isoDate).toLocaleDateString('es-MX')
}

export function fmtBottles(n: number): string {
  return n.toLocaleString('es-MX')
}

export function fmtMoney(n: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

/** Litros — máx. 1 decimal + sufijo L (spec Destilador). */
export function fmtLitros(n: number): string {
  const v = Math.round(n * 10) / 10
  return `${v.toLocaleString('es-MX', { maximumFractionDigits: 1 })} L`
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfLocalDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Bucketed day offset from a reference timestamp (calendar days, local TZ). */
export type RelativeDayTiming = {
  kind: 'past' | 'today' | 'future'
  /** Always non-negative — days ago (past), or days until (future). */
  days: number
}

/**
 * Classify how a record timestamp relates to now:
 * - past → days since the record
 * - today → same calendar day
 * - future → days until the record (never negative)
 */
export function relativeDayTiming(referenceMs: number, now = Date.now()): RelativeDayTiming {
  const dayDiff = Math.round((startOfLocalDay(now) - startOfLocalDay(referenceMs)) / MS_PER_DAY)
  if (dayDiff > 0) return { kind: 'past', days: dayDiff }
  if (dayDiff === 0) return { kind: 'today', days: 0 }
  return { kind: 'future', days: Math.abs(dayDiff) }
}
