import { z } from 'zod'

export const recepcionItemSchema = z.object({
  sku_id: z.string().uuid().nullable().optional(),
  cantidad_esperada: z.number().nonnegative(),
  cantidad_recibida: z.number().nonnegative(),
  lote: z.string().min(1),
  condicion: z.enum(['ok', 'roto', 'incompleto']),
})

export const recepcionDiscrepanciaSchema = z.object({
  sku_id: z.string().uuid().nullable().optional(),
  tipo: z.enum(['faltante', 'lote_diferente', 'roto', 'sku_incorrecto', 'excedente']),
  descripcion: z.string().min(1),
  cantidad_afectada: z.number().nonnegative(),
})

export const recepcionDraftSchema = z.object({
  productor: z.string().min(1),
  bodega_destino: z.string().optional(),
  orden_compra_distribuidor_id: z.string().uuid().nullable().optional(),
  orden_compra_id: z.string().uuid().nullable().optional(),
  costo_total: z.number().nonnegative().optional(),
  deuda_registrada: z.number().nonnegative().optional(),
  foto_urls: z.array(z.string().url()).optional(),
  items: z.array(recepcionItemSchema).min(1, 'At least one line item is required'),
  discrepancias: z.array(recepcionDiscrepanciaSchema).optional().default([]),
  recepcion_id: z.string().uuid().optional(),
})

export type RecepcionDraftInput = z.infer<typeof recepcionDraftSchema>
