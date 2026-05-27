import { NextRequest, NextResponse } from 'next/server'
import { requireClerkUserId } from '@/lib/proof/auth-api'
import { COBRO_SYSTEM } from '@/lib/proof/prompts'

export const runtime = 'nodejs'

type Body = {
  clienteNombre: string
  monto: number
  diasVencido: number
  pedidoNumero?: string | null
  tono?: 'suave' | 'firme'
}

export async function POST(req: NextRequest) {
  await requireClerkUserId()
  const body = (await req.json()) as Body
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: COBRO_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Cliente: ${body.clienteNombre}
Monto pendiente: $${body.monto.toLocaleString('es-MX')} MXN
Días vencido: ${body.diasVencido}
${body.pedidoNumero ? `Pedido activo hoy: ${body.pedidoNumero}` : ''}
Tono: ${body.tono || (body.diasVencido > 14 ? 'firme' : 'suave')}`,
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
