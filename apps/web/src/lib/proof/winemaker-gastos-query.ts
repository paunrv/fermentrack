import type { WinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'
import { isAssignLotIntent, isOverheadBodegaIntent } from '@/lib/proof/winemaker-agent-actions'

export type WmGastoResumen = WinemakerAgentContext['gastosRecientes'][number]

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

/** Consulta de listado (no acción de registro). */
export function isGastosListQuery(query: string): boolean {
  const q = norm(query)
  if (isOverheadBodegaIntent(q) || isAssignLotIntent(q)) return false

  if (!q.includes('gast') && !q.includes('costo') && !q.includes('pague')) return false

  return (
    q.includes('muéstrame') ||
    q.includes('muestrame') ||
    q.includes('mostrar') ||
    q.includes('listar') ||
    q.includes('cuant') ||
    q.includes('ultim') ||
    q.includes('dia') ||
    q.includes('semana') ||
    q.includes('mes')
  )
}

export function isBodegaGastosListQuery(query: string): boolean {
  const q = norm(query)
  return (
    isGastosListQuery(query) &&
    q.includes('bodega') &&
    (q.includes('sin lote') || q.includes('overhead'))
  )
}

export function parseGastosLookbackDays(query: string): number | null {
  const q = norm(query)
  const match = q.match(/(\d{1,3})\s*dias?/)
  if (match) return Math.min(365, Number(match[1]))

  if (q.includes('semana') || q.includes('7 dias')) return 7
  if (q.includes('mes') || q.includes('30 dias')) return 30
  if (q.includes('ultim')) return 10
  return null
}

export function gastosLookbackLabel(days: number | null): string {
  if (days === 7) return 'la última semana'
  if (days === 30) return 'el último mes'
  if (days != null) return `los últimos ${days} días`
  return 'recientes'
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Fecha de registro en bodega (no fecha de factura). */
export function gastoRecordedDate(cost: WmGastoResumen): string {
  return cost.created_at?.slice(0, 10) || cost.cost_date
}

export function filterGastosByLookback(
  costs: WmGastoResumen[],
  query: string
): WmGastoResumen[] {
  const days = parseGastosLookbackDays(query)
  if (!days) return costs

  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = localDateKey(cutoff)

  return costs.filter(c => gastoRecordedDate(c) >= cutoffIso)
}

export function filterBodegaGastos(costs: WmGastoResumen[]): WmGastoResumen[] {
  return costs.filter(c => !c.lot_id)
}
