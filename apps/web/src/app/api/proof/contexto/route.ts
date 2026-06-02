import { NextRequest } from 'next/server'
import { requireClerkUserId } from '@/lib/proof/auth-api'
import { PROOF_AI_SYSTEM } from '@/lib/proof/prompts'
import { createSseStream } from '@/lib/proof/sse'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

type Body = {
  pantalla: string
  vista?: string
  contexto?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const clerkId = await requireClerkUserId()
  if (!clerkId) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })
  }
  const body = (await req.json()) as Body
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada' }), {
      status: 500,
    })
  }

  const { stream, send, close } = createSseStream()

  void (async () => {
    try {
      const userPayload = JSON.stringify(
        {
          pantalla: body.pantalla,
          vista: body.vista,
          datos: body.contexto ?? {},
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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          stream: true,
          system: `${PROOF_AI_SYSTEM}

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
        close()
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
      let accionHref = '/dashboard/agente'
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

      send('done', { mensaje, accionLabel, accionHref })
    } catch (e) {
      send('error', {
        message: e instanceof Error ? e.message : 'Error de contexto',
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
