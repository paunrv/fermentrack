import { createHash, timingSafeEqual } from 'crypto'

export type TeamPlatformProfile = 'winemaker' | 'bodega'

const CODE_PATTERN = /^\d{4}$/

export function generateTeamAccessCode(): string {
  return String(Math.floor(Math.random() * 10_000)).padStart(4, '0')
}

export function normalizeWineryNameForMatch(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
}

function inviteCodeSecret(): string {
  return (
    process.env.TEAM_INVITE_CODE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ||
    'proof-dev-team-invite-secret'
  )
}

export function hashTeamAccessCode(organizationId: string, code: string): string {
  const normalized = code.trim()
  return createHash('sha256')
    .update(`${organizationId}:${normalized}:${inviteCodeSecret()}`)
    .digest('hex')
}

export function isValidAccessCodeFormat(code: string): boolean {
  return CODE_PATTERN.test(code.trim())
}

export function accessCodesMatch(
  organizationId: string,
  code: string,
  storedHash: string | null | undefined
): boolean {
  if (!storedHash || !isValidAccessCodeFormat(code)) return false
  const computed = hashTeamAccessCode(organizationId, code.trim())
  try {
    return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'))
  } catch {
    return false
  }
}
