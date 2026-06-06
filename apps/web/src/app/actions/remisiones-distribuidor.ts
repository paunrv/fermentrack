'use server'

import { auth } from '@clerk/nextjs/server'
import {
  ensureRemisionPdfForPedido,
  fetchRemisionResumenForPedido,
  getRemisionDownloadForPedido,
} from '@/lib/proof/remision-salida-server'

export async function generarRemisionPedidoAction(pedidoId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autenticado')
  const result = await ensureRemisionPdfForPedido(pedidoId, userId)
  return {
    numero: result.remision.numero_remision,
    downloadUrl: result.downloadUrl,
  }
}

export async function obtenerRemisionPedidoAction(pedidoId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autenticado')
  const remision = await fetchRemisionResumenForPedido(pedidoId, userId)
  if (!remision) return null
  let downloadUrl: string | null = null
  if (remision.pdf_url?.trim()) {
    try {
      const signed = await getRemisionDownloadForPedido(pedidoId, userId)
      downloadUrl = signed?.downloadUrl ?? null
    } catch {
      downloadUrl = null
    }
  }
  return {
    id: remision.id,
    numero: remision.numero_remision,
    hasPdf: Boolean(remision.pdf_url?.trim()),
    downloadUrl,
  }
}
