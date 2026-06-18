import { NextRequest } from 'next/server'
import { requireClerkUserId } from '@/lib/proof/auth-api'
import { deleteWmDocument } from '@/lib/proof/storage-winemaker-documents'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/** Dev/evaluación: eliminar documento winemaker del canvas y la base. */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const clerkId = await requireClerkUserId()
  if (!clerkId) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { id } = await context.params
  if (!id?.trim()) {
    return Response.json({ error: 'ID requerido' }, { status: 400 })
  }

  try {
    const { sb } = await createSupabaseForProofApi()
    await deleteWmDocument(sb, clerkId, id)
    return Response.json({ ok: true, documentId: id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'No se pudo eliminar el documento'
    console.error('[winemaker/documentos DELETE]', msg, e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
