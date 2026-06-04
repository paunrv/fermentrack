export type AgentProfileType = 'distiller' | 'distributor'

/** Perfil activo válido para el agente (solo destilador o distribuidor en canvas). */
export function toAgentProfileType(
  profileTypeV2: string | undefined | null
): AgentProfileType | null {
  if (profileTypeV2 === 'distiller' || profileTypeV2 === 'distributor') {
    return profileTypeV2
  }
  return null
}

export type AgentContextHints = {
  query?: string | null
  selectedId?: string | null
  /** Estado de UI de la pantalla (filtros, KPIs); sin tablas del otro perfil */
  pantalla?: Record<string, unknown>
}
