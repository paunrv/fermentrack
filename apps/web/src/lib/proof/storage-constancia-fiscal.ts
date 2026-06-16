import type { SupabaseClient } from '@supabase/supabase-js'

export const CONSTANCIA_FISCAL_BUCKET = 'comprobantes'

export function constanciaFiscalStoragePath(clerkId: string): string {
  return `${clerkId}/fiscal/constancia-fiscal.pdf`
}

export async function uploadConstanciaFiscalPdf(
  sb: SupabaseClient,
  clerkId: string,
  file: File
): Promise<string> {
  if (file.type !== 'application/pdf') {
    throw new Error('La constancia debe ser un archivo PDF')
  }
  const path = constanciaFiscalStoragePath(clerkId)
  const { error } = await sb.storage.from(CONSTANCIA_FISCAL_BUCKET).upload(path, file, {
    upsert: true,
    contentType: 'application/pdf',
  })
  if (error) throw error
  return path
}

export async function signedConstanciaFiscalUrl(
  sb: SupabaseClient,
  path: string,
  expiresInSec = 60 * 60
): Promise<string | null> {
  const { data, error } = await sb.storage
    .from(CONSTANCIA_FISCAL_BUCKET)
    .createSignedUrl(path, expiresInSec)
  if (error) throw error
  return data?.signedUrl ?? null
}
