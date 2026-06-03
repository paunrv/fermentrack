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

/** Litros — máx. 1 decimal + sufijo L (spec Destilador). */
export function fmtLitros(n: number): string {
  const v = Math.round(n * 10) / 10
  return `${v.toLocaleString('es-MX', { maximumFractionDigits: 1 })} L`
}
