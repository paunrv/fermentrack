import { describe, expect, it, vi, beforeEach } from 'vitest'
import * as winemaker from '@/lib/supabase/winemaker'
import { tryWinemakerDocumentAction } from '@/lib/proof/winemaker-agent-actions'
import type { WinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'

const TEST_ORG_ID = '00000000-0000-4000-8000-000000000001'

const baseCtx: WinemakerAgentContext & { organization_id: string } = {
  organization_id: TEST_ORG_ID,
  perfil: 'winemaker',
  proveedores: [],
  resumen: {
    lotesTotal: 0,
    lotesActivos: 0,
    documentosTotal: 1,
    gastosMesMxn: 0,
    gastosBodegaMxn: 0,
    litrosEnProceso: 0,
    porEstado: [],
  },
  lotes: [],
  documentosRecientes: [
    {
      id: 'doc-larson',
      document_type: 'ticket',
      vendor: 'LARSON IRRIGATION DE BAJA CALIFORNIA',
      document_date: '2026-05-19',
      original_filename: 'screen.png',
      folio: '20022',
      concept_title: '',
      payment_method: '',
      total_amount: 13099,
      tax_iva: 970,
      tax_iva_rate: '8%',
      supplier_email: '',
      line_summary: 'Botella',
      first_line_description: 'BOTELLA DE VIDRIO',
      line_count: 1,
      classified: true,
    },
  ],
  gastosRecientes: [],
  selectedDocumentId: 'doc-larson',
}

describe('tryWinemakerDocumentAction', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null for unrelated queries', async () => {
    const result = await tryWinemakerDocumentAction({} as never, 'hola', baseCtx)
    expect(result).toBeNull()
  })

  it('registers overhead cost from card action prompt', async () => {
    vi.spyOn(winemaker, 'registerDocumentOverheadCosts').mockResolvedValue({
      costs: [],
      total: 13099,
      vendor: 'LARSON IRRIGATION DE BAJA CALIFORNIA',
    })

    const result = await tryWinemakerDocumentAction(
      {} as never,
      'registra la factura LARSON IRRIGATION DE BAJA CALIFORNIA · Folio 20022 como gasto de bodega sin lote',
      baseCtx
    )

    expect(winemaker.registerDocumentOverheadCosts).toHaveBeenCalledWith(
      expect.anything(),
      TEST_ORG_ID,
      'doc-larson'
    )
    expect(result?.message).toContain('13')
    expect(result?.accionHref).toBe('/dashboard/winemaker/gastos')
  })

  it('registers overhead when user says queda en bodega after upload', async () => {
    vi.spyOn(winemaker, 'registerDocumentOverheadCosts').mockResolvedValue({
      costs: [],
      total: 9905,
      vendor: 'GLOBAL FUENTES',
    })

    const result = await tryWinemakerDocumentAction(
      {} as never,
      'queda en bodega',
      {
        ...baseCtx,
        selectedDocumentId: 'doc-global',
        documentosRecientes: [
          {
            ...baseCtx.documentosRecientes[0]!,
            id: 'doc-global',
            vendor: 'GLOBAL FUENTES',
            total_amount: 9905,
          },
        ],
      },
      [
        { role: 'user', content: 'Subí ticket: screen.png' },
        {
          role: 'agent',
          content:
            'Leí screen.png: GLOBAL FUENTES — Botella. Total: $9,905. Datos guardados en tu bodega. ¿Asignamos a un lote o queda en bodega?',
        },
      ]
    )

    expect(winemaker.registerDocumentOverheadCosts).toHaveBeenCalledWith(
      expect.anything(),
      TEST_ORG_ID,
      'doc-global'
    )
    expect(result?.message).toContain('9')
  })
})
