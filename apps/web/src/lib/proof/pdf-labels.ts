import type { AppLocale } from '@/i18n/routing'

export type PdfLabels = {
  remisionTitle: string
  number: string
  orderFolio: string
  deliveryDate: string
  customer: string
  product: string
  qty: string
  unitPrice: string
  subtotal: string
  total: string
  receivedOk: string
  generated: string
  orderPreview: string
  orderDate: string
}

const LABELS: Record<AppLocale, PdfLabels> = {
  'es-MX': {
    remisionTitle: 'REMISIÓN DE ENTREGA',
    number: 'Número',
    orderFolio: 'Folio pedido',
    deliveryDate: 'Fecha de entrega',
    customer: 'Cliente',
    product: 'Producto',
    qty: 'Cant.',
    unitPrice: 'P. unit.',
    subtotal: 'Subtotal',
    total: 'Total',
    receivedOk: 'Recibí conforme:',
    generated: 'Generado',
    orderPreview: 'Vista previa de pedido',
    orderDate: 'Fecha pedido',
  },
  'en-US': {
    remisionTitle: 'DELIVERY NOTE',
    number: 'Number',
    orderFolio: 'Order',
    deliveryDate: 'Delivery date',
    customer: 'Customer',
    product: 'Product',
    qty: 'Qty',
    unitPrice: 'Unit',
    subtotal: 'Subtotal',
    total: 'Total',
    receivedOk: 'Received in good order:',
    generated: 'Generated',
    orderPreview: 'Order preview',
    orderDate: 'Order date',
  },
}

export function getPdfLabels(locale: AppLocale = 'es-MX'): PdfLabels {
  return LABELS[locale] ?? LABELS['es-MX']
}

export function pdfLocaleTag(locale: AppLocale): string {
  return locale === 'en-US' ? 'en-US' : 'es-MX'
}
