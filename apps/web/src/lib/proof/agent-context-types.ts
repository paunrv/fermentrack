export type AgentProfileType = 'distiller' | 'distributor' | 'winemaker'

/** Perfil activo válido para el agente en canvas PROOF. */
export function toAgentProfileType(
  profileTypeV2: string | undefined | null
): AgentProfileType | null {
  if (
    profileTypeV2 === 'distiller' ||
    profileTypeV2 === 'distributor' ||
    profileTypeV2 === 'winemaker'
  ) {
    return profileTypeV2
  }
  return null
}

export type AgentContextHints = {
  query?: string | null
  selectedId?: string | null
  /** Últimos turnos del chat (para confirmaciones como "sí, prepara ticket") */
  conversation?: { role: 'user' | 'agent'; content: string }[]
  /** Estado de UI de la pantalla (filtros, KPIs, hub activo); sin tablas del otro perfil */
  pantalla?: Record<string, unknown>
  /** Imagen adjunta en base64 (para intents visuales) */
  image?: string | null
}
