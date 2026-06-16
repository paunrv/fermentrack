import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import { looksLikeCrearOrdenCompraQuery } from '@/lib/proof/distributor-agent-actions'
import { isOrdenCompraTurn } from '@/lib/proof/toma-oc-intent'
import {
  isPedidoVentaTurn,
  looksLikeIniciarPedidoVentaQuery,
  type AgentConversationTurn,
} from '@/lib/proof/toma-pedido-intent'

/** Contexto mínimo para quick answers de OC/pedido sin cargar Supabase. */
export function minimalDistributorQuickContext(
  conversation: AgentConversationTurn[] = []
): DistributorAgentContext & { conversation: AgentConversationTurn[] } {
  return {
    perfil: 'distribuidor',
    resumen: {
      skusTotal: 0,
      stockDisponibleTotal: 0,
      bajoStock: 0,
      quiebre: 0,
      pedidosActivos: 0,
      total_por_cobrar: 0,
      clientes_con_saldo: 0,
      clientes_vencidos: 0,
      pedidos_confirmados_pendientes: 0,
    },
    credito: { total_por_cobrar: 0, clientes_vencidos: 0, cuentas: [] },
    cxp: { total_por_pagar: 0, proveedores_con_saldo: 0, cuentas: [] },
    pedidos_pendientes_entrega: [],
    skus_stock_critico: [],
    skus: [],
    pedidos: [],
    ordenes_compra_pendientes: [],
    ultima_orden_ingresada: null,
    mi_informacion: {
      titular_cuenta: null,
      cuenta_deposito: null,
      banco_deposito: null,
      tiene_constancia_fiscal: false,
    },
    conversation,
  }
}

export function isDistributorGuidedFlowQuery(
  query: string,
  conversation: AgentConversationTurn[]
): boolean {
  return (
    looksLikeCrearOrdenCompraQuery(query) ||
    looksLikeIniciarPedidoVentaQuery(query) ||
    isOrdenCompraTurn(query, conversation) ||
    isPedidoVentaTurn(query, conversation)
  )
}
