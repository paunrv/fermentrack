/** PROOF · Distribuidor — domain types (spec v1.0) */

export type CategoriaSKU =
  | 'tequila'
  | 'vino'
  | 'mezcal'
  | 'cerveza'
  | 'destilado'
  | 'gin'
  | 'otro'

export type CategoriaLiquido =
  | 'cerveza'
  | 'vino'
  | 'mezcal'
  | 'gin'
  | 'destilado'
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
  categoriaLiquido: CategoriaLiquido
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

export type RolTrabajador = 'patron' | 'manager' | 'bodega'

export interface Trabajador {
  id: string
  clerkUserId: string
  nombre: string
  rol: RolTrabajador
  clerkId: string
  profileTypeV2: string
  patronClerkId: string
  activo: boolean
  createdAt: Date
}

export interface Cliente {
  id: string
  nombre: string
  telefono?: string | null
  email?: string | null
  diasCredito: number
  notas?: string | null
  activo?: boolean
  clerkId: string
  profileTypeV2?: string
  createdAt?: Date
}

export type EstadoPago = 'pendiente' | 'pagado' | 'vencido' | 'pago_parcial'

export interface Pago {
  id: string
  clienteId: string
  monto: number
  fechaPago: Date
  fechaVencimiento: Date | null
  estado: EstadoPago
  referencia?: string | null
  bancoOrigen?: string | null
  bancoDestino?: string | null
  imagenComprobanteUrl?: string | null
  clerkId: string
  profileTypeV2: string
  createdAt: Date
}

export interface PagoPedido {
  id: string
  pagoId: string
  pedidoId: string
  montoAplicado: number
}

export type EstadoCajaDistribuidor = 'en_bodega' | 'en_camino' | 'entregado'

export interface CajaDistribuidor {
  id: string
  qrCode: string
  skuId: string
  ocId: string | null
  estado: EstadoCajaDistribuidor
  clerkId: string
  profileTypeV2: string
  createdAt: Date
}

export type TipoEventoCaja = 'recepcion' | 'salida_bodega' | 'entrega'

export interface EventoCaja {
  id: string
  cajaId: string
  tipo: TipoEventoCaja
  trabajadorId: string
  pedidoId: string | null
  createdAt: Date
}

export type TipoMovimientoStock = 'venta' | 'compra' | 'ajuste' | 'cancelacion'

export interface MovimientoStock {
  id: string
  skuId: string
  tipo: TipoMovimientoStock
  /** Entero con signo: positivo = entrada · negativo = salida */
  cantidad: number
  pedidoId: string | null
  ocId: string | null
  trabajadorId: string | null
  clerkId: string
  profileTypeV2: string
  timestamp: Date
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
  /** Nueva cartera · tabla `clientes` (nullable hasta cutover) */
  clienteId?: string | null
  items: ItemPedido[]
  fechaCreacion: Date
  fechaEntrega: Date
  condicionPago: string
  estado: EstadoPedido
  total: number
  ticketExportado: boolean
  notas?: string
  nota?: string
  imagenOrigenUrl?: string
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
