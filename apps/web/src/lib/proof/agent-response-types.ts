export type DisplayCardsType =
  | 'inventory'
  | 'clients'
  | 'providers'
  | 'orders'
  | 'receivables'
  | 'low_stock'

export type CardItemStatus = 'ok' | 'warning' | 'danger' | 'neutral'

export type CardItem = {
  id: string
  name: string
  subtitle?: string
  status?: CardItemStatus
  primaryValue?: { label: string; value: string | number }
  secondaryValues?: { label: string; value: string | number }[]
  actions?: { label: string; prompt: string }[]
  /** Solo dev/evaluación: muestra tachita para quitar tarjeta del canvas */
  devDeletable?: boolean
}

export type DisplayCards = {
  type: DisplayCardsType
  title: string
  items: CardItem[]
}

export type AgentResponse = {
  chatResponse: string
  displayCards: DisplayCards | null
}

export function cardActionsForType(
  type: DisplayCardsType,
  itemName: string
): CardItem['actions'] {
  switch (type) {
    case 'inventory':
    case 'low_stock':
      return [
        {
          label: 'Crear orden de compra',
          prompt: `comprar 24 cajas de ${itemName}`,
        },
        {
          label: 'Ver detalle',
          prompt: `muéstrame el detalle de ${itemName}`,
        },
      ]
    case 'orders':
      return [
        {
          label: 'Marcar preparando',
          prompt: `marcar pedido ${itemName} como preparando`,
        },
        {
          label: 'Marcar en ruta',
          prompt: `marcar pedido ${itemName} en ruta`,
        },
        {
          label: 'Marcar entregado',
          prompt: `marcar pedido ${itemName} como entregado`,
        },
        {
          label: 'Ver detalle',
          prompt: `muéstrame el detalle del pedido ${itemName}`,
        },
      ]
    case 'receivables':
      return [
        {
          label: 'Enviar recordatorio',
          prompt: `envía un recordatorio de cobro a ${itemName}`,
        },
        {
          label: 'Registrar pago',
          prompt: `registra un pago de ${itemName}`,
        },
      ]
    case 'clients':
      return [
        {
          label: 'Ver historial',
          prompt: `muéstrame el historial de ${itemName}`,
        },
        {
          label: 'Nuevo pedido',
          prompt: `quiero registrar un nuevo pedido para ${itemName}`,
        },
      ]
    case 'providers':
      return [
        {
          label: 'Confirmar llegada',
          prompt: `confirmar llegada de mercancía de ${itemName}`,
        },
        {
          label: 'Registrar pago',
          prompt: `registrar pago a proveedor ${itemName}`,
        },
        {
          label: 'Nueva OC',
          prompt: `comprar productos a ${itemName}`,
        },
      ]
  }
}

export function skuStatusToCard(estado: string): CardItemStatus {
  switch (estado) {
    case 'bajo':
    case 'muerto':
      return 'warning'
    case 'quiebre':
    case 'sobrevendido':
      return 'danger'
    case 'sano':
    case 'en_transito':
    case 'consignacion':
      return 'ok'
    default:
      return 'neutral'
  }
}
