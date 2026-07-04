/** Detect and link LOT-YYYY-NNN mentions in team chat bodies. */

export const LOT_MENTION_PATTERN = /LOT-\d{4}-\d{1,4}/gi

export type LotMentionSegment =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; code: string }

export function splitLotMentions(body: string): LotMentionSegment[] {
  const segments: LotMentionSegment[] = []
  let lastIndex = 0
  const re = new RegExp(LOT_MENTION_PATTERN.source, 'gi')
  let match: RegExpExecArray | null

  while ((match = re.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: body.slice(lastIndex, match.index) })
    }
    segments.push({ kind: 'mention', code: match[0].toUpperCase() })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < body.length) {
    segments.push({ kind: 'text', value: body.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: body }]
}

export function extractLotMentionCodes(body: string): string[] {
  const codes = new Set<string>()
  const re = new RegExp(LOT_MENTION_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    codes.add(match[0].toUpperCase())
  }
  return [...codes]
}
