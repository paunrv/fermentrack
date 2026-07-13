import { describe, expect, it } from 'vitest'
import { inferTicketAllocationReplies } from '@/lib/proof/winemaker-ticket-copy'
import { getDefaultWinemakerTicketCopy } from '@/lib/proof/winemaker-ticket-copy-default'
import {
  parseWmTicketVisionJson,
  resolveTicketContentType,
  WINEMAKER_TICKET_ALLOCATION_REPLIES,
} from '@/lib/proof/winemaker-ticket-vision'

describe('inferTicketAllocationReplies', () => {
  const esCopy = getDefaultWinemakerTicketCopy()

  it('detects post-upload allocation question in es-MX', () => {
    const replies = inferTicketAllocationReplies(
      'Leí ticket.png: GLOBAL FUENTES — Botella. Total: $9,905. Datos guardados en tu bodega. ¿Asignamos a un lote o queda en bodega?',
      esCopy
    )
    // Pilot: only winery CTA is offered (lot assign stubbed).
    expect(replies).toEqual(WINEMAKER_TICKET_ALLOCATION_REPLIES)
    expect(replies).toHaveLength(1)
    expect(replies![0]!.message).toMatch(/bodega/i)
  })

  it('returns undefined for unrelated agent text', () => {
    expect(
      inferTicketAllocationReplies('Registré $100 como gasto de bodega.', esCopy)
    ).toBeUndefined()
  })
})

describe('parseWmTicketVisionJson', () => {
  it('parses multi-line ticket with supply kinds', () => {
    const raw = JSON.stringify({
      supplier_name: 'Embotellados del Norte',
      document_date: '2026-06-10',
      total: 18500,
      currency: 'MXN',
      description: 'Compra embotellado',
      lines: [
        {
          supply_kind: 'botella',
          varietal: '',
          description: 'Botella bordeaux 750',
          quantity: 1000,
          unit: 'pza',
          amount: 12000,
        },
        {
          supply_kind: 'corcho',
          varietal: '',
          description: 'Corcho 44x24',
          quantity: 1000,
          unit: 'pza',
          amount: 6500,
        },
      ],
    })
    const p = parseWmTicketVisionJson(raw)
    expect(p?.supplier_name).toBe('Embotellados del Norte')
    expect(p?.lines).toHaveLength(2)
    expect(p?.lines[0]!.supply_kind).toBe('botella')
    expect(p?.lines[1]!.supply_kind).toBe('corcho')
  })

  it('parses uva line with varietal', () => {
    const raw = JSON.stringify({
      supplier_name: 'Viñedo Los Olivos',
      lines: [
        {
          supply_kind: 'uva',
          varietal: 'cabernet sauvignon',
          description: 'Uva cabernet',
          amount: 45000,
        },
      ],
    })
    const p = parseWmTicketVisionJson(raw)
    expect(p?.lines[0]!.supply_kind).toBe('uva')
    expect(p?.lines[0]!.varietal).toBe('cabernet sauvignon')
  })

  it('parses CFDI invoice with emisor, folio and line detail', () => {
    const raw = JSON.stringify({
      supplier_name: 'LARSON IRRIGATION DE BAJA CALIFORNIA',
      supplier_email: 'larson.sauzal@gmail.com',
      supplier_address: 'CALZADA DE LAS AGUILAS 1937 Ensenada BC',
      folio: '20022',
      document_date: '2026-05-19',
      payment_method: 'PPD - Pago en parcialidades o diferido',
      concept_title: 'Información de compra',
      subtotal: 12128.79,
      tax_iva: 970.3,
      tax_iva_rate: '8%',
      total: 13099.03,
      lines: [
        {
          supply_kind: 'botella',
          product_service_code: '24122003',
          product_service_label: 'Botellas de cristal',
          description: 'BOTELLA DE VIDRIO BG 750',
          quantity: 1232,
          unit: 'Pieza',
          unit_price: 9.84,
          discount: 0.06,
          tax_note: 'IVA 8%',
          amount: 12128.79,
        },
      ],
    })
    const p = parseWmTicketVisionJson(raw)
    expect(p?.supplier_name).toContain('LARSON')
    expect(p?.folio).toBe('20022')
    expect(p?.supplier_email).toBe('larson.sauzal@gmail.com')
    expect(p?.lines[0]!.product_service_code).toBe('24122003')
    expect(p?.lines[0]!.quantity).toBe(1232)
  })

  it('infers png mime from screenshot filename when browser omits type', () => {
    expect(resolveTicketContentType('Screen Shot 2026-06-17 at 19.13.33.png', '')).toBe(
      'image/png'
    )
  })
})
