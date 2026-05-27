/** PROOF · Distribuidor — domain types (spec v1.0) */

export type CategoriaSKU =
  | 'tequila'
  | 'vino'
  | 'mezcal'
  | 'cerveza'
  | 'destilado'
  | 'gin'
  | 'otro'

export type EstadoSKU =
  | 'sano'
  | 'bajo'
  | 'quiebre'
  | 'muerto'
  | 'en_transito'
  | 'consignacion'
  | 'sobrevendido'

export type Rotacion30d = 'muy_alta' | 'alta' | 'media' | 'baja' | 'ninguna'

export interface SKU {
  id: string
  nombre: string
  productor: string
  categoria: CategoriaSKU
  bodega: string
  stockTotal: number
  stockReservado: number
  stockDisponible: number
  stockMinimo: number
  costoUnitario: number
  precioVenta: number
  margenPorcentaje: number
  lote: string
  diasSinMovimiento: number
  rotacion30d: Rotacion30d
  deudaAsociada: number
  estado: EstadoSKU
  ultimoMovimiento: Date | null
  pedidosReservados?: number
  /** Catálogo legacy dist_products (enlace detalle) */
  distProductId?: string | null
}

export type EstadoPedido =
  | 'borrador'
  | 'confirmado'
  | 'preparando'
  | 'en_ruta'
  | 'entregado'
  | 'parcial'
  | 'cancelado'

export interface Cliente {
  id: string
  nombre: string
  telefono?: string
  email?: string
}

export interface ItemPedido {
  skuId: string
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  disponibleAlMomentoDeCrear: number
}

export interface Pedido {
  id: string
  cliente: Cliente
  items: ItemPedido[]
  fechaCreacion: Date
  fechaEntrega: Date
  condicionPago: string
  estado: EstadoPedido
  total: number
  ticketExportado: boolean
  notas?: string
}

export type NivelAlerta = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6'

export type CondicionAlerta =
  | 'quiebre_inminente'
  | 'sobrevendido'
  | 'deuda_productores_vencida'
  | 'cliente_sin_pagar'
  | 'pedido_incompleto_hoy'
  | 'sku_sin_rotar'
  | 'sin_alertas'

export interface AlertaOperativa {
  id: string
  nivel: NivelAlerta
  condicion: CondicionAlerta
  titulo: string
  subtexto: string
  color: 'rojo' | 'amarillo' | 'pasivo' | 'verde'
  acciones?: { label: string; href?: string; onClick?: () => void }[]
}

export type InicioEstado = 'vacio' | 'activo' | 'crisis' | 'tranquilo'
