export const PROOF_CANVAS_CONTENT_WIDTH = 720
/** Altura máxima del hilo de chat activo (panel sobre el composer). */
export const PROOF_CHAT_MAX_HEIGHT = 320

export type ProofModeAction = {
  label: string
  message: string
  description: string
  /** Abre sub-selector de compra (OC) sin enviar mensaje */
  compraHub?: boolean
  /** Abre sub-selector de venta (pedidos) sin enviar mensaje */
  ventaHub?: boolean
  /** Abre sub-selector de bodega sin enviar mensaje */
  bodegaHub?: boolean
  /** Winemaker: tickets y documentos */
  ticketHub?: boolean
  /** Winemaker: estado de bodega (lotes, litros, gastos) */
  wmBodegaHub?: boolean
  /** Winemaker: agenda y tiempos (barrica, embotellado) */
  agendaHub?: boolean
}

export type ProofHubLensAction = {
  id: string
  label: string
  description: string
  message: string
  /** Abre selector de archivo (foto/PDF de ticket) */
  pickTicketFile?: boolean
  /** Navega a ruta del dashboard sin pasar por el agente */
  href?: string
}

/** @deprecated alias — usar ProofHubLensAction */
export type ProofBodegaLensAction = ProofHubLensAction & {
  id: 'fisica' | 'ingreso' | 'pagar'
}

export type ProofSubHub =
  | 'compra'
  | 'venta'
  | 'bodega'
  | 'wm_ticket'
  | 'wm_bodega'
  | 'wm_agenda'

export const PROOF_COPIES = {
  placeholder: 'Pregúntale a PROOF…',
  welcome: {
    distributor: 'Hola, soy PROOF. ¿Qué necesitas hacer hoy?',
    distiller:
      'Hola, soy PROOF. Puedo ayudarte con tu bodega, lotes, corrida y producción. ¿Qué necesitas?',
    winemaker:
      'Hola, soy PROOF. Elige un modo — ticket, bodega o agenda — o escribe tu pregunta.',
  },
  hint: {
    distributor: 'O escribe tu pregunta en el campo de abajo.',
    distiller:
      'Pídele a PROOF que te muestre tu bodega, lotes activos o viajes pendientes.',
    winemaker: 'Sube tickets, consulta bodega o revisa tiempos en la agenda.',
  },
  errors: {
    timeout: 'PROOF tardó demasiado. Intenta de nuevo.',
    noResponse: 'PROOF no respondió. Intenta de nuevo o elige un modo para empezar.',
    general: 'PROOF no pudo procesar tu solicitud. Intenta de nuevo.',
    emptyResults: 'No encontré resultados para esa búsqueda.',
  },
} as const

export const DISTRIBUTOR_MODE_ACTIONS: ProofModeAction[] = [
  {
    label: 'Comprar a proveedor',
    description: 'Orden de compra, seguimiento e ingreso a bodega',
    message: '',
    compraHub: true,
  },
  {
    label: 'Vender a cliente',
    description: 'Nuevo pedido, entrega y cobro',
    message: '',
    ventaHub: true,
  },
  {
    label: 'Estado de bodega',
    description: 'Stock, ingresos pendientes y pagos',
    message: '',
    bodegaHub: true,
  },
]

export const DISTRIBUTOR_COMPRA_LENS_ACTIONS: ProofHubLensAction[] = [
  {
    id: 'nueva',
    label: 'Nueva orden',
    description: 'Crear OC con cantidad, producto y proveedor',
    message: 'quiero crear una orden de compra',
  },
  {
    id: 'en_curso',
    label: 'Órdenes en curso',
    description: 'Estado de compras aún no cerradas',
    message: 'muéstrame mis órdenes de compra pendientes',
  },
  {
    id: 'ultima',
    label: 'Última ingresada',
    description: 'Última recepción confirmada en bodega',
    message: 'cuál fue la última orden de compra ingresada a bodega',
  },
  {
    id: 'pagar',
    label: 'Pagos pendientes',
    description: 'Saldo por pagar a proveedores',
    message: 'muéstrame cuentas por pagar a proveedores',
  },
]

export const DISTRIBUTOR_VENTA_LENS_ACTIONS: ProofHubLensAction[] = [
  {
    id: 'nuevo',
    label: 'Nuevo pedido',
    description: 'Cantidad, producto y cliente',
    message: 'quiero registrar un nuevo pedido',
  },
  {
    id: 'en_curso',
    label: 'Pedidos en curso',
    description: 'Confirmados, preparando o en ruta',
    message: 'muéstrame mis pedidos pendientes de entrega',
  },
  {
    id: 'cobrar',
    label: 'Por cobrar',
    description: 'Saldos pendientes de clientes',
    message: 'muéstrame cuentas por cobrar de clientes',
  },
]

export const DISTRIBUTOR_BODEGA_LENS_ACTIONS: ProofBodegaLensAction[] = [
  {
    id: 'fisica',
    label: 'En bodega',
    description: 'Unidades que ya puedes vender',
    message: 'muéstrame stock en bodega',
  },
  {
    id: 'ingreso',
    label: 'Pendiente de ingreso',
    description: 'Compras ordenadas sin recibir',
    message: 'muéstrame compras pendientes de ingreso',
  },
  {
    id: 'pagar',
    label: 'Por pagar',
    description: 'Deuda con proveedores',
    message: 'muéstrame cuentas por pagar a proveedores',
  },
]

export const WINEMAKER_MODE_ACTIONS: ProofModeAction[] = [
  {
    label: 'Subir ticket',
    description: 'Foto o PDF de compra, factura o gasto de bodega',
    message: '',
    ticketHub: true,
  },
  {
    label: 'Consultar bodega',
    description: 'Lotes activos, litros en proceso y gastos',
    message: '',
    wmBodegaHub: true,
  },
  {
    label: 'Revisar agenda',
    description: 'Tiempos de barrica, embotellado y pendientes',
    message: '',
    agendaHub: true,
  },
]

export const WINEMAKER_TICKET_LENS_ACTIONS: ProofHubLensAction[] = [
  {
    id: 'subir',
    label: 'Subir foto o PDF',
    description: 'Ticket de insumo, factura o nota de gasto',
    message: 'quiero subir un ticket de compra',
    pickTicketFile: true,
  },
  {
    id: 'recientes',
    label: 'Documentos recientes',
    description: 'Últimos tickets y facturas guardados',
    message: 'muéstrame mis documentos y tickets recientes',
  },
  {
    id: 'sin_lote',
    label: 'Gastos sin lote',
    description: 'Compras de bodega aún sin asignar a un lote',
    message: 'muéstrame gastos de bodega sin lote asignado',
  },
  {
    id: 'manual',
    label: 'Registrar gasto',
    description: 'Monto y categoría por chat',
    message: 'quiero registrar un gasto manual con monto y categoría',
  },
]

export const WINEMAKER_BODEGA_LENS_ACTIONS: ProofHubLensAction[] = [
  {
    id: 'activos',
    label: 'Lotes activos',
    description: 'Fermentación, barrica y listos',
    message: 'muéstrame mis lotes de vino activos',
  },
  {
    id: 'litros',
    label: 'Litros en proceso',
    description: 'Volumen total en bodega',
    message: '¿cuántos litros de vino tengo en proceso?',
  },
  {
    id: 'gastos_mes',
    label: 'Gastos del mes',
    description: 'Costos de lote y bodega',
    message: '¿cuánto he gastado este mes en la bodega?',
  },
  {
    id: 'resumen',
    label: 'Resumen general',
    description: 'Panorama rápido de la operación',
    message: '¿cómo voy en la bodega?',
  },
]

export const WINEMAKER_AGENDA_LENS_ACTIONS: ProofHubLensAction[] = [
  {
    id: 'semana',
    label: 'Esta semana',
    description: 'Pendientes y hitos próximos',
    message: '¿qué tengo pendiente esta semana en la bodega?',
  },
  {
    id: 'barrica',
    label: 'En barrica',
    description: 'Lotes en envejecimiento',
    message: 'muéstrame lotes en envejecimiento o barrica',
  },
  {
    id: 'embotellar',
    label: 'Listos para embotellar',
    description: 'Lotes que podrían salir pronto',
    message: '¿qué lotes están listos para embotellar pronto?',
  },
  {
    id: 'calendario',
    label: 'Ver calendario',
    description: 'Vista mensual de tiempos y eventos',
    message: '',
    href: '/dashboard/winemaker/agenda',
  },
]

/** Resuelve acciones de sub-hub para canvas (distribuidor + winemaker). */
export function lensActionsForSubHub(
  hub: ProofSubHub | null | undefined,
  lenses: {
    compra?: ProofHubLensAction[]
    venta?: ProofHubLensAction[]
    bodega?: ProofHubLensAction[]
    wm_ticket?: ProofHubLensAction[]
    wm_bodega?: ProofHubLensAction[]
    wm_agenda?: ProofHubLensAction[]
  }
): ProofHubLensAction[] | undefined {
  if (!hub) return undefined
  return lenses[hub]
}

export function subHubForModeAction(action: ProofModeAction): ProofSubHub | null {
  if (action.compraHub) return 'compra'
  if (action.ventaHub) return 'venta'
  if (action.bodegaHub) return 'bodega'
  if (action.ticketHub) return 'wm_ticket'
  if (action.wmBodegaHub) return 'wm_bodega'
  if (action.agendaHub) return 'wm_agenda'
  return null
}

export const WINEMAKER_QUICK_ACTIONS = [
  { label: 'Resumen de bodega', message: '¿Cómo voy en la bodega?' },
  { label: 'Gastos del mes', message: '¿Cuánto he gastado este mes?' },
  { label: 'Mis documentos', message: '¿Cuántos tickets y facturas tengo guardados?' },
  { label: 'Lotes activos', message: '¿Qué lotes de vino tengo activos?' },
] as const

export const DISTILLER_QUICK_ACTIONS = [
  { label: '¿Cuánto stock terminado?', message: '¿Cuánto stock terminado tengo?' },
  { label: 'Lotes listos para embotellar', message: '¿Qué lotes están listos para embotellar?' },
  { label: 'Deuda palenqueros', message: '¿Cuánto debo a palenqueros?' },
  { label: '+ Nuevo viaje', message: 'Quiero registrar un nuevo viaje a Oaxaca' },
] as const
