import { describe, expect, it } from 'vitest'
import { tryWinemakerQuickAnswer } from '@/lib/proof/winemaker-agent-answers'
import type { WinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'

const emptyDoc = {
  folio: '',
  concept_title: '',
  payment_method: '',
  total_amount: null as number | null,
  tax_iva: 0,
  tax_iva_rate: '',
  supplier_email: '',
  first_line_description: '',
  line_count: 0,
  classified: false,
}

const baseCtx: WinemakerAgentContext = {
  perfil: 'winemaker',
  proveedores: [],
  resumen: {
    lotesTotal: 2,
    lotesActivos: 1,
    documentosTotal: 5,
    gastosMesMxn: 12000,
    gastosBodegaMxn: 3000,
    litrosEnProceso: 4500,
    porEstado: [{ status: 'fermentation', count: 1 }],
  },
  lotes: [],
  documentosRecientes: [
    {
      id: 'd1',
      document_type: 'ticket',
      vendor: 'Proveedor Uva',
      document_date: '2026-06-01',
      original_filename: 'ticket.pdf',
      line_summary: 'Uva',
      ...emptyDoc,
      classified: true,
    },
  ],
  gastosRecientes: [],
}

describe('tryWinemakerQuickAnswer', () => {
  it('answers gastos del mes', () => {
    const q = tryWinemakerQuickAnswer('¿cuánto he gastado este mes?', baseCtx)
    expect(q?.mensaje).toContain('12')
    expect(q?.accionHref).toBe('/dashboard/winemaker/gastos')
  })

  it('answers after ticket upload', () => {
    const ctx: WinemakerAgentContext = {
      ...baseCtx,
      uploadedDocument: {
        id: 'doc-1',
        supplier_id: 'sup-1',
        vendor: 'Proveedor Uva',
        document_type: 'ticket',
        document_date: '2026-06-01',
        original_filename: 'ticket.jpg',
        vision_status: 'ok',
        folio: '1001',
        supplier_email: '',
        concept_title: '',
        payment_method: '',
        total: 4500,
        subtotal: 4000,
        tax_iva: 500,
        tax_iva_rate: '8%',
        description: 'Compra uva',
        lines: [
          {
            supply_kind: 'uva',
            supply_label: 'Uva · Cabernet',
            varietal: 'Cabernet',
            description: 'Uva cabernet',
            product_service_code: '',
            quantity: 1000,
            unit: 'kg',
            unit_price: 4,
            amount: 4500,
          },
        ],
      },
    }
    const q = tryWinemakerQuickAnswer('acabo de subir el ticket, ¿qué detectaste?', ctx)
    expect(q?.mensaje).toContain('Proveedor Uva')
    expect(q?.mensaje).toContain('Uva')
    expect(q?.mensaje).toContain('Leí')
  })

  it('answers honestly for unclassified PDF upload', () => {
    const ctx: WinemakerAgentContext = {
      ...baseCtx,
      uploadedDocument: {
        id: 'doc-1',
        supplier_id: null,
        vendor: '',
        document_type: 'ticket',
        document_date: '2026-06-01',
        original_filename: 'FSAFSA0000020022.pdf',
        vision_status: 'skipped_pdf',
        folio: '',
        supplier_email: '',
        concept_title: '',
        payment_method: '',
        total: null,
        subtotal: null,
        tax_iva: 0,
        tax_iva_rate: '',
        description: '',
        lines: [
          {
            supply_kind: 'otro',
            supply_label: 'Otro',
            varietal: '',
            description: '',
            product_service_code: '',
            quantity: null,
            unit: '',
            unit_price: null,
            amount: 0,
          },
        ],
      },
    }
    const q = tryWinemakerQuickAnswer('acabo de subir el PDF, ¿cómo lo registro?', ctx)
    expect(q?.mensaje).toContain('FSAFSA0000020022.pdf')
    expect(q?.mensaje).toContain('PDF')
  })

  it('answers honestly when image vision failed', () => {
    const ctx: WinemakerAgentContext = {
      ...baseCtx,
      uploadedDocument: {
        id: 'doc-1',
        supplier_id: null,
        vendor: '',
        document_type: 'ticket',
        document_date: '2026-06-01',
        original_filename: 'Screen Shot.png',
        vision_status: 'api_error',
        folio: '',
        supplier_email: '',
        concept_title: '',
        payment_method: '',
        total: null,
        subtotal: null,
        tax_iva: 0,
        tax_iva_rate: '',
        description: '',
        lines: [
          {
            supply_kind: 'otro',
            supply_label: 'Otro',
            varietal: '',
            description: '',
            product_service_code: '',
            quantity: null,
            unit: '',
            unit_price: null,
            amount: 0,
          },
        ],
      },
    }
    const q = tryWinemakerQuickAnswer('acabo de subir Screen Shot.png sin clasificar', ctx)
    expect(q?.mensaje).toContain('lectura automática falló')
    expect(q?.mensaje).not.toContain('PDF')
  })

  it('redirects pedido entregado to winemaker vocabulary', () => {
    const q = tryWinemakerQuickAnswer('marcar pedido como entregado', baseCtx)
    expect(q?.mensaje).toContain('distribución')
    expect(q?.mensaje).toContain('ticket')
  })
})
