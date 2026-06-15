export const PROOF_COPIES = {
  placeholder: 'Pregúntale a PROOF…',
  welcome: {
    distributor:
      'Hola, soy PROOF. Puedo ayudarte con tu inventario, pedidos, cobros y más. ¿Qué necesitas?',
    distiller:
      'Hola, soy PROOF. Puedo ayudarte con tu bodega, lotes, corrida y producción. ¿Qué necesitas?',
  },
  hint: {
    distributor:
      'Pídele a PROOF que te muestre tu inventario, pedidos pendientes o cuentas por cobrar.',
    distiller:
      'Pídele a PROOF que te muestre tu bodega, lotes activos o viajes pendientes.',
  },
  errors: {
    timeout: 'PROOF tardó demasiado. Intenta de nuevo.',
    noResponse: 'PROOF no respondió. Intenta de nuevo o usa los accesos rápidos.',
    general: 'PROOF no pudo procesar tu solicitud. Intenta de nuevo.',
    emptyResults: 'No encontré resultados para esa búsqueda.',
  },
} as const

export const DISTRIBUTOR_QUICK_ACTIONS = [
  { label: 'Stock bajo', message: 'muéstrame el stock bajo' },
  { label: 'Pedidos pendientes', message: 'muéstrame los pedidos pendientes' },
  { label: 'Por cobrar', message: 'muéstrame las cuentas por cobrar' },
  { label: 'Deuda vencida', message: 'muéstrame la deuda vencida' },
  { label: '+ Orden de compra', message: 'comprar 24 cajas de cerveza a mi proveedor' },
  { label: '+ Nuevo pedido', message: 'quiero registrar un nuevo pedido' },
] as const

export const DISTILLER_QUICK_ACTIONS = [
  { label: '¿Cuánto stock terminado?', message: '¿Cuánto stock terminado tengo?' },
  { label: 'Lotes listos para embotellar', message: '¿Qué lotes están listos para embotellar?' },
  { label: 'Deuda palenqueros', message: '¿Cuánto debo a palenqueros?' },
  { label: '+ Nuevo viaje', message: 'Quiero registrar un nuevo viaje a Oaxaca' },
] as const
