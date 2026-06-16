import { fmtDateOnly, fmtMoney } from '@/lib/proof/format'
import type { PagoProveedorRow } from '@/lib/supabase/distribuidor'

export type OrdenCompraShareLine = {
  producto_nombre: string
  cantidad_ordenada: number
  cantidad_recibida?: number | null
}

export type OrdenCompraShareInput = {
  numero: string
  proveedor: string
  fecha: string
  estado: string
  lineas: OrdenCompraShareLine[]
  cxp?: {
    monto_total: number
    saldo_pendiente: number
    pagos?: PagoProveedorRow[]
  } | null
}

export function buildOrdenCompraShareText(input: OrdenCompraShareInput): string {
  const recibida = input.estado === 'recibida' || input.estado === 'parcial'
  const lineasTexto = input.lineas.map(l => {
    const qty =
      recibida && l.cantidad_recibida != null
        ? `${l.cantidad_recibida}/${l.cantidad_ordenada}`
        : String(l.cantidad_ordenada)
    return `• ${l.producto_nombre} — ${qty} uds`
  })

  const bloques = [
    `📋 *PROOF* — Orden de compra ${input.numero}`,
    `Proveedor: ${input.proveedor}`,
    `Fecha: ${fmtDateOnly(input.fecha)}`,
    '',
    ...lineasTexto,
  ]

  if (!recibida) {
    bloques.push('', 'Estado: pendiente de llegada')
    return bloques.join('\n')
  }

  if (input.cxp) {
    bloques.push('', `Total: ${fmtMoney(input.cxp.monto_total)}`)
    for (const p of input.cxp.pagos ?? []) {
      bloques.push(`· Pago ${fmtMoney(Number(p.monto))} — ${fmtDateOnly(p.fecha_pago)}`)
    }
    if (input.cxp.saldo_pendiente > 0) {
      bloques.push(`Saldo pendiente: ${fmtMoney(input.cxp.saldo_pendiente)}`)
    }
  }

  return bloques.join('\n')
}

export function ordenCompraWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function ordenCompraMailtoUrl(numero: string, proveedor: string, body: string): string {
  const subject = encodeURIComponent(`Orden de compra ${numero} — ${proveedor}`)
  return `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`
}
