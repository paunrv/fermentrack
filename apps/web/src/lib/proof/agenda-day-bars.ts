import type { WmDocumentRow } from '@/lib/proof/winemaker-types'
import type { WinemakerEtapaKey } from '@/lib/proof/winemaker-etapa'
import { isWinemakerEtapaKey } from '@/lib/proof/winemaker-etapa'

export type AgendaCaptureSource = 'whiteboard' | 'lab' | 'bodega' | 'other'

export type AgendaBarKind = AgendaCaptureSource

export type AgendaDayEvent = {
  id: string
  date: string
  source: AgendaCaptureSource
  title: string
  etapa: WinemakerEtapaKey | null
  filename: string
  storagePath: string | null
}

export type AgendaDaySummary = {
  date: string
  events: AgendaDayEvent[]
  /** Up to 3 bar kinds for the cell (order preserved, unique). */
  bars: AgendaBarKind[]
  overflow: number
}

const MAX_BARS = 3

export function agendaSourceFromDocument(doc: WmDocumentRow): AgendaCaptureSource {
  const raw = doc.parsed_json?.source
  if (raw === 'whiteboard' || raw === 'lab' || raw === 'bodega') return raw
  return 'other'
}

export function agendaEtapaFromDocument(doc: WmDocumentRow): WinemakerEtapaKey | null {
  const raw = doc.parsed_json?.etapa
  return typeof raw === 'string' && isWinemakerEtapaKey(raw) ? raw : null
}

export function documentToAgendaEvent(doc: WmDocumentRow): AgendaDayEvent {
  return {
    id: doc.id,
    date: doc.document_date,
    source: agendaSourceFromDocument(doc),
    title: doc.concept_title?.trim() || doc.original_filename || doc.document_type,
    etapa: agendaEtapaFromDocument(doc),
    filename: doc.original_filename,
    storagePath: doc.storage_path,
  }
}

/** CSS custom-property token for a bar kind (no hex). */
export function agendaBarToken(kind: AgendaBarKind): string {
  switch (kind) {
    case 'whiteboard':
      return 'var(--proof-accent)'
    case 'lab':
      return 'var(--ok)'
    case 'bodega':
      return 'var(--warn)'
    default:
      return 'var(--fg-3)'
  }
}

/**
 * Group documents by `document_date` for Garmin-style day cells.
 * Bars: one per event (source color), max 3; overflow = remaining event count.
 */
export function buildAgendaDayBars(
  docs: WmDocumentRow[],
  maxBars = MAX_BARS
): Map<string, AgendaDaySummary> {
  const byDate = new Map<string, AgendaDayEvent[]>()

  for (const doc of docs) {
    const date = doc.document_date?.slice(0, 10)
    if (!date) continue
    const list = byDate.get(date) ?? []
    list.push(documentToAgendaEvent(doc))
    byDate.set(date, list)
  }

  const result = new Map<string, AgendaDaySummary>()
  for (const [date, events] of byDate) {
    const bars: AgendaBarKind[] = events.slice(0, maxBars).map(ev => ev.source)
    const overflow = Math.max(0, events.length - maxBars)
    result.set(date, { date, events, bars, overflow })
  }
  return result
}

export function monthDateRange(year: number, monthIndex: number): { from: string; to: string } {
  const from = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const to = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export function buildMonthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
