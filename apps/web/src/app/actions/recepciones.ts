'use server'

import { getAuthUserId } from '@/lib/supabase/server'
import { createServiceSupabase } from '@/utils/supabase/service'
import {
  clearRecepcionLineItems,
  createRecepcionDraft,
  insertDiscrepancias,
  insertItemsRecepcion,
  rpcProofNextCodigo,
  updateRecepcionDraft,
  type RecepcionRow,
  type TipoDiscrepancia,
} from '@/lib/supabase/distribuidor'

type RecepcionItemsInput = Array<{
  sku_id: string | null
  cantidad_esperada: number
  cantidad_recibida: number
  lote: string
  condicion: 'ok' | 'roto' | 'incompleto'
}>

type RecepcionDiscInput = Array<{
  sku_id: string | null
  tipo: TipoDiscrepancia
  descripcion: string
  cantidad_afectada: number
}>

export async function createRecepcionFromAnalysisAction(input: {
  recepcion_id?: string | null
  productor: string
  bodega_destino?: string
  orden_compra_id?: string | null
  orden_compra_distribuidor_id?: string | null
  costo_total?: number
  deuda_registrada?: number
  foto_urls?: string[]
  items: RecepcionItemsInput
  discrepancias: RecepcionDiscInput
  profile_type_v2?: string
}): Promise<RecepcionRow> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const profileType = input.profile_type_v2 || 'distributor'
  const sb = createServiceSupabase()

  let rec: RecepcionRow

  if (input.recepcion_id) {
    rec = await updateRecepcionDraft(sb, input.recepcion_id, {
      productor: input.productor,
      orden_compra_id: input.orden_compra_id,
      orden_compra_distribuidor_id: input.orden_compra_distribuidor_id,
      costo_total: input.costo_total,
      deuda_registrada: input.deuda_registrada,
      ...(input.foto_urls?.length ? { foto_urls: input.foto_urls } : {}),
    })
    await clearRecepcionLineItems(sb, rec.id)
  } else {
    const codigo = await rpcProofNextCodigo(sb, userId, profileType, 'recepcion')
    rec = await createRecepcionDraft(sb, {
      codigo,
      productor: input.productor,
      bodega_destino: input.bodega_destino,
      orden_compra_id: input.orden_compra_id,
      orden_compra_distribuidor_id: input.orden_compra_distribuidor_id,
      costo_total: input.costo_total,
      deuda_registrada: input.deuda_registrada,
      foto_urls: input.foto_urls,
      user_id: userId,
      profile_type_v2: profileType,
    })
  }

  await insertItemsRecepcion(
    sb,
    input.items.map(it => ({
      recepcion_id: rec.id,
      sku_id: it.sku_id,
      cantidad_esperada: it.cantidad_esperada,
      cantidad_recibida: it.cantidad_recibida,
      lote: it.lote,
      condicion: it.condicion,
    }))
  )

  await insertDiscrepancias(
    sb,
    input.discrepancias.map(d => ({
      recepcion_id: rec.id,
      sku_id: d.sku_id,
      tipo: d.tipo,
      descripcion: d.descripcion,
      cantidad_afectada: d.cantidad_afectada,
    }))
  )

  return rec
}

/** Refresca URLs firmadas de evidencia (bucket privado recepciones). */
export async function refreshRecepcionFotoUrlsAction(recepcionId: string): Promise<string[]> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const sb = createServiceSupabase()
  const { data, error } = await sb
    .from('recepciones')
    .select('foto_urls, user_id')
    .eq('id', recepcionId)
    .maybeSingle()
  if (error) throw error
  if (!data || data.user_id !== userId) throw new Error('Recepción no encontrada')

  const { signRecepcionFotoPaths } = await import('@/lib/proof/storage-recepciones')
  return signRecepcionFotoPaths(sb, (data.foto_urls as string[]) || [])
}
