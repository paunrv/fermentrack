export function fmtBottles(n: number): string {
  return n.toLocaleString('es-MX')
}

export function fmtMoney(n: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}
