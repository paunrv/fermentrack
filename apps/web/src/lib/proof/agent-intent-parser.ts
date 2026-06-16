import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentProfileType } from '@/lib/proof/agent-context-types'
import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import {
  executeDistillerAgentAction,
  parseDistillerActionIntent,
  type DistillerAgentAction,
  type ProductoViajeRefForAgent,
  type ViajeRefForAgent,
} from '@/lib/proof/distiller-agent-actions'
import { tryDistillerQuickAnswer } from '@/lib/proof/distiller-agent-answers'
import {
  executeDistributorAgentAction,
  parseDistributorActionIntent,
  type DistributorAgentAction,
} from '@/lib/proof/distributor-agent-actions'
import { tryDistributorQuickAnswer } from '@/lib/proof/distributor-agent-answers'
import type { ProfileScope } from '@/lib/supabase'

export type AgentQuickAnswer = {
  mensaje: string
  accionLabel: string
  accionHref: string
}

export type DistillerIntentContext = {
  lotes: { id: string; numero_lote: string; tipo_agave: string }[]
  viajes: ViajeRefForAgent[]
  productosViaje: ProductoViajeRefForAgent[]
  selectedLoteId?: string | null
}

export type AgentActionResult = {
  message: string
  entityId: string
  entityKind?: 'sku' | 'pedido' | 'orden'
  refreshSkuId?: string | null
  openImagePicker?: boolean
  refreshProfile?: boolean
}

export function parseIntent(
  query: string,
  profileType: AgentProfileType,
  context: unknown,
  conversation?: { role: 'user' | 'agent'; content: string }[]
): DistillerAgentAction | DistributorAgentAction | null {
  if (profileType === 'distiller') {
    const ctx = context as DistillerIntentContext
    return parseDistillerActionIntent(
      query,
      ctx.lotes,
      ctx.viajes,
      ctx.productosViaje,
      { selectedLoteId: ctx.selectedLoteId }
    )
  }
  if (profileType === 'distributor') {
    const raw = context as DistributorAgentContext & { image?: string | null }
    return parseDistributorActionIntent(
      query,
      { ...raw, image: raw.image ?? undefined },
      conversation
    )
  }
  return null
}

export function quickAnswer(
  query: string,
  profileType: AgentProfileType,
  datos: Record<string, unknown>
): AgentQuickAnswer | null {
  if (profileType === 'distiller') {
    return tryDistillerQuickAnswer(query, datos)
  }
  if (profileType === 'distributor') {
    return tryDistributorQuickAnswer(query, datos)
  }
  return null
}

export async function executeIntent(
  sb: SupabaseClient,
  clerkId: string,
  profileType: AgentProfileType,
  action: DistillerAgentAction | DistributorAgentAction,
  scope?: ProfileScope,
  image?: string | null
): Promise<AgentActionResult> {
  if (profileType === 'distiller') {
    const result = await executeDistillerAgentAction(
      sb,
      clerkId,
      action as DistillerAgentAction
    )
    return { message: result.message, entityId: result.loteId }
  }
  if (profileType === 'distributor') {
    if (!scope) throw new Error('scope requerido para acciones de distribuidor')
    const distAction = action as DistributorAgentAction
    const resolvedAction =
      distAction.type === 'set_sku_image' && image && !distAction.image
        ? { ...distAction, image }
        : distAction
    try {
      const result = await executeDistributorAgentAction(
        sb,
        clerkId,
        scope,
        resolvedAction
      )
      return {
        message: result.message,
        entityId: result.entityId,
        entityKind: result.entityKind,
        refreshSkuId: result.refreshSkuId,
        openImagePicker: result.openImagePicker,
        refreshProfile: result.refreshProfile,
      }
    } catch (e) {
      console.error('[agente] executeDistributorAgentAction', resolvedAction.type, e)
      throw new Error(
        e instanceof Error ? e.message : 'No se pudo completar la acción del agente'
      )
    }
  }
  throw new Error(`Perfil no soportado: ${profileType}`)
}
