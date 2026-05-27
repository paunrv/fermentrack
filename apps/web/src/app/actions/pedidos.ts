'use server'

import { auth } from '@clerk/nextjs/server'
import { createServiceSupabase } from '@/utils/supabase/service'
import {
  createPedidoBorrador,
  rpcProofNextCodigo,
  type PedidoRow,
} from '@/lib/supabase/distribuidor'

export async function createPedidoDraftAction(input: {
  cliente_id: string
  fecha_entrega: string
  condicion_pago: string
  notas?: string | null
  profile_type_v2?: string
}): Promise<PedidoRow> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autenticado')

  const profileType = input.profile_type_v2 || 'distributor'
  const sb = createServiceSupabase()

  const numero = await rpcProofNextCodigo(sb, userId, profileType, 'pedido')

  return createPedidoBorrador(sb, {
    numero,
    cliente_id: input.cliente_id,
    fecha_entrega: input.fecha_entrega,
    condicion_pago: input.condicion_pago,
    notas: input.notas ?? null,
    clerk_id: userId,
    profile_type_v2: profileType,
  })
}
