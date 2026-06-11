import { NextRequest } from 'next/server'
import { requireClerkUserId } from '@/lib/proof/auth-api'
import {
  executeIntent,
  parseIntent,
  quickAnswer,
  type DistillerIntentContext,
} from '@/lib/proof/agent-intent-parser'
import {
  type AgentContextHints,
  type AgentProfileType,
  fetchLotesForAgent,
  loadDistributorAgentContext,
  loadIsolatedAgentContext,
} from '@/lib/proof/agent-context-server'
import { buildDistillerAgentContext } from '@/lib/proof/distiller-agent-context'
import { narrowDistributorContextForQuery } from '@/lib/proof/toma-pedido-intent'
import { proofErrorMessage } from '@/lib/proof/proof-error'
import {
  PROOF_AI_DESTILADOR,
  PROOF_AI_SYSTEM,
  proofAgentIsolationClause,
} from '@/lib/proof/prompts'
import { createSseStream } from '@/lib/proof/sse'
import { fetchProductosViaje, fetchViajes } from '@/lib/supabase/destilador'
import { resolveDistribuidorScope } from '@/lib/supabase/distribuidor'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

type Body = {
  pantalla: string
  vista?: string
  profileType: AgentProfileType
  hints?: AgentContextHints
  contexto?: Record<string, unknown>
}

function parseProfileType(raw: unknown): AgentProfileType | null {
  if (raw === 'distiller' || raw === 'distributor') return raw
  return null
}

function sendQuickDone(
  send: (event: string, data: unknown) => void,
  quick: { mensaje: string; accionLabel: string; accionHref: string },
  refresh: {
    refreshLoteId?: string | null
    refreshPedidoId?: string | null
  }
) {
  send('done', {
    mensaje: quick.mensaje.replace(/\*\*/g, ''),
    accionLabel: quick.accionLabel,
    accionHref: quick.accionHref,
    refreshLoteId: refresh.refreshLoteId ?? null,
    refreshPedidoId: refresh.refreshPedidoId ?? null,
  })
}

export async function POST(req: NextRequest) {
  const clerkId = await requireClerkUserId()
  if (!clerkId) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })
  }

  const body = (await req.json()) as Body
  console.log('[proof/contexto] request', {
    profileType: body.profileType,
    clerkId,
  })
  const profileType = parseProfileType(body.profileType)
  if (!profileType) {
    return new Response(
      JSON.stringify({ error: 'profileType requerido: distiller | distributor' }),
      { status: 400 }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada' }), {
      status: 500,
    })
  }

  const { stream, send, close } = createSseStream()

  void (async () => {
    try {
      const { sb, mode } = await createSupabaseForProofApi()
      const queryText = body.hints?.query?.trim() ?? ''
      console.log('[proof/contexto] branch', {
        profileType,
        pantalla: body.pantalla,
        query: queryText || null,
        supabase: mode,
      })

      let datos: Record<string, unknown>
      let refreshEntityId: string | null = null
      let refreshPedidoId: string | null = null
      let refreshSkuId: string | null = null
      let openSkuImagePicker: string | null = null
      let actionMessage: string | null = null
      const conversation = body.hints?.conversation ?? []

      const distributorScope =
        profileType === 'distributor'
          ? await resolveDistribuidorScope(sb, clerkId)
          : { clerk_id: clerkId, profile_type_v2: 'distributor' as const }

      if (queryText) {
        if (profileType === 'distiller') {
          const lotes = await fetchLotesForAgent(sb, clerkId, { limit: 500 })
          const viajes = await fetchViajes(sb, clerkId, { limit: 100 })
          const viajesPendientes = viajes.filter(
            v => v.estado === 'confirmado' || v.estado === 'en_transito'
          )
          const productosViaje =
            viajesPendientes.length > 0
              ? await fetchProductosViaje(
                  sb,
                  viajesPendientes.map(v => v.id)
                )
              : []
          const intentCtx: DistillerIntentContext = {
            lotes,
            viajes,
            productosViaje: productosViaje.map(p => ({
              id: p.id,
              viaje_id: p.viaje_id,
              tipo_agave: p.tipo_agave,
              litros_acordados: Number(p.litros_acordados),
            })),
            selectedLoteId: body.hints?.selectedId,
          }
          const action = parseIntent(queryText, profileType, intentCtx, conversation)
          if (action) {
            console.log('[proof/contexto] ejecutando acción', action)
            const result = await executeIntent(sb, clerkId, profileType, action)
            actionMessage = result.message
            refreshEntityId = result.entityId
          }
          if (!actionMessage) {
            const quickCtx = buildDistillerAgentContext(
              lotes,
              viajesPendientes,
              productosViaje,
              [],
              { query: queryText }
            )
            const quick = quickAnswer(queryText, profileType, quickCtx)
            if (quick) {
              console.log('[proof/contexto] quick answer', { query: queryText })
              sendQuickDone(send, quick, { refreshLoteId: refreshEntityId })
              return
            }
          }
          datos = await loadIsolatedAgentContext(sb, clerkId, profileType, {
            ...body.hints,
            selectedId: refreshEntityId ?? body.hints?.selectedId,
          })
        } else {
          const distCtx = await loadDistributorAgentContext(sb, clerkId, {
            ...body.hints,
            query: queryText,
            image: body.hints?.image,
          })
          const action = parseIntent(queryText, profileType, distCtx, conversation)
          console.log('[agente] intent resuelto', action ?? null, {
            query: queryText,
            clerkUserId: clerkId,
            scopeClerkId: distributorScope.clerk_id,
            skusEnContexto: distCtx.skus?.length ?? 0,
          })
          if (action) {
            console.log('[proof/contexto] ejecutando acción distribuidor', action)
            try {
              const result = await executeIntent(
                sb,
                clerkId,
                profileType,
                action,
                distributorScope,
                body.hints?.image
              )
              actionMessage = result.message
              refreshEntityId = result.entityId
              if (result.entityKind === 'pedido') {
                refreshPedidoId = result.entityId
              }
              if (result.refreshSkuId) {
                refreshSkuId = result.refreshSkuId
              } else if (result.entityKind === 'sku') {
                refreshSkuId = result.entityId
              }
              if (result.openImagePicker && refreshSkuId) {
                openSkuImagePicker = refreshSkuId
              }
            } catch (e) {
              console.error('[proof/contexto] acción distribuidor falló', action.type, e)
              actionMessage =
                e instanceof Error
                  ? e.message
                  : 'No se pudo completar la acción. Intenta de nuevo.'
            }
          }
          if (!actionMessage) {
            const quick = quickAnswer(queryText, profileType, {
              ...distCtx,
              conversation,
            })
            if (quick) {
              console.log('[proof/contexto] quick answer distribuidor', {
                query: queryText,
              })
              sendQuickDone(send, quick, {})
              return
            }
          }
          datos = await loadDistributorAgentContext(sb, clerkId, {
            ...body.hints,
            selectedId: refreshEntityId ?? body.hints?.selectedId,
            query: queryText,
          })
        }
      } else {
        datos = await loadIsolatedAgentContext(sb, clerkId, profileType, body.hints)
      }

      if (actionMessage) {
        const isDestilador = profileType === 'distiller'
        send('done', {
          mensaje: actionMessage,
          accionLabel: refreshPedidoId ? 'Ver pedido' : isDestilador ? 'Ver bodega' : 'Ver inventario',
          accionHref: refreshPedidoId
            ? `/dashboard/pedidos/${refreshPedidoId}`
            : isDestilador
              ? '/dashboard'
              : '/dashboard/inventario',
          refreshLoteId: refreshSkuId ?? (refreshPedidoId ? null : refreshEntityId),
          refreshPedidoId,
          openSkuImagePicker,
        })
        return
      }

      const isolation = proofAgentIsolationClause(clerkId, profileType)
      const isDestilador = profileType === 'distiller'
      const systemBase = isDestilador ? PROOF_AI_DESTILADOR : PROOF_AI_SYSTEM

      if (queryText) {
        const quick = quickAnswer(queryText, profileType, datos)
        if (quick) {
          console.log('[proof/contexto] quick answer (full ctx)', { query: queryText })
          sendQuickDone(send, quick, {})
          return
        }
      }

      if (profileType === 'distributor' && queryText) {
        datos = narrowDistributorContextForQuery(
          datos as import('@/lib/proof/distributor-agent-context').DistributorAgentContext,
          queryText
        )
      }

      const userPayload = JSON.stringify(
        {
          pantalla: body.pantalla,
          vista: body.vista ?? (isDestilador ? 'destilador' : 'distribuidor'),
          profileType,
          clerk_id: clerkId,
          datos,
        },
        null,
        2
      )

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 256,
          stream: true,
          system: `${systemBase}

${isolation}

Responde SOLO JSON válido:
{"mensaje":"max 2 líneas","accionLabel":"texto botón corto","accionHref":"ruta opcional /dashboard/..."}`,
          messages: [
            {
              role: 'user',
              content: `Genera barra contextual PROOF para:\n${userPayload}`,
            },
          ],
        }),
      })

      if (!res.ok || !res.body) {
        send('error', { message: await res.text() })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try {
            const evt = JSON.parse(payload)
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              const chunk = evt.delta.text as string
              full += chunk
              send('delta', { text: chunk })
            }
          } catch {
            /* ignore partial */
          }
        }
      }

      let mensaje = full.trim()
      let accionLabel = 'Ver más'
      let accionHref = isDestilador ? '/dashboard' : '/dashboard/inventario'
      try {
        const m = full.match(/\{[\s\S]*\}/)
        if (m) {
          const parsed = JSON.parse(m[0]) as {
            mensaje?: string
            accionLabel?: string
            accionHref?: string
          }
          mensaje = parsed.mensaje || mensaje
          accionLabel = parsed.accionLabel || accionLabel
          accionHref = parsed.accionHref || accionHref
        }
      } catch {
        /* usar texto crudo */
      }

      send('done', {
        mensaje,
        accionLabel,
        accionHref,
        refreshLoteId: refreshSkuId ?? refreshEntityId,
        refreshPedidoId,
        openSkuImagePicker,
      })
    } catch (e) {
      console.error('[proof/contexto] error', e)
      send('done', {
        mensaje: proofErrorMessage(e),
        accionLabel: 'Ver inicio',
        accionHref: '/dashboard',
        refreshLoteId: null,
        refreshPedidoId: null,
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
