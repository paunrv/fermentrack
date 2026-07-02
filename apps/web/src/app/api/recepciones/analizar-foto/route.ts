import { NextRequest } from 'next/server'
import { requireClerkUserId } from '@/lib/proof/auth-api'
import { getAgentApiMessages } from '@/lib/i18n/agent-messages-server'
import { getLocaleFromRequest } from '@/lib/i18n/request-locale'
import type { AppLocale } from '@/i18n/routing'
import {
  itemsFromExpectedOc,
  type ExpectedOcItem,
} from '@/lib/proof/recepcion-analysis'
import {
  itemsOrdenDistribuidorToExpected,
  parseOcRecepcionValue,
  type OcRecepcionSource,
} from '@/lib/proof/recepcion-oc'
import { appendRecepcionFotoUrl, uploadRecepcionFoto } from '@/lib/proof/storage-recepciones'
import { createSseStream } from '@/lib/proof/sse'
import { createServiceSupabase } from '@/utils/supabase/service'
import {
  createRecepcionDraft,
  fetchOrdenCompraDistribuidorWithItems,
  fetchOrdenCompraWithItems,
  fetchSkus,
  itemsOrdenToExpected,
  rpcProofNextCodigo,
} from '@/lib/supabase/distribuidor'
import type { ExtraProfile } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

type Body = {
  imagenBase64: string
  mediaType?: string
  ordenCompraId?: string
  ordenCompraSource?: OcRecepcionSource
  productorId?: string
  recepcionId?: string
  profile_type_v2?: string
  locale?: AppLocale
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body
  const locale = getLocaleFromRequest(req, body.locale)
  const api = await getAgentApiMessages(locale)
  const userId = await requireClerkUserId()
  if (!userId) {
    return new Response(JSON.stringify({ error: api.unauthenticated }), { status: 401 })
  }

  if (!body.imagenBase64?.trim()) {
    return new Response(JSON.stringify({ error: 'imagenBase64 requerida' }), { status: 400 })
  }

  const profileType = (body.profile_type_v2 || 'distributor') as ExtraProfile
  const sb = createServiceSupabase()
  const skus = await fetchSkus(sb, { user_id: userId, profile_type_v2: profileType })

  let expectedItems: ExpectedOcItem[] | undefined
  let productorNombre = body.productorId?.trim() || 'Pendiente'
  let ordenCompraLegacyId: string | null = null
  let ordenCompraDistribuidorId: string | null = null

  if (body.ordenCompraId) {
    const source =
      body.ordenCompraSource ??
      parseOcRecepcionValue(body.ordenCompraId)?.source ??
      'legacy'
    const ordenId = parseOcRecepcionValue(body.ordenCompraId)?.id ?? body.ordenCompraId

    if (source === 'distribuidor') {
      ordenCompraDistribuidorId = ordenId
      const oc = await fetchOrdenCompraDistribuidorWithItems(sb, ordenId)
      if (oc) {
        expectedItems = itemsOrdenDistribuidorToExpected(oc.items_orden_compra_distribuidor ?? [])
        if (oc.proveedor_nombre) productorNombre = oc.proveedor_nombre
      }
    } else {
      ordenCompraLegacyId = ordenId
      const oc = await fetchOrdenCompraWithItems(sb, ordenId)
      if (oc) {
        expectedItems = itemsOrdenToExpected(oc.items_orden_compra || [])
        if (oc.productor_id) productorNombre = oc.productor_id
      }
    }
  }

  let recepcionId = body.recepcionId
  let fotoUrls: string[] = []

  if (!recepcionId) {
    const codigo = await rpcProofNextCodigo(sb, userId, profileType, 'recepcion')
    const draft = await createRecepcionDraft(sb, {
      codigo,
      productor: productorNombre,
      orden_compra_id: ordenCompraLegacyId,
      orden_compra_distribuidor_id: ordenCompraDistribuidorId,
      user_id: userId,
      profile_type_v2: profileType,
    })
    recepcionId = draft.id
    fotoUrls = draft.foto_urls || []
  } else {
    const { data: existing } = await sb
      .from('recepciones')
      .select('foto_urls, productor')
      .eq('id', recepcionId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Recepción no encontrada' }), { status: 404 })
    }
    fotoUrls = (existing.foto_urls as string[]) || []
    if (existing.productor && existing.productor !== 'Pendiente') {
      productorNombre = existing.productor
    }
  }

  const rawB64 = body.imagenBase64.replace(/^data:[^;]+;base64,/, '')
  const imageBuffer = Buffer.from(rawB64, 'base64')
  const mediaType = body.mediaType || 'image/jpeg'

  const { signedUrl } = await uploadRecepcionFoto(sb, userId, recepcionId!, imageBuffer, mediaType)
  await appendRecepcionFotoUrl(sb, recepcionId!, signedUrl, fotoUrls)
  fotoUrls = [...fotoUrls, signedUrl]

  if (body.ordenCompraId) {
    await sb
      .from('recepciones')
      .update({
        orden_compra_id: ordenCompraLegacyId,
        orden_compra_distribuidor_id: ordenCompraDistribuidorId,
        productor: productorNombre,
      })
      .eq('id', recepcionId)
  }

  const { stream, send, close } = createSseStream()

  void (async () => {
    try {
      send('progress', { label: 'Foto guardada en evidencia' })
      await sleep(200)

      if (expectedItems?.length) {
        send('progress', { label: 'Ítems cargados desde la orden de compra' })
        const enriched = itemsFromExpectedOc(expectedItems, skus)
        for (let i = 0; i < enriched.length; i++) {
          send('item', { index: i, item: enriched[i] })
          await sleep(80)
        }
        send('done', {
          recepcionId,
          fotoUrls,
          productorDetectado: productorNombre,
          items: enriched,
        })
      } else {
        send('progress', {
          label:
            'Visión automática desactivada — conecta tu agente MCP en el dashboard o captura cantidades manualmente',
        })
        send('done', {
          recepcionId,
          fotoUrls,
          productorDetectado: productorNombre,
          items: [],
        })
      }
    } catch (e) {
      send('error', {
        message: e instanceof Error ? e.message : 'Error al preparar recepción',
      })
    } finally {
      close()
    }
  })()

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
