import type { AppLocale } from '@/i18n/routing'
import { getPdfLabels, pdfLocaleTag, type PdfLabels } from '@/lib/proof/pdf-labels'
import { jsPDF } from 'jspdf'

export type RemisionPdfLine = {
  producto: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export type RemisionPdfInput = {
  numeroRemision: string
  numeroPedido: string
  fechaEntrega: string
  clienteNombre: string
  clienteDireccion?: string | null
  lineas: RemisionPdfLine[]
  subtotal: number
  total: number
  generadoEn: Date
  locale?: AppLocale
  labels?: PdfLabels
}

const TEXT = 'var(--fg-0)'
const ACCENT = '#C2410C'
const MARGIN_MM = 14 // ~40px

function fmtMoney(n: number, locale: AppLocale): string {
  return `$${n.toLocaleString(pdfLocaleTag(locale), { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string, locale: AppLocale): string {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(pdfLocaleTag(locale), { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateTime(d: Date, locale: AppLocale): string {
  return d.toLocaleString(pdfLocaleTag(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

export function buildRemisionPdfBuffer(input: RemisionPdfInput): Buffer {
  const locale = input.locale ?? 'es-MX'
  const L = input.labels ?? getPdfLabels(locale)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const contentW = pageW - MARGIN_MM * 2
  let y = MARGIN_MM

  const [tr, tg, tb] = hexToRgb(TEXT)
  const [ar, ag, ab] = hexToRgb(ACCENT)

  doc.setTextColor(tr, tg, tb)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('PROOF', MARGIN_MM, y)

  y += 10
  doc.setTextColor(ar, ag, ab)
  doc.setFontSize(13)
  doc.text(L.remisionTitle, MARGIN_MM, y)

  y += 3
  doc.setDrawColor(ar, ag, ab)
  doc.setLineWidth(0.4)
  doc.line(MARGIN_MM, y, pageW - MARGIN_MM, y)

  y += 8
  doc.setTextColor(tr, tg, tb)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${L.number}: ${input.numeroRemision}`, MARGIN_MM, y)
  doc.text(`${L.orderFolio}: ${input.numeroPedido}`, pageW / 2, y)
  y += 5
  doc.text(`${L.deliveryDate}: ${fmtDate(input.fechaEntrega, locale)}`, MARGIN_MM, y)

  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(L.customer, MARGIN_MM, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(input.clienteNombre, MARGIN_MM, y)
  if (input.clienteDireccion?.trim()) {
    y += 5
    const addrLines = doc.splitTextToSize(input.clienteDireccion.trim(), contentW)
    doc.text(addrLines, MARGIN_MM, y)
    y += (addrLines.length - 1) * 5
  }

  y += 10
  const colProd = MARGIN_MM
  const colQty = MARGIN_MM + contentW * 0.52
  const colPrice = MARGIN_MM + contentW * 0.68
  const colSub = MARGIN_MM + contentW * 0.84

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(ar, ag, ab)
  doc.text(L.product, colProd, y)
  doc.text(L.qty, colQty, y, { align: 'right' })
  doc.text(L.unitPrice, colPrice, y, { align: 'right' })
  doc.text(L.subtotal, colSub + contentW * 0.16, y, { align: 'right' })

  y += 2
  doc.setDrawColor(200, 200, 200)
  doc.line(MARGIN_MM, y, pageW - MARGIN_MM, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(tr, tg, tb)
  doc.setFontSize(9)

  for (const line of input.lineas) {
    if (y > 250) {
      doc.addPage()
      y = MARGIN_MM
    }
    const prodLines = doc.splitTextToSize(line.producto, contentW * 0.48)
    doc.text(prodLines, colProd, y)
    doc.text(String(line.cantidad), colQty, y, { align: 'right' })
    doc.text(fmtMoney(line.precioUnitario, locale), colPrice, y, { align: 'right' })
    doc.text(fmtMoney(line.subtotal, locale), colSub + contentW * 0.16, y, { align: 'right' })
    y += Math.max(5, prodLines.length * 5)
  }

  y += 4
  doc.line(MARGIN_MM, y, pageW - MARGIN_MM, y)
  y += 8

  const totalsX = pageW - MARGIN_MM
  doc.setFont('helvetica', 'normal')
  doc.text(L.subtotal, totalsX - 45, y, { align: 'right' })
  doc.text(fmtMoney(input.subtotal, locale), totalsX, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(ar, ag, ab)
  doc.text(L.total, totalsX - 45, y, { align: 'right' })
  doc.text(fmtMoney(input.total, locale), totalsX, y, { align: 'right' })

  y += 20
  doc.setTextColor(tr, tg, tb)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(L.receivedOk, MARGIN_MM, y)
  y += 12
  doc.setDrawColor(tr, tg, tb)
  doc.line(MARGIN_MM, y, MARGIN_MM + 70, y)

  y += 12
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(`${L.generated}: ${fmtDateTime(input.generadoEn, locale)}`, MARGIN_MM, y)

  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return Buffer.from(arrayBuffer)
}
