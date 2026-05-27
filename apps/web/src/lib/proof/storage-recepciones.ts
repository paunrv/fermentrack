import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'recepciones'
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7 // 7 días

export function recepcionStoragePath(
  clerkId: string,
  recepcionId: string,
  contentType: string
): string {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  return `${clerkId}/${recepcionId}/${Date.now()}.${ext}`
}

/** Sube foto y devuelve URL firmada para guardar en recepciones.foto_urls */
export async function uploadRecepcionFoto(
  sb: SupabaseClient,
  clerkId: string,
  recepcionId: string,
  imageBuffer: Buffer,
  contentType: string
): Promise<{ path: string; signedUrl: string }> {
  const path = recepcionStoragePath(clerkId, recepcionId, contentType)
  const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, imageBuffer, {
    contentType,
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data, error: signError } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC)
  if (signError) throw signError
  if (!data?.signedUrl) throw new Error('No se pudo firmar URL de recepción')

  return { path, signedUrl: data.signedUrl }
}

/** Extrae path interno desde URL firmada de Supabase Storage. */
export function storagePathFromSignedUrl(signedUrl: string): string | null {
  try {
    const u = new URL(signedUrl)
    const publicMatch = u.pathname.match(/\/object\/(?:sign|public)\/recepciones\/(.+)$/)
    if (publicMatch?.[1]) return decodeURIComponent(publicMatch[1])
    return null
  } catch {
    return null
  }
}

export async function signRecepcionFotoPaths(
  sb: SupabaseClient,
  pathsOrUrls: string[],
  expiresInSec = 3600
): Promise<string[]> {
  const signed: string[] = []
  for (const entry of pathsOrUrls) {
    const path = entry.includes('://') ? storagePathFromSignedUrl(entry) : entry
    if (!path) {
      if (entry.startsWith('http')) signed.push(entry)
      continue
    }
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, expiresInSec)
    if (!error && data?.signedUrl) signed.push(data.signedUrl)
  }
  return signed
}

export async function appendRecepcionFotoUrl(
  sb: SupabaseClient,
  recepcionId: string,
  signedUrl: string,
  existing: string[] = []
): Promise<void> {
  const { error } = await sb
    .from('recepciones')
    .update({ foto_urls: [...existing, signedUrl] })
    .eq('id', recepcionId)
  if (error) throw error
}
