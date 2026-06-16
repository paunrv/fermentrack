function normQ(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

const BANCOS = [
  'bbva',
  'santander',
  'banorte',
  'hsbc',
  'scotiabank',
  'citibanamex',
  'banamex',
  'inbursa',
  'azteca',
  'banregio',
  'afirme',
  'bajio',
  'monex',
] as const

function formatBancoName(token: string): string {
  const n = normQ(token)
  for (const b of BANCOS) {
    if (n === b || n.includes(b)) {
      if (b === 'bbva') return 'BBVA'
      if (b === 'banamex' || b === 'citibanamex') return 'Citibanamex'
      if (b === 'azteca') return 'Banco Azteca'
      if (b === 'bajio') return 'Bajío'
      return b.charAt(0).toUpperCase() + b.slice(1)
    }
  }
  return token.trim()
}

export function extractCuentaDepositoFromQuery(query: string): string | null {
  const q = query.trim()
  const clabe18 = q.match(/\b(\d{18})\b/)
  if (clabe18) return clabe18[1]!

  const labeled = q.match(
    /(?:clabe|clave|cuenta(?:\s+de\s+dep[oó]sito)?|n[uú]mero\s+de\s+(?:clabe|clave|cuenta))\s*(?:es|:)?\s*([\d\s-]{10,24})/i
  )
  if (labeled) {
    const digits = labeled[1]!.replace(/[\s-]/g, '')
    if (digits.length >= 10 && digits.length <= 20) return digits
  }

  const loose = q.match(/\b(\d{10,20})\b/)
  if (loose && looksLikeActualizarMiInformacionQuery(query)) return loose[1]!

  return null
}

export function extractBancoDepositoFromQuery(query: string): string | null {
  const labeledPatterns = [
    /nombre\s+del?\s+banco\s*:\s*['"]?([^'"\n]+?)['"]?\s*$/i,
    /(?:actualiz\w*|cambiar|poner|guardar|registr\w*)\s+(?:el\s+)?(?:nombre\s+del?\s+)?banco\s*:\s*['"]?([^'"\n]+?)['"]?\s*$/i,
    /^banco\s*:\s*['"]?([^'"\n]+?)['"]?\s*$/i,
    /banco\s+(?:es)\s*['"]?([^'"\n]+?)['"]?\s*$/i,
  ]
  for (const pattern of labeledPatterns) {
    const match = query.match(pattern)
    const raw = match?.[1]?.trim().replace(/^['"]|['"]$/g, '')
    if (raw && raw.length >= 2) return formatBancoName(raw)
  }

  const n = normQ(query)

  for (const b of BANCOS) {
    if (n.includes(b)) {
      return formatBancoName(b)
    }
  }

  const m = query.match(/\bbanco\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ][\w\sáéíóúÁÉÍÓÚñÑ.-]{1,28})/i)
  if (m) {
    const name = m[1]!
      .replace(/\b(clabe|cuenta|es)\b.*$/i, '')
      .trim()
    if (name.length >= 2) return formatBancoName(name)
  }

  return null
}

export function looksLikeMiInformacionQuery(query: string): boolean {
  const n = normQ(query)
  if (looksLikeActualizarMiInformacionQuery(query)) return false

  if (
    n.includes('mi informacion') ||
    n.includes('datos para cobro') ||
    n.includes('datos de cobro') ||
    n.includes('constancia fiscal') ||
    n.includes('mi clabe') ||
    n.includes('mi clave') ||
    n.includes('mi cuenta de deposito') ||
    n.includes('cuenta de deposito') ||
    n.includes('numero de cuenta para') ||
    n.includes('donde me depositan') ||
    n.includes('donde depositan') ||
    n.includes('datos bancarios') ||
    n.includes('datos de pago')
  ) {
    return true
  }

  if (n.includes('clabe') && !n.includes('por cobrar') && !n.includes('por pagar')) {
    return true
  }

  if (
    (n.includes('cuenta') || n.includes('cuanto me deposit')) &&
    (n.includes('cobro') || n.includes('deposit') || n.includes('cliente') && n.includes('paguen'))
  ) {
    return true
  }

  return false
}

export function extractTitularCuentaFromQuery(query: string): string | null {
  const patterns = [
    /(?:titular|nombre(?:\s+del?\s+titular)?)\s*(?:es|:)\s*['"]?([^'"\n]+?)['"]?\s*$/i,
    /nombre\s+de\s+mi\s+in\w*maci[oó]n\s*:\s*['"]?([^'"\n]+?)['"]?\s*$/i,
    /(?:actualiz\w*|cambiar|poner|guardar|registr\w*)\s+(?:el\s+)?nombre\s+(?:del?\s+titular|de\s+mi\s+in\w*maci[oó]n)\s*(?::|a)\s*['"]?([^'"\n]+?)['"]?\s*$/i,
  ]
  for (const pattern of patterns) {
    const match = query.match(pattern)
    const name = match?.[1]?.trim().replace(/^['"]|['"]$/g, '')
    if (name && name.length >= 3) return name
  }
  return null
}

export function looksLikeActualizarMiInformacionQuery(query: string): boolean {
  const n = normQ(query)
  const cuenta = extractCuentaDepositoFromQuery(query)
  const titular = extractTitularCuentaFromQuery(query)

  if (titular) return true
  if (extractBancoDepositoFromQuery(query) && /(configur|actualiz|guard|cambiar|poner|registr|establec|banco\s*:)/.test(n)) {
    return true
  }

  if (
    /(configur|actualiz|guard|cambiar|poner|registr|establec)/.test(n) &&
    (n.includes('clabe') ||
      n.includes('clave') ||
      n.includes('titular') ||
      (n.includes('nombre') && /in\w*maci[oó]n/.test(n)) ||
      n.includes('cuenta de deposito') ||
      n.includes('datos bancarios') ||
      n.includes('datos de cobro') ||
      n.includes('mi informacion') ||
      n.includes('mi inofrmacion') ||
      n.includes('banco'))
  ) {
    return true
  }

  if (/clabe\s*(es|:)/.test(n) && cuenta) return true
  if (/clave\s*(es|:)/.test(n) && cuenta) return true
  if (/cuenta\s*(es|:)/.test(n) && cuenta && !n.includes('por cobrar')) return true
  if (cuenta && extractBancoDepositoFromQuery(query)) return true

  return false
}

export function parseActualizarMiInformacionIntent(query: string): {
  cuenta_deposito?: string
  banco_deposito?: string
  titular_cuenta?: string
} | null {
  if (!looksLikeActualizarMiInformacionQuery(query)) return null
  const cuenta = extractCuentaDepositoFromQuery(query)
  const titular = extractTitularCuentaFromQuery(query)
  const banco = extractBancoDepositoFromQuery(query)
  if (!cuenta && !titular && !banco) return null
  return {
    ...(cuenta ? { cuenta_deposito: cuenta } : {}),
    ...(banco ? { banco_deposito: banco } : {}),
    ...(titular ? { titular_cuenta: titular } : {}),
  }
}
