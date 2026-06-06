import { fmtDateOnly, fmtMoney } from '@/lib/proof/format'

export type PedidoShareLine = {
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export type PedidoShareInput = {
  numero: string
  cliente: string
  fechaEntrega: string
  lineas: PedidoShareLine[]
  total: number
}

export function buildPedidoShareText(input: PedidoShareInput): string {
  const lines = input.lineas.map(
    l =>
      `${l.nombre} × ${l.cantidad.toLocaleString('es-MX')} — ${fmtMoney(l.subtotal)}`
  )
  return [
    `📦 *PROOF* — Pedido ${input.numero}`,
    `Cliente: ${input.cliente}`,
    `Fecha entrega: ${fmtDateOnly(input.fechaEntrega)}`,
    '',
    ...lines,
    '',
    `*Total: ${fmtMoney(input.total)}*`,
  ].join('\n')
}

export function pedidoWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function pedidoMailtoUrl(numero: string, cliente: string, body: string): string {
  const subject = encodeURIComponent(`Pedido ${numero} — ${cliente}`)
  return `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`
}
