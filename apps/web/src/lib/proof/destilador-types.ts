/** PROOF · Destilador (Mezcal) — domain types */

export type DestMembresia = 'basico' | 'profesional' | 'premium'

export type DestViajeEstado =
  | 'en_negociacion'
  | 'confirmado'
  | 'en_transito'
  | 'recibido'

export type DestLoteEstado =
  | 'en_bodega_crudo'
  | 'en_produccion'
  | 'terminado'
  | 'vendido_parcial'

export type DestFormatoBotella = '750ml' | '500ml' | '200ml'

export type DestPedidoEstado =
  | 'cotizacion'
  | 'confirmado'
  | 'entregado'
  | 'cobrado'
  | 'cancelado'

export interface ViajeRow {
  id: string
  clerk_id: string
  fecha: string
  region: string
  comunidad: string
  palenquero_nombre: string
  palenquero_contacto: string
  costo_flete: number
  estado: DestViajeEstado
  created_at: string
  updated_at: string
}

export interface ProductoViajeRow {
  id: string
  viaje_id: string
  tipo_agave: string
  litros_acordados: number
  precio_por_litro: number
  anticipo_pagado: number
  total_acordado: number
  saldo_pendiente: number
  litros_salida: number | null
  litros_recibidos: number | null
  merma_litros: number | null
  flete_proporcional: number | null
}

export interface LoteRow {
  id: string
  numero_lote: string
  viaje_id: string
  producto_viaje_id?: string
  tipo_agave: string
  maestro?: string
  comunidad?: string
  abv?: number | null
  litros_disponibles_granel: number
  litros_recibidos: number
  estado: DestLoteEstado
  bodega_id: string
  fecha_recepcion: string
  fecha_embotellado_programada?: string | null
  costo_real_por_botella?: number | null
  productos_viaje?: {
    precio_por_litro: number
    flete_proporcional: number | null
    litros_acordados: number
    saldo_pendiente?: number
    merma_litros?: number | null
  } | null
}

export type DestCorridaModo = 'equipo' | 'manual'
export type DestCorridaEstado = 'activa' | 'completada'

export interface CorridaRow {
  id: string
  lote_id: string
  bodega_id: string
  formato_botella: DestFormatoBotella
  litros_asignados: number
  modo: DestCorridaModo
  botellas_producidas: number
  botellas_defectuosas: number
  merma_litros?: number
  merma_porcentaje: number
  costo_corrida?: number | null
  costo_real_por_botella: number | null
  estado: DestCorridaEstado
  created_at: string
  lotes?: { numero_lote: string; tipo_agave: string } | null
}

export interface StockBotellaRow {
  formato: DestFormatoBotella
  cantidad_disponible: number
}

export interface StockEtiquetaRow {
  nombre: string
  tipo: string
  cantidad_disponible: number
}

export interface BodegaRow {
  id: string
  nombre: string
  es_embotellado: boolean
}

export interface CreateCorridaInput {
  lote_id: string
  bodega_id: string
  formato_botella: DestFormatoBotella
  litros_asignados: number
  modo: DestCorridaModo
  costo_corrida?: number
  personas?: number
  horas_estimadas?: number
  tarifa_hora?: number
}

export interface NuevoProductoViajeInput {
  tipo_agave: string
  litros_acordados: number
  precio_por_litro: number
  anticipo_pagado: number
}

export interface CreateViajeInput {
  fecha: string
  region: string
  comunidad: string
  palenquero_nombre: string
  palenquero_contacto: string
  costo_flete: number
  estado: DestViajeEstado
  productos: NuevoProductoViajeInput[]
}

export interface ConfirmarLlegadaLinea {
  producto_viaje_id: string
  litros_salida: number
  litros_recibidos: number
  abv?: number | null
}

export interface ConfirmarLlegadaResult {
  lote_id: string
  numero_lote: string
  producto_viaje_id: string
  tipo_agave: string
  litros_recibidos: number
  flete_proporcional: number
  merma_litros: number
}
