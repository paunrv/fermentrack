import { randomUUID } from 'crypto'
import { processTicketUpload } from '@/lib/proof/winemaker-ticket-process'
import type { WmTicketVisionResult } from '@/lib/proof/winemaker-ticket-vision'
import type { WmDocumentType } from '@/lib/proof/winemaker-types'
import { winemakerTicketImportSchema } from '@/lib/mcp/schemas/winemaker-ticket'
import {
  buildSalidaConversionPreview,
  recordWmSalida,
  RecordWmSalidaError,
  validateRegistrarSalidaInput,
} from '@/lib/proof/record-wm-salida'
import { orgHasFeature, fetchOrgFeatureSource } from '@/lib/proof/org-features'
import type { WmSalidaTipo } from '@/lib/proof/finished-goods-types'
import {
  recordTeamMessage,
  RecordTeamMessageError,
  validateTeamMessageInput,
} from '@/lib/proof/record-team-message'
import { createActiveLot, CreateActiveLotError } from '@/lib/proof/record-active-lot'
import {
  LOT_ETAPA_VALUES,
  recordLotStageChange,
  RecordLotStageChangeError,
  type LotEtapa,
} from '@/lib/proof/lot-etapa'
import {
  recordLotBottling,
  RecordLotBottlingError,
} from '@/lib/proof/record-lot-bottling'
import type { WmBotellasPorCaja } from '@/lib/proof/finished-goods-types'
import { formatMensajesForMcp } from '@/lib/mcp/team-chat-mcp'
import type { McpWriteInput } from '@/lib/mcp/write-helpers'
import { withMcpWriteScope } from '@/lib/mcp/write-helpers'

export async function importWinemakerTicketTool(
  input: McpWriteInput & { ticket: unknown; winery_name?: string | null }
) {
  const parsed = winemakerTicketImportSchema.safeParse(input.ticket)
  if (!parsed.success) {
    throw new Error(
      `Invalid ticket extraction JSON: ${parsed.error.issues.map(i => i.message).join('; ')}`
    )
  }
  const ticket = parsed.data

  return withMcpWriteScope('import_winemaker_ticket', input, 'winemaker', async ({ sb, scope }) => {
    const organizationId = scope.organizationId!
    const documentId = randomUUID()
    const vision = ticket.extraction as WmTicketVisionResult

    const result = await processTicketUpload(sb, {
      organizationId,
      documentId,
      documentType: ticket.document_type as WmDocumentType,
      storagePath: `mcp-import/${organizationId}/${documentId}.json`,
      filename: ticket.filename,
      vision,
      visionStatus: 'ok',
      wineryName: input.winery_name ?? null,
      documentDate: vision.document_date,
      ocrText: vision.description,
    })

    return {
      ok: true,
      document_id: result.document.id,
      vendor: result.document.vendor,
      folio: result.document.folio,
      total_amount: result.document.total_amount,
      lines: result.lines.length,
      summary: result.summaryLabel,
    }
  })
}

export async function registrarSalidaTool(
  input: McpWriteInput & {
    existencia_id: string
    tipo: WmSalidaTipo
    cantidad: number
    unidad: 'botellas' | 'cajas'
    rango_inicio?: number | null
    rango_fin?: number | null
    preview_only?: boolean
  }
) {
  return withMcpWriteScope('registrar_salida', input, 'winemaker', async ({ sb, userId, scope }) => {
    const validated = validateRegistrarSalidaInput({
      existenciaId: input.existencia_id,
      tipo: input.tipo,
      cantidad: input.cantidad,
      unidad: input.unidad,
      rangoInicio: input.rango_inicio,
      rangoFin: input.rango_fin,
    })
    if (!validated.ok) throw new RecordWmSalidaError(validated.code)

    const organizationId = scope.organizationId!

    const org = await fetchOrgFeatureSource(sb, organizationId)
    const numeracionEnabled = orgHasFeature(org, 'numeracion_botellas')

    if (!numeracionEnabled && (input.rango_inicio != null || input.rango_fin != null)) {
      throw new RecordWmSalidaError('rango_not_allowed')
    }

    const payload = validated.value

    if (input.preview_only) {
      const { data: existencia, error } = await sb
        .from('wm_existencias')
        .select('id, botellas_producidas, botellas_por_caja')
        .eq('id', payload.existenciaId)
        .eq('organization_id', organizationId)
        .maybeSingle()

      if (error) throw error
      if (!existencia) throw new RecordWmSalidaError('existencia_not_found')

      const { data: salidas } = await sb
        .from('wm_salidas')
        .select('botellas')
        .eq('existencia_id', payload.existenciaId)

      const consumidas = (salidas ?? []).reduce((sum, row) => sum + Number(row.botellas), 0)
      const botellasPorCaja = existencia.botellas_por_caja
      const preview = buildSalidaConversionPreview(
        payload.cantidad,
        payload.unidad,
        botellasPorCaja,
        existencia.botellas_producidas - consumidas
      )

      if (preview.botellas > existencia.botellas_producidas - consumidas) {
        throw new RecordWmSalidaError('insufficient_stock')
      }

      return {
        ok: true,
        preview_only: true,
        organization_id: organizationId,
        existencia_id: payload.existenciaId,
        conversion: {
          cantidad: payload.cantidad,
          unidad: payload.unidad,
          botellas: preview.botellas,
          botellas_por_caja: botellasPorCaja,
          quedaran: preview.quedan,
        },
        numeracion_disponible: numeracionEnabled,
      }
    }

    try {
      const result = await recordWmSalida(sb, {
        ...payload,
        organizationId,
        registradoPor: userId,
        origen: 'mcp',
        org,
      })

      return {
        ok: true,
        salida_id: result.salidaId,
        organization_id: organizationId,
        existencia_id: payload.existenciaId,
        conversion: result.conversion,
        stock: result.stock,
        rango: result.rango,
      }
    } catch (err) {
      if (err instanceof RecordWmSalidaError) throw err
      throw err
    }
  })
}

export async function enviarMensajeTool(
  input: McpWriteInput & {
    body: string
    lote_id?: string | null
  }
) {
  return withMcpWriteScope('enviar_mensaje', input, 'winemaker', async ({ sb, userId, scope }) => {
    const validated = validateTeamMessageInput({ body: input.body, loteId: input.lote_id })
    if (!validated.ok) throw new RecordTeamMessageError(validated.code)

    const organizationId = scope.organizationId!
    const org = await fetchOrgFeatureSource(sb, organizationId)

    try {
      const message = await recordTeamMessage(sb, {
        body: input.body,
        loteId: input.lote_id,
        organizationId,
        authorId: userId,
        origen: 'mcp',
        org,
      })

      return {
        ok: true,
        mensaje: formatMensajesForMcp([message])[0],
      }
    } catch (err) {
      if (err instanceof RecordTeamMessageError) throw err
      throw err
    }
  })
}

export async function crearLoteTool(
  input: McpWriteInput & {
    code: string
    vintage_id?: string | null
    etapa?: LotEtapa
    notes?: string | null
  }
) {
  return withMcpWriteScope('crear_lote', input, 'winemaker', async ({ sb, scope }) => {
    const organizationId = scope.organizationId!

    try {
      const result = await createActiveLot(sb, {
        organizationId,
        code: input.code,
        vintageId: input.vintage_id,
        etapa: input.etapa,
        notes: input.notes,
      })

      return {
        ok: true,
        lot_id: result.lotId,
        code: input.code.trim(),
        organization_id: organizationId,
      }
    } catch (err) {
      if (err instanceof CreateActiveLotError) throw err
      throw err
    }
  })
}

export async function registrarEmbotelladoTool(
  input: McpWriteInput & {
    lot_id: string
    etiqueta_id?: string | null
    new_etiqueta?: {
      nombre: string
      varietal?: string | null
      region?: string | null
      tipo?: string | null
    } | null
    anada: number
    formato: string
    botellas_por_caja: WmBotellasPorCaja
    botellas_producidas: number
    occurred_at?: string
  }
) {
  return withMcpWriteScope('registrar_embotellado', input, 'winemaker', async ({ sb, userId, scope }) => {
    const organizationId = scope.organizationId!

    try {
      const result = await recordLotBottling(sb, {
        lotId: input.lot_id,
        etiquetaId: input.etiqueta_id,
        newEtiqueta: input.new_etiqueta,
        anada: input.anada,
        formato: input.formato,
        botellasPorCaja: input.botellas_por_caja,
        botellasProducidas: input.botellas_producidas,
        occurredAt: input.occurred_at,
        organizationId,
        actorUserId: userId,
      })

      return {
        ok: true,
        organization_id: organizationId,
        lot_id: input.lot_id,
        existencia_id: result.existenciaId,
        etiqueta_id: result.etiquetaId,
        event_id: result.eventId,
      }
    } catch (err) {
      if (err instanceof RecordLotBottlingError) throw err
      throw err
    }
  })
}

export async function cambiarEtapaLoteTool(
  input: McpWriteInput & {
    lot_id: string
    to_etapa: LotEtapa
    note?: string | null
    occurred_at?: string
  }
) {
  return withMcpWriteScope('cambiar_etapa_lote', input, 'winemaker', async ({ sb, userId, scope }) => {
    const organizationId = scope.organizationId!

    const { data: lot, error: lotError } = await sb
      .from('lots')
      .select('id, etapa')
      .eq('id', input.lot_id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (lotError) throw lotError
    if (!lot) throw new Error('lot_not_found')

    try {
      await recordLotStageChange(sb, {
        organizationId,
        lotId: input.lot_id,
        fromEtapa: lot.etapa as LotEtapa,
        toEtapa: input.to_etapa,
        occurredAt: input.occurred_at,
        actorId: userId,
        note: input.note,
      })

      return {
        ok: true,
        organization_id: organizationId,
        lot_id: input.lot_id,
        from_etapa: lot.etapa,
        to_etapa: input.to_etapa,
      }
    } catch (err) {
      if (err instanceof RecordLotStageChangeError) throw err
      throw err
    }
  })
}
