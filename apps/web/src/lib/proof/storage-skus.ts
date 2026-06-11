import type { SupabaseClient } from '@supabase/supabase-js'

function logSupabaseError(scope: string, error: unknown) {
  const err = error as { message?: string; details?: string; hint?: string; code?: string }
  console.error(
    scope,
    err.message,
    err.details,
    err.hint,
    err.code ? `(code: ${err.code})` : ''
  )
}

export async function uploadSkuImagen(
  sb: SupabaseClient,
  skuId: string,
  base64: string,
  ext = 'jpg'
): Promise<string> {
  const buffer = Buffer.from(base64, 'base64')
  const path = `skus/${skuId}/${Date.now()}.${ext}`

  const { error: uploadError } = await sb.storage
    .from('product-images')
    .upload(path, buffer, {
      contentType: `image/${ext}`,
      upsert: true,
    })
  if (uploadError) {
    logSupabaseError('[uploadSkuImagen] storage bucket product-images', uploadError)
    throw uploadError
  }

  const { data: urlData } = sb.storage
    .from('product-images')
    .getPublicUrl(path)

  const { error: updateError } = await sb
    .from('skus')
    .update({ imagen_url: urlData.publicUrl })
    .eq('id', skuId)
  if (updateError) {
    logSupabaseError('[uploadSkuImagen] table skus (imagen_url)', updateError)
    throw updateError
  }

  return urlData.publicUrl
}
