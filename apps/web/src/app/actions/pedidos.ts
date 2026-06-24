'use server'

import { getAuthUserId } from '@/lib/supabase/server'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'
import {
  createPedidoBorrador,
  rpcProofNextCodigo,
  type PedidoRow,
} from '@/lib/supabase/distribuidor'

export async function createPedidoDraftAction(input: {
  cliente_id: string
  etiqueta_id: string
  etiqueta_nombre: string
  fecha_entrega: string
  condicion_pago: string
  notas?: string | null
  profile_type_v2?: string
}): Promise<PedidoRow> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const profileType = input.profile_type_v2 || 'distributor'
  const { sb } = await createSupabaseForProofApi()

  const numero = await rpcProofNextCodigo(sb, userId, profileType, 'pedido')

  if (!input.etiqueta_id?.trim() || !input.etiqueta_nombre?.trim()) {
    throw new Error('La etiqueta o marca es obligatoria')
  }

  return createPedidoBorrador(sb, {
    numero,
    clients_id: input.cliente_id,
    etiqueta_id: input.etiqueta_id,
    etiqueta_nombre: input.etiqueta_nombre.trim(),
    fecha_entrega: input.fecha_entrega,
    condicion_pago: input.condicion_pago,
    notas: input.notas ?? null,
    clerk_id: userId,
    profile_type_v2: profileType,
  })
}
