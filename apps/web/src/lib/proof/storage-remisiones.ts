import type { SupabaseClient } from '@supabase/supabase-js'

export const REMISIONES_BUCKET = 'remisiones'
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7 // 7 días

export function remisionStoragePath(clerkId: string, remisionId: string): string {
  return `${clerkId}/${remisionId}.pdf`
}

export async function uploadRemisionPdf(
  sb: SupabaseClient,
  clerkId: string,
  remisionId: string,
  pdfBuffer: Buffer
): Promise<{ path: string; signedUrl: string }> {
  const path = remisionStoragePath(clerkId, remisionId)
  const { error: uploadError } = await sb.storage.from(REMISIONES_BUCKET).upload(path, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (uploadError) throw uploadError

  const { data, error: signError } = await sb.storage
    .from(REMISIONES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC)
  if (signError) throw signError
  if (!data?.signedUrl) throw new Error('No se pudo firmar URL de remisión')

  return { path, signedUrl: data.signedUrl }
}

export async function signRemisionPdfUrl(
  sb: SupabaseClient,
  storagePath: string
): Promise<string> {
  const { data, error } = await sb.storage
    .from(REMISIONES_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC)
  if (error) throw error
  if (!data?.signedUrl) throw new Error('No se pudo firmar URL de remisión')
  return data.signedUrl
}
