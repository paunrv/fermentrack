import { NextRequest, NextResponse } from 'next/server'
import { requireClerkUserId } from '@/lib/proof/auth-api'
import { uploadSkuImagen } from '@/lib/proof/storage-skus'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  base64: string
  ext?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clerkId = await requireClerkUserId()
  if (!clerkId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const skuId = params.id
  if (!skuId) {
    return NextResponse.json({ error: 'SKU id requerido' }, { status: 400 })
  }

  const body = (await req.json()) as Body
  const { base64, ext = 'jpg' } = body

  if (!base64) {
    return NextResponse.json({ error: 'base64 requerido' }, { status: 400 })
  }

  const { sb } = await createSupabaseForProofApi()

  try {
    const imagenUrl = await uploadSkuImagen(sb, skuId, base64, ext)
    return NextResponse.json({ imagenUrl })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error subiendo imagen'
    console.error('[skus/imagen]', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
