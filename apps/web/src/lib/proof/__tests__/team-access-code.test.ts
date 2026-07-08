import { describe, expect, it } from 'vitest'
import {
  accessCodesMatch,
  generateTeamAccessCode,
  hashTeamAccessCode,
  isValidAccessCodeFormat,
  normalizeWineryNameForMatch,
} from '@/lib/proof/team-access-code'

describe('team-access-code', () => {
  it('generates 4-digit codes', () => {
    const code = generateTeamAccessCode()
    expect(isValidAccessCodeFormat(code)).toBe(true)
  })

  it('matches winery names case-insensitively', () => {
    expect(normalizeWineryNameForMatch('Viñas del Tigre')).toBe('vinas del tigre')
  })

  it('validates hashed access codes', () => {
    const orgId = '11111111-1111-1111-1111-111111111111'
    const code = '4821'
    const hash = hashTeamAccessCode(orgId, code)
    expect(accessCodesMatch(orgId, code, hash)).toBe(true)
    expect(accessCodesMatch(orgId, '0000', hash)).toBe(false)
  })
})
