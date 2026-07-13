import type { SupabaseClient } from '@supabase/supabase-js'
import { signedWinemakerDocumentUrl } from '@/lib/proof/storage-winemaker-documents'

export type OpenWinemakerDocumentResult = 'opened' | 'missing' | 'error'

/** Resolves a signed URL and opens it in a new tab (field-friendly evidence viewer). */
export async function openWinemakerDocumentEvidence(
  sb: SupabaseClient,
  storagePath: string | null | undefined
): Promise<OpenWinemakerDocumentResult> {
  if (!storagePath?.trim()) return 'missing'
  try {
    const url = await signedWinemakerDocumentUrl(sb, storagePath)
    if (!url) return 'error'
    window.open(url, '_blank', 'noopener,noreferrer')
    return 'opened'
  } catch {
    return 'error'
  }
}
