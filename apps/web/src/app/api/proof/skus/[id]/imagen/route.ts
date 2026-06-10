import { NextRequest, NextResponse } from 'next/server'
import { requireClerkUserId } from '@/lib/proof/auth-api'
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

  // Decodificar base64 → Buffer
  const buffer = Buffer.from(base64, 'base64')
  const path = `skus/${skuId}/${Date.now()}.${ext}`

  const { sb } = await createSupabaseForProofApi()

  // 1. Upload a Storage
  const { error: uploadError } = await sb.storage
    .from('product-images')
    .upload(path, buffer, {
      contentType: `image/${ext}`,
      upsert: true,
    })

  if (uploadError) {
    console.error('[skus/imagen] upload error', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 2. URL pública
  const { data: urlData } = sb.storage
    .from('product-images')
    .getPublicUrl(path)

  const imagenUrl = urlData.publicUrl

  // 3. Persistir en skus
  const { error: updateError } = await sb
    .from('skus')
    .update({ imagen_url: imagenUrl })
    .eq('id', skuId)

  if (updateError) {
    console.error('[skus/imagen] update error', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ imagenUrl })
}
