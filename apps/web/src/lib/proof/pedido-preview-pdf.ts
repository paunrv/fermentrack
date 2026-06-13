import { jsPDF } from 'jspdf'

export type PedidoPreviewPdfLine = {
  producto: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export type PedidoPreviewPdfInput = {
  numeroPedido: string
  clienteNombre: string
  fechaPedido: string
  fechaEntrega: string
  lineas: PedidoPreviewPdfLine[]
  subtotal: number
  total: number
}

const TEXT = 'var(--fg-0)'
const ACCENT = '#C2410C'
const MARGIN_MM = 14

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** Genera PDF preview/borrador en el cliente (sin Storage). */
export function downloadPedidoPreviewPdf(input: PedidoPreviewPdfInput): void {
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
  doc.setFontSize(12)
  doc.text(input.numeroPedido, MARGIN_MM, y)

  y += 3
  doc.setDrawColor(ar, ag, ab)
  doc.setLineWidth(0.4)
  doc.line(MARGIN_MM, y, pageW - MARGIN_MM, y)

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Cliente', MARGIN_MM, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(input.clienteNombre, MARGIN_MM, y)

  y += 8
  doc.text(`Fecha de pedido: ${fmtDate(input.fechaPedido)}`, MARGIN_MM, y)
  y += 5
  doc.text(`Fecha de entrega: ${fmtDate(input.fechaEntrega)}`, MARGIN_MM, y)

  y += 10
  const colProd = MARGIN_MM
  const colQty = MARGIN_MM + contentW * 0.52
  const colPrice = MARGIN_MM + contentW * 0.68
  const colSub = MARGIN_MM + contentW * 0.84

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(ar, ag, ab)
  doc.text('Producto', colProd, y)
  doc.text('Cant.', colQty, y, { align: 'right' })
  doc.text('P. unit.', colPrice, y, { align: 'right' })
  doc.text('Subtotal', colSub + contentW * 0.16, y, { align: 'right' })

  y += 2
  doc.setDrawColor(220, 220, 220)
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
    doc.text(
      line.precioUnitario > 0 ? fmtMoney(line.precioUnitario) : '—',
      colPrice,
      y,
      { align: 'right' }
    )
    doc.text(
      line.subtotal > 0 ? fmtMoney(line.subtotal) : '—',
      colSub + contentW * 0.16,
      y,
      { align: 'right' }
    )
    y += Math.max(5, prodLines.length * 5)
  }

  y += 4
  doc.line(MARGIN_MM, y, pageW - MARGIN_MM, y)
  y += 8

  const totalsX = pageW - MARGIN_MM
  if (input.subtotal > 0 && input.subtotal !== input.total) {
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal', totalsX - 45, y, { align: 'right' })
    doc.text(fmtMoney(input.subtotal), totalsX, y, { align: 'right' })
    y += 6
  }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(ar, ag, ab)
  doc.text('Total', totalsX - 45, y, { align: 'right' })
  doc.text(fmtMoney(input.total), totalsX, y, { align: 'right' })

  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Documento generado por PROOF', MARGIN_MM, y)

  const safeName = input.numeroPedido.replace(/[^\w-]+/g, '_')
  doc.save(`${safeName}.pdf`)
}
