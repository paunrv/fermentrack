import { NextRequest } from 'next/server'
import type { AppLocale } from '@/i18n/routing'
import { requireClerkUserId } from '@/lib/proof/auth-api'
import {
  executeIntent,
  parseIntent,
  quickAnswer,
  type DistillerIntentContext,
} from '@/lib/proof/agent-intent-parser'
import type { DisplayCards } from '@/lib/proof/agent-response-types'
import {
  type AgentContextHints,
  type AgentProfileType,
  fetchLotesForAgent,
  loadDistributorAgentContext,
  loadIsolatedAgentContext,
} from '@/lib/proof/agent-context-server'
import { buildDistillerAgentContext } from '@/lib/proof/distiller-agent-context'
import { buildDistributorDisplayCards } from '@/lib/proof/distributor-display-cards'
import { buildDistillerDisplayCards } from '@/lib/proof/distiller-display-cards'
import { buildWinemakerDisplayCards } from '@/lib/proof/winemaker-display-cards'
import { tryWinemakerDocumentAction } from '@/lib/proof/winemaker-agent-actions'
import type { WinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'
import { getAgentApiMessages } from '@/lib/i18n/agent-messages-server'
import { getLocaleFromRequest } from '@/lib/i18n/request-locale'
import { getWinemakerTicketCopyForLocale } from '@/lib/i18n/winemaker-ticket-copy-server'
import { narrowDistributorContextForQuery } from '@/lib/proof/toma-pedido-intent'
import {
  isDistributorGuidedFlowQuery,
  minimalDistributorQuickContext,
} from '@/lib/proof/distributor-guided-flow'
import { proofErrorMessage } from '@/lib/proof/proof-error'
import {
  getProofAgentSystem,
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
  locale?: AppLocale
  hints?: AgentContextHints
  contexto?: Record<string, unknown>
}

function parseProfileType(raw: unknown): AgentProfileType | null {
  if (raw === 'distiller' || raw === 'distributor' || raw === 'winemaker') return raw
  return null
}

function buildDisplayCardsForQuery(
  query: string,
  profileType: AgentProfileType,
  datos: Record<string, unknown>
): { displayCards: DisplayCards | null; emptyResults: boolean } {
  if (profileType === 'distributor') {
    return buildDistributorDisplayCards(query, datos)
  }
  if (profileType === 'winemaker') {
    return buildWinemakerDisplayCards(query, datos)
  }
  return buildDistillerDisplayCards(query, datos)
}

function sendAgentDone(
  send: (event: string, data: unknown) => void,
  api: Awaited<ReturnType<typeof getAgentApiMessages>>,
  opts: {
    queryText: string
    profileType: AgentProfileType
    datos: Record<string, unknown>
    mensaje: string
    accionLabel?: string
    accionHref?: string
    refreshLoteId?: string | null
    refreshPedidoId?: string | null
    refreshOcId?: string | null
    openSkuImagePicker?: string | null
    refreshProfile?: boolean
    skipDisplayCards?: boolean
    suggestedReplies?: { label: string; message: string }[]
  }
) {
  let chatResponse = opts.mensaje.replace(/\*\*/g, '')
  let displayCards: DisplayCards | null = null

  if (opts.queryText && !opts.skipDisplayCards) {
    const built = buildDisplayCardsForQuery(opts.queryText, opts.profileType, opts.datos)
    displayCards = built.displayCards
    if (built.emptyResults && !displayCards) {
      chatResponse = api.emptyResults
    }
  }

  send('done', {
    chatResponse,
    mensaje: chatResponse,
    displayCards,
    accionLabel: opts.accionLabel ?? api.viewMore,
    accionHref: opts.accionHref ?? '/dashboard',
    refreshLoteId: opts.refreshLoteId ?? null,
    refreshPedidoId: opts.refreshPedidoId ?? null,
    refreshOcId: opts.refreshOcId ?? null,
    openSkuImagePicker: opts.openSkuImagePicker ?? null,
    refreshProfile: opts.refreshProfile ?? false,
    suggestedReplies: opts.suggestedReplies ?? null,
  })
}

export async function POST(req: NextRequest) {
  const userId = await requireClerkUserId()
  const body = (await req.json()) as Body
  const locale = getLocaleFromRequest(req, body.locale)
  const api = await getAgentApiMessages(locale)

  if (!userId) {
    return new Response(JSON.stringify({ error: api.unauthenticated }), { status: 401 })
  }

  console.log('[proof/contexto] request', {
    profileType: body.profileType,
    userId,
    locale,
  })
  const profileType = parseProfileType(body.profileType)
  if (!profileType) {
    return new Response(JSON.stringify({ error: api.profileTypeRequired }), { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: api.apiKeyMissing }), { status: 500 })
  }

  const { stream, send, close } = createSseStream()

  void (async () => {
    try {
      const { sb, mode } = await createSupabaseForProofApi()
      const isDestilador = profileType === 'distiller'
      const isWinemaker = profileType === 'winemaker'
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
      let refreshOcId: string | null = null
      let refreshSkuId: string | null = null
      let openSkuImagePicker: string | null = null
      let refreshProfile = false
      let actionMessage: string | null = null
      const conversation = body.hints?.conversation ?? []

      if (profileType === 'distributor' && queryText) {
        const earlyQuick = quickAnswer(
          queryText,
          profileType,
          minimalDistributorQuickContext(conversation) as unknown as Record<string, unknown>
        )
        if (earlyQuick) {
          console.log('[proof/contexto] early quick answer (sin DB)', { query: queryText })
          sendAgentDone(send, api, {
            queryText,
            profileType,
            datos: minimalDistributorQuickContext(conversation) as unknown as Record<
              string,
              unknown
            >,
            mensaje: earlyQuick.mensaje,
            accionLabel: earlyQuick.accionLabel,
            accionHref: earlyQuick.accionHref,
            skipDisplayCards: true,
          })
          return
        }
      }

      const distributorScope =
        profileType === 'distributor'
          ? await resolveDistribuidorScope(sb, userId)
          : { user_id: userId, profile_type_v2: 'distributor' as const }

      if (queryText) {
        if (profileType === 'distiller') {
          const lotes = await fetchLotesForAgent(sb, userId, { limit: 500 })
          const viajes = await fetchViajes(sb, userId, { limit: 100 })
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
            const result = await executeIntent(sb, userId, profileType, action)
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
              sendAgentDone(send, api, {
                queryText,
                profileType,
                datos: quickCtx as unknown as Record<string, unknown>,
                mensaje: quick.mensaje,
                accionLabel: quick.accionLabel,
                accionHref: quick.accionHref,
                refreshLoteId: refreshEntityId,
              })
              return
            }
          }
          datos = await loadIsolatedAgentContext(sb, userId, profileType, {
            ...body.hints,
            selectedId: refreshEntityId ?? body.hints?.selectedId,
          })
        } else if (profileType === 'winemaker') {
          const ticketCopy = await getWinemakerTicketCopyForLocale(locale)
          datos = await loadIsolatedAgentContext(sb, userId, profileType, {
            ...body.hints,
            query: queryText,
            selectedId: body.hints?.selectedId,
          })
          const wmCtx = datos as unknown as WinemakerAgentContext
          const docAction = await tryWinemakerDocumentAction(sb, queryText, wmCtx, conversation)
          if (docAction) {
            console.log('[proof/contexto] winemaker document action', { query: queryText })
            sendAgentDone(send, api, {
              queryText,
              profileType,
              datos,
              mensaje: docAction.message,
              accionLabel: docAction.accionLabel,
              accionHref: docAction.accionHref,
              skipDisplayCards: true,
            })
            return
          }
          const quick = quickAnswer(queryText, profileType, datos, { ticketCopy })
          if (quick) {
            console.log('[proof/contexto] quick answer winemaker', { query: queryText })
            sendAgentDone(send, api, {
              queryText,
              profileType,
              datos,
              mensaje: quick.mensaje,
              accionLabel: quick.accionLabel,
              accionHref: quick.accionHref,
              skipDisplayCards: quick.showDisplayCards !== true,
              suggestedReplies: quick.suggestedReplies,
            })
            return
          }
        } else {
          const distCtx = await loadDistributorAgentContext(sb, userId, {
            ...body.hints,
            query: queryText,
            image: body.hints?.image,
          })
          const action = parseIntent(queryText, profileType, distCtx, conversation)
          console.log('[agente] intent resuelto', action ?? null, {
            query: queryText,
            authUserId: userId,
            scopeUserId: distributorScope.user_id,
            skusEnContexto: distCtx.skus?.length ?? 0,
          })
          if (action) {
            console.log('[proof/contexto] ejecutando acción distribuidor', action)
            try {
              const result = await executeIntent(
                sb,
                userId,
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
              if (result.entityKind === 'orden') {
                refreshOcId = result.entityId
              }
              if (result.refreshSkuId) {
                refreshSkuId = result.refreshSkuId
              } else if (result.entityKind === 'sku') {
                refreshSkuId = result.entityId
              }
              if (result.openImagePicker && refreshSkuId) {
                openSkuImagePicker = refreshSkuId
              }
              if (result.refreshProfile) {
                refreshProfile = true
              }
            } catch (e) {
              console.error('[proof/contexto] acción distribuidor falló', action.type, e)
              actionMessage =
                e instanceof Error ? e.message : api.actionFailed
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
              sendAgentDone(send, api, {
                queryText,
                profileType,
                datos: { ...distCtx, conversation } as unknown as Record<string, unknown>,
                mensaje: quick.mensaje,
                accionLabel: quick.accionLabel,
                accionHref: quick.accionHref,
              })
              return
            }
          }
          datos = await loadDistributorAgentContext(sb, userId, {
            ...body.hints,
            selectedId: refreshEntityId ?? body.hints?.selectedId,
            query: queryText,
          })
        }
      } else {
        datos = await loadIsolatedAgentContext(sb, userId, profileType, body.hints)
      }

      if (actionMessage) {
        const miInfoUpdated = refreshProfile && profileType === 'distributor'
        sendAgentDone(send, api, {
          queryText,
          profileType,
          datos,
          mensaje: actionMessage,
          accionLabel: miInfoUpdated
            ? api.myInfo
            : refreshOcId
              ? api.viewOc
              : refreshPedidoId
                ? api.viewOrder
                : isDestilador
                  ? api.viewWarehouse
                  : isWinemaker
                    ? api.viewLots
                    : api.viewInventory,
          accionHref: miInfoUpdated
            ? '/dashboard'
            : refreshOcId
              ? `/dashboard?oc=${refreshOcId}`
              : refreshPedidoId
                ? `/dashboard/pedidos/${refreshPedidoId}`
                : isDestilador || isWinemaker
                  ? '/dashboard'
                  : '/dashboard/inventario',
          refreshLoteId: refreshSkuId ?? (refreshPedidoId || refreshOcId ? null : refreshEntityId),
          refreshPedidoId,
          refreshOcId,
          openSkuImagePicker,
          refreshProfile,
          skipDisplayCards: true,
        })
        return
      }

      const isolation = proofAgentIsolationClause(userId, profileType, locale)
      const systemBase = getProofAgentSystem(profileType, locale)

      if (queryText) {
        const quick = quickAnswer(
          queryText,
          profileType,
          datos,
          profileType === 'winemaker'
            ? { ticketCopy: await getWinemakerTicketCopyForLocale(locale) }
            : undefined
        )
        if (quick) {
          console.log('[proof/contexto] quick answer (full ctx)', { query: queryText })
          sendAgentDone(send, api, {
            queryText,
            profileType,
            datos,
            mensaje: quick.mensaje,
            accionLabel: quick.accionLabel,
            accionHref: quick.accionHref,
            suggestedReplies: quick.suggestedReplies,
          })
          return
        }

        if (
          profileType === 'distributor' &&
          isDistributorGuidedFlowQuery(queryText, conversation)
        ) {
          console.log('[proof/contexto] guided flow fallback (sin LLM)', { query: queryText })
          sendAgentDone(send, api, {
            queryText,
            profileType,
            datos,
            mensaje: api.guidedFlowFallback,
            accionLabel: api.viewHome,
            accionHref: '/dashboard',
            skipDisplayCards: true,
          })
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
          vista:
            body.vista ??
            (isDestilador ? 'destilador' : isWinemaker ? 'winemaker' : 'distribuidor'),
          profileType,
          user_id:
            profileType === 'distributor' && typeof datos.user_id === 'string'
              ? datos.user_id
              : userId,
          auth_user_id: userId,
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

${api.jsonResponseInstruction}`,
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
      let accionLabel = api.viewMore
      let accionHref = isDestilador || isWinemaker ? '/dashboard' : '/dashboard/inventario'
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

      sendAgentDone(send, api, {
        queryText,
        profileType,
        datos,
        mensaje,
        accionLabel,
        accionHref,
        refreshLoteId: refreshSkuId ?? refreshEntityId,
        refreshPedidoId,
        refreshOcId,
        openSkuImagePicker,
      })
    } catch (e) {
      console.error('[proof/contexto] error', e)
      sendAgentDone(send, api, {
        queryText: body.hints?.query?.trim() ?? '',
        profileType: profileType ?? 'distributor',
        datos: {},
        mensaje: proofErrorMessage(e),
        accionLabel: api.viewHome,
        accionHref: '/dashboard',
        skipDisplayCards: true,
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
