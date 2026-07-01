import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServiceSupabase } from '@/utils/supabase/service'

const PRODUCER_TYPES = new Set(['Bodega', 'Cervecería', 'Destilería', 'Distribuidor', 'Otro'])

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function createAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 })
  }

  const { name, email, message, producer_type } = body as Record<string, unknown>

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
  }
  if (typeof email !== 'string' || !isValidEmail(email.trim())) {
    return NextResponse.json({ error: 'El email no es válido.' }, { status: 400 })
  }
  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'El mensaje es obligatorio.' }, { status: 400 })
  }

  let producerType: string | null = null
  if (producer_type != null && producer_type !== '') {
    if (typeof producer_type !== 'string' || !PRODUCER_TYPES.has(producer_type)) {
      return NextResponse.json({ error: 'Tipo de productor no válido.' }, { status: 400 })
    }
    producerType = producer_type
  }

  const row = {
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    producer_type: producerType,
  }

  try {
    const sb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceSupabase() : createAnonSupabase()
    const { error } = await sb.from('contact_submissions').insert(row)

    if (error) {
      console.error('[contact] insert failed:', error.message)
      return NextResponse.json({ error: 'No pudimos guardar tu mensaje. Intenta de nuevo.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[contact] unexpected error:', err)
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 })
  }
}
