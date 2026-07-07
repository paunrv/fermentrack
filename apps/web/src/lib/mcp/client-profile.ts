import type { AgentProfileType } from '@/lib/proof/agent-context-types'
import type { ExtraProfile } from '@/lib/supabase'
import { isWinemakerShellMode } from '@/lib/proof/dashboard-shell'

/** MCP scope for dashboard UI — respects winemaker org when shell is in winemaker mode. */
export function resolveMcpClientProfileType(options: {
  profileType?: ExtraProfile | null
  orgType?: string | null
}): AgentProfileType | null {
  const { profileType, orgType } = options
  if (isWinemakerShellMode({ profileType, orgType })) return 'winemaker'
  if (profileType === 'distributor') return 'distributor'
  if (profileType === 'distiller') return 'distiller'
  if (profileType === 'winemaker') return 'winemaker'
  if (orgType === 'winemaker') return 'winemaker'
  return null
}
