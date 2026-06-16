/** Nombre del titular para depósitos: campo dedicado o nombre del perfil. */
export function resolveTitularCuenta(
  titular: string | null | undefined,
  username: string | null | undefined
): string {
  const t = titular?.trim()
  if (t) return t
  return username?.trim() ?? ''
}

/** Texto listo para WhatsApp / correo al compartir datos de cobro. */
export function formatDatosCobroClipboard(opts: {
  titular?: string | null
  username?: string | null
  banco?: string | null
  cuenta?: string | null
}): string {
  const titular = resolveTitularCuenta(opts.titular, opts.username)
  const banco = opts.banco?.trim() ?? ''
  const cuenta = opts.cuenta?.trim() ?? ''
  const lines: string[] = []
  if (titular) lines.push(`Titular: ${titular}`)
  if (banco) lines.push(`Banco: ${banco}`)
  if (cuenta) lines.push(`CLABE/Cuenta: ${cuenta}`)
  return lines.join('\n')
}
