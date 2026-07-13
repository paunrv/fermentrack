import type { ProfileType } from '@/lib/proof/kpi-metrics'

export type ConnectionHubTool = {
  name: string
  kind: 'read' | 'write'
  descriptionKey: string
}

const READ_TOOLS: ConnectionHubTool[] = [
  { name: 'get_session_snapshot', kind: 'read', descriptionKey: 'tools.get_session_snapshot' },
  { name: 'list_skus', kind: 'read', descriptionKey: 'tools.list_skus' },
  { name: 'get_inventory_summary', kind: 'read', descriptionKey: 'tools.get_inventory_summary' },
  { name: 'list_pedidos', kind: 'read', descriptionKey: 'tools.list_pedidos' },
  { name: 'get_credito_resumen', kind: 'read', descriptionKey: 'tools.get_credito_resumen' },
  { name: 'list_ordenes_compra', kind: 'read', descriptionKey: 'tools.list_ordenes_compra' },
  { name: 'list_lotes', kind: 'read', descriptionKey: 'tools.list_lotes' },
  { name: 'list_documentos', kind: 'read', descriptionKey: 'tools.list_documentos' },
  { name: 'get_resumen_bodega', kind: 'read', descriptionKey: 'tools.get_resumen_bodega' },
  { name: 'list_etiquetas', kind: 'read', descriptionKey: 'tools.list_etiquetas' },
  { name: 'list_mensajes', kind: 'read', descriptionKey: 'tools.list_mensajes' },
  { name: 'list_corridas', kind: 'read', descriptionKey: 'tools.list_corridas' },
  { name: 'list_viajes', kind: 'read', descriptionKey: 'tools.list_viajes' },
  { name: 'list_lotes_distiller', kind: 'read', descriptionKey: 'tools.list_lotes_distiller' },
]

const WRITE_TOOLS: ConnectionHubTool[] = [
  { name: 'create_pedido', kind: 'write', descriptionKey: 'tools.create_pedido' },
  { name: 'confirmar_entrega', kind: 'write', descriptionKey: 'tools.confirmar_entrega' },
  { name: 'create_orden_compra', kind: 'write', descriptionKey: 'tools.create_orden_compra' },
  { name: 'confirmar_recepcion', kind: 'write', descriptionKey: 'tools.confirmar_recepcion' },
  { name: 'import_recepcion_draft', kind: 'write', descriptionKey: 'tools.import_recepcion_draft' },
  { name: 'registrar_pago_cliente', kind: 'write', descriptionKey: 'tools.registrar_pago_cliente' },
  { name: 'editar_sku', kind: 'write', descriptionKey: 'tools.editar_sku' },
  { name: 'get_cobro_context', kind: 'write', descriptionKey: 'tools.get_cobro_context' },
  { name: 'import_winemaker_ticket', kind: 'write', descriptionKey: 'tools.import_winemaker_ticket' },
  { name: 'registrar_salida', kind: 'write', descriptionKey: 'tools.registrar_salida' },
  { name: 'enviar_mensaje', kind: 'write', descriptionKey: 'tools.enviar_mensaje' },
  { name: 'crear_lote', kind: 'write', descriptionKey: 'tools.crear_lote' },
  { name: 'registrar_embotellado', kind: 'write', descriptionKey: 'tools.registrar_embotellado' },
  { name: 'cambiar_etapa_lote', kind: 'write', descriptionKey: 'tools.cambiar_etapa_lote' },
]

export function toolsForProfile(profileType: ProfileType): ConnectionHubTool[] {
  const namesByProfile: Record<ProfileType, string[]> = {
    distributor: [
      'get_session_snapshot',
      'list_skus',
      'get_inventory_summary',
      'list_pedidos',
      'get_credito_resumen',
      'list_ordenes_compra',
      'create_pedido',
      'confirmar_entrega',
      'create_orden_compra',
      'confirmar_recepcion',
      'import_recepcion_draft',
      'registrar_pago_cliente',
      'editar_sku',
      'get_cobro_context',
    ],
    winemaker: [
      'get_session_snapshot',
      'list_lotes',
      'list_documentos',
      'get_resumen_bodega',
      'list_etiquetas',
      'list_mensajes',
      'import_winemaker_ticket',
      'registrar_salida',
      'enviar_mensaje',
      'crear_lote',
      'registrar_embotellado',
      'cambiar_etapa_lote',
    ],
    distiller: [
      'get_session_snapshot',
      'list_corridas',
      'list_viajes',
      'list_lotes_distiller',
    ],
  }

  const allowed = new Set(namesByProfile[profileType])
  return [...READ_TOOLS, ...WRITE_TOOLS].filter(t => allowed.has(t.name))
}

export type ManualLink = { href: string; labelKey: string }

export function manualLinksForProfile(profileType: ProfileType): ManualLink[] {
  switch (profileType) {
    case 'distributor':
      return [
        { href: '/dashboard/pedidos/nuevo', labelKey: 'manual.newOrder' },
        { href: '/dashboard/recepcion', labelKey: 'manual.reception' },
        { href: '/dashboard/inventario', labelKey: 'manual.inventory' },
        { href: '/dashboard/credito', labelKey: 'manual.credit' },
      ]
    case 'winemaker':
      return [
        { href: '/dashboard/winemaker/documentos', labelKey: 'manual.documents' },
        { href: '/dashboard/winemaker/lotes', labelKey: 'manual.lots' },
        { href: '/dashboard/winemaker/bodega', labelKey: 'manual.cellarLabels' },
        { href: '/dashboard/winemaker/gastos', labelKey: 'manual.expenses' },
      ]
    case 'distiller':
      return [
        { href: '/dashboard/destilador/lotes', labelKey: 'manual.lots' },
        { href: '/dashboard/destilador/compras', labelKey: 'manual.purchases' },
        { href: '/dashboard/destilador/produccion', labelKey: 'manual.production' },
      ]
  }
}

export function examplePromptsForProfile(profileType: ProfileType): string[] {
  switch (profileType) {
    case 'distributor':
      return [
        'prompts.distributor.inventory',
        'prompts.distributor.orders',
        'prompts.distributor.credit',
      ]
    case 'winemaker':
      return [
        'prompts.winemaker.lots',
        'prompts.winemaker.summary',
        'prompts.winemaker.ticket',
        'prompts.winemaker.labels',
      ]
    case 'distiller':
      return ['prompts.distiller.runs', 'prompts.distiller.trips']
  }
}
