/**
 * Numbers as a person reads them. A winery deals in whole litres and whole
 * kilograms; showing 1730.000000 is the ERP tell this product is trying to
 * avoid, and trailing zeros make a rounded estimate look like a measurement.
 */
export function formatQuantity(value: string | number | null, unit: string | null): string {
  if (value === null || value === undefined || unit === null) return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'

  const decimals = Math.abs(n) < 10 && !Number.isInteger(n) ? 1 : 0
  const rendered = n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${rendered} ${unit}`
}

export function formatSigned(value: string | number, unit: string | null): string {
  const n = Number(value)
  const sign = n > 0 ? '+' : ''
  return `${sign}${formatQuantity(Math.abs(n) === 0 ? 0 : n, unit)}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatWhen(iso: string): { date: string; time: string; relative: string } {
  const d = new Date(iso)
  const date = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
  const time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`

  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  let relative: string
  if (days <= 0) relative = 'today'
  else if (days === 1) relative = 'yesterday'
  else if (days < 30) relative = `${days} days ago`
  else if (days < 365) relative = `${Math.floor(days / 30)} months ago`
  else relative = `${Math.floor(days / 365)} years ago`

  return { date, time, relative }
}

/** Readings come off the event as free-form JSON; render only what is scalar. */
export function readings(metadata: Record<string, unknown> | null): [string, string][] {
  if (!metadata) return []
  const skip = new Set(['expected', 'observed', 'unit', 'source', 'source_kind', 'variety'])
  return Object.entries(metadata)
    .filter(([k, v]) => !skip.has(k) && (typeof v === 'number' || typeof v === 'string'))
    .map(([k, v]) => [k.replace(/_/g, ' '), String(v)])
}
