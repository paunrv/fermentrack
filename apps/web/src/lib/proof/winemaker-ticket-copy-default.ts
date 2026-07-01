import esMX from '../../../messages/es-MX.json'
import {
  createWinemakerTicketCopy,
  type WinemakerTicketCopy,
} from '@/lib/proof/winemaker-ticket-copy'

function getNested(obj: Record<string, unknown>, path: string[]): string {
  let cur: unknown = obj
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return path.join('.')
    cur = (cur as Record<string, unknown>)[key]
  }
  return typeof cur === 'string' ? cur : path.join('.')
}

function interpolate(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`
  )
}

let cachedDefaultCopy: WinemakerTicketCopy | null = null

/** es-MX copy for server/tests when request locale is unavailable. */
export function getDefaultWinemakerTicketCopy(): WinemakerTicketCopy {
  if (cachedDefaultCopy) return cachedDefaultCopy
  const messages = esMX.winemaker.ticketOcr as Record<string, unknown>
  cachedDefaultCopy = createWinemakerTicketCopy((key, values) =>
    interpolate(getNested(messages, key.split('.')), values ?? {})
  )
  return cachedDefaultCopy
}
