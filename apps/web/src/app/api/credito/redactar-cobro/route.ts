import { NextRequest, NextResponse } from 'next/server'
import { requireClerkUserId } from '@/lib/proof/auth-api'
import { getAgentApiMessages } from '@/lib/i18n/agent-messages-server'
import { getLocaleFromRequest } from '@/lib/i18n/request-locale'
import { getCobroSystem } from '@/lib/proof/prompts'
import type { AppLocale } from '@/i18n/routing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  clienteNombre: string
  monto: number
  diasVencido: number
  pedidoNumero?: string | null
  tono?: 'suave' | 'firme'
  locale?: AppLocale
}

function formatMoney(amount: number, locale: AppLocale): string {
  const tag = locale === 'en-US' ? 'en-US' : 'es-MX'
  return `$${amount.toLocaleString(tag)} MXN`
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body
  const locale = getLocaleFromRequest(req, body.locale)
  const api = await getAgentApiMessages(locale)
  const clerkId = await requireClerkUserId()
  if (!clerkId) {
    return NextResponse.json({ error: api.unauthenticated }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: api.apiKeyMissing }, { status: 500 })
  }

  const prompt = api.cobroUserPrompt
  const tone =
    body.tono ||
    (body.diasVencido > 14 ? prompt.toneFirm : prompt.toneSoft)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      system: getCobroSystem(locale),
      messages: [
        {
          role: 'user',
          content: `${prompt.client}: ${body.clienteNombre}
${prompt.amount}: ${formatMoney(body.monto, locale)}
${prompt.daysOverdue}: ${body.diasVencido}
${body.pedidoNumero ? `${prompt.activeOrder}: ${body.pedidoNumero}` : ''}
${prompt.tone}: ${tone}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: res.status })
  }

  const data = await res.json()
  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text?.trim() || ''
  return NextResponse.json({ mensaje: text })
}
