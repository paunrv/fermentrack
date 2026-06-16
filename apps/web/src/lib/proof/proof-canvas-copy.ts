export const PROOF_CANVAS_CONTENT_WIDTH = 720

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
}

export type ProofHubLensAction = {
  id: string
  label: string
  description: string
  message: string
}

/** @deprecated alias — usar ProofHubLensAction */
export type ProofBodegaLensAction = ProofHubLensAction & {
  id: 'fisica' | 'ingreso' | 'pagar'
}

export type ProofSubHub = 'compra' | 'venta' | 'bodega'

export const PROOF_COPIES = {
  placeholder: 'Pregúntale a PROOF…',
  welcome: {
    distributor: 'Hola, soy PROOF. ¿Qué necesitas hacer hoy?',
    distiller:
      'Hola, soy PROOF. Puedo ayudarte con tu bodega, lotes, corrida y producción. ¿Qué necesitas?',
  },
  hint: {
    distributor: 'O escribe tu pregunta en el campo de abajo.',
    distiller:
      'Pídele a PROOF que te muestre tu bodega, lotes activos o viajes pendientes.',
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

export const DISTILLER_QUICK_ACTIONS = [
  { label: '¿Cuánto stock terminado?', message: '¿Cuánto stock terminado tengo?' },
  { label: 'Lotes listos para embotellar', message: '¿Qué lotes están listos para embotellar?' },
  { label: 'Deuda palenqueros', message: '¿Cuánto debo a palenqueros?' },
  { label: '+ Nuevo viaje', message: 'Quiero registrar un nuevo viaje a Oaxaca' },
] as const
