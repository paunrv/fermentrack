import { buildRemisionPdfBuffer } from '@/lib/proof/remision-pdf'
import { remisionStoragePath, signRemisionPdfUrl, uploadRemisionPdf } from '@/lib/proof/storage-remisiones'
import {
  fetchPedidoWithItems,
  type RemisionDistribuidorRow,
} from '@/lib/supabase/distribuidor'
import { createServiceSupabase } from '@/utils/supabase/service'

export type RemisionPdfResult = {
  remision: RemisionDistribuidorRow
  downloadUrl: string
}

async function fetchRemisionByPedido(
  sb: ReturnType<typeof createServiceSupabase>,
  pedidoId: string,
  userId: string
): Promise<RemisionDistribuidorRow | null> {
  const { data, error } = await sb
    .from('remisiones_distribuidor')
    .select('*')
    .eq('pedido_id', pedidoId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as RemisionDistribuidorRow | null) ?? null
}

async function ensureRemisionRow(
  sb: ReturnType<typeof createServiceSupabase>,
  pedidoId: string
): Promise<RemisionDistribuidorRow> {
  const { data, error } = await sb.rpc('crear_remision_distribuidor', {
    p_pedido_id: pedidoId,
  })
  if (error) throw error
  return data as RemisionDistribuidorRow
}

/** Crea fila de remisión (si falta) y genera/sube PDF. Idempotente si pdf_url ya existe. */
export async function ensureRemisionPdfForPedido(
  pedidoId: string,
  userId: string
): Promise<RemisionPdfResult> {
  const sb = createServiceSupabase()

  const pedido = await fetchPedidoWithItems(sb, pedidoId)
  if (!pedido) throw new Error('Pedido no encontrado')
  if (pedido.user_id !== userId) throw new Error('No autorizado')
  if (!['entregado', 'parcial'].includes(pedido.estado)) {
    throw new Error('Solo pedidos entregados pueden generar remisión')
  }

  let remision = await fetchRemisionByPedido(sb, pedidoId, userId)
  if (!remision) {
    remision = await ensureRemisionRow(sb, pedidoId)
  }

  const storagePath = remision.pdf_url?.trim() || remisionStoragePath(userId, remision.id)

  if (remision.pdf_url?.trim()) {
    try {
      const downloadUrl = await signRemisionPdfUrl(sb, storagePath)
      return { remision, downloadUrl }
    } catch {
      /* regenerar PDF si el archivo no existe */
    }
  }

  const etiqueta = pedido.etiqueta_nombre?.trim()
  const lineas = (pedido.items_pedido ?? []).map(it => ({
    producto: etiqueta ? `${it.nombre} · ${etiqueta}` : it.nombre,
    cantidad: it.cantidad,
    precioUnitario: Number(it.precio_unitario),
    subtotal: Number(it.subtotal),
  }))

  const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0)
  const total = Number(pedido.total) || subtotal

  const pdfBuffer = buildRemisionPdfBuffer({
    numeroRemision: remision.numero_remision,
    numeroPedido: pedido.numero,
    fechaEntrega: remision.fecha_entrega,
    clienteNombre: pedido.clients?.name ?? 'Cliente',
    clienteDireccion: pedido.clients?.address ?? null,
    lineas,
    subtotal,
    total,
    generadoEn: new Date(),
  })

  const { path, signedUrl } = await uploadRemisionPdf(sb, userId, remision.id, pdfBuffer)

  const { data: updated, error: upErr } = await sb
    .from('remisiones_distribuidor')
    .update({ pdf_url: path })
    .eq('id', remision.id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (upErr) throw upErr

  return {
    remision: updated as RemisionDistribuidorRow,
    downloadUrl: signedUrl,
  }
}

export async function getRemisionDownloadForPedido(
  pedidoId: string,
  userId: string
): Promise<{ remision: RemisionDistribuidorRow; downloadUrl: string } | null> {
  const sb = createServiceSupabase()
  const remision = await fetchRemisionByPedido(sb, pedidoId, userId)
  if (!remision?.pdf_url?.trim()) return null
  const downloadUrl = await signRemisionPdfUrl(sb, remision.pdf_url.trim())
  return { remision, downloadUrl }
}

export async function fetchRemisionResumenForPedido(
  pedidoId: string,
  userId: string
): Promise<RemisionDistribuidorRow | null> {
  const sb = createServiceSupabase()
  return fetchRemisionByPedido(sb, pedidoId, userId)
}
