import type { SupabaseClient } from '@supabase/supabase-js'
import type { WmDocumentType } from '@/lib/proof/winemaker-types'

export const WINEMAKER_DOCUMENTS_BUCKET = 'winemaker-documents'

export function inferWmDocumentType(mime: string, filename: string): WmDocumentType {
  const lower = filename.toLowerCase()
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'ticket'
  if (mime.includes('xml') || lower.endsWith('.xml')) return 'xml'
  if (mime.startsWith('image/')) return 'ticket'
  return 'other'
}

export function winemakerDocumentStoragePath(
  userId: string,
  documentId: string,
  filename: string
): string {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'documento'
  const dot = base.lastIndexOf('.')
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : 'bin'
  return `${userId}/tickets/${documentId}.${ext}`
}

export async function uploadWinemakerDocument(
  sb: SupabaseClient,
  userId: string,
  documentId: string,
  file: Blob,
  opts: { contentType: string; filename: string }
): Promise<string> {
  const path = winemakerDocumentStoragePath(userId, documentId, opts.filename)
  const { error } = await sb.storage.from(WINEMAKER_DOCUMENTS_BUCKET).upload(path, file, {
    upsert: false,
    contentType: opts.contentType,
  })
  if (error) throw error
  return path
}

export async function signedWinemakerDocumentUrl(
  sb: SupabaseClient,
  path: string,
  expiresInSec = 60 * 60
): Promise<string | null> {
  const { data, error } = await sb.storage
    .from(WINEMAKER_DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresInSec)
  if (error) throw error
  return data?.signedUrl ?? null
}

/** Dev/evaluación: borra documento, líneas (cascade) y archivo en storage. */
export async function deleteWmDocument(
  sb: SupabaseClient,
  userId: string,
  documentId: string
): Promise<void> {
  const { data: doc, error: findErr } = await sb
    .from('wm_documents')
    .select('id, storage_path')
    .eq('id', documentId)
    .eq('clerk_id', userId)
    .maybeSingle()

  if (findErr) throw findErr
  if (!doc) throw new Error('Documento no encontrado')

  if (doc.storage_path) {
    const { error: storageErr } = await sb.storage
      .from(WINEMAKER_DOCUMENTS_BUCKET)
      .remove([doc.storage_path])
    if (storageErr) {
      console.warn('[deleteWmDocument] storage remove failed', storageErr.message)
    }
  }

  const { error: delErr } = await sb
    .from('wm_documents')
    .delete()
    .eq('id', documentId)
    .eq('clerk_id', userId)

  if (delErr) {
    const pg = delErr as { code?: string; message?: string }
    throw new Error(pg.message || 'No se pudo eliminar el documento')
  }
}
