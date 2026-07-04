import { describe, expect, it } from 'vitest'
import {
  extractLotMentionCodes,
  splitLotMentions,
} from '@/lib/proof/team-chat-lot-mentions'
import { validateTeamMessageInput } from '@/lib/proof/record-team-message'

describe('splitLotMentions', () => {
  it('links LOT codes in body text', () => {
    expect(splitLotMentions('Revisen LOT-2026-002 antes de embotellar')).toEqual([
      { kind: 'text', value: 'Revisen ' },
      { kind: 'mention', code: 'LOT-2026-002' },
      { kind: 'text', value: ' antes de embotellar' },
    ])
  })
})

describe('extractLotMentionCodes', () => {
  it('deduplicates repeated mentions', () => {
    expect(extractLotMentionCodes('LOT-2026-001 y lot-2026-001')).toEqual(['LOT-2026-001'])
  })
})

describe('validateTeamMessageInput', () => {
  it('rejects empty bodies', () => {
    expect(validateTeamMessageInput({ body: '   ' }).ok).toBe(false)
  })

  it('trims valid bodies', () => {
    const result = validateTeamMessageInput({ body: '  hola  ' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.body).toBe('hola')
  })
})
