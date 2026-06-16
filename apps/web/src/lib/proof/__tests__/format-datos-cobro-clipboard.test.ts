import { describe, expect, it } from 'vitest'
import {
  formatDatosCobroClipboard,
  resolveTitularCuenta,
} from '@/lib/proof/format-datos-cobro-clipboard'

describe('format-datos-cobro-clipboard', () => {
  it('incluye titular, banco y cuenta', () => {
    expect(
      formatDatosCobroClipboard({
        titular: 'Distribuidora Norte SA de CV',
        banco: 'BBVA',
        cuenta: '058020978743900152',
      })
    ).toBe(
      'Titular: Distribuidora Norte SA de CV\nBanco: BBVA\nCLABE/Cuenta: 058020978743900152'
    )
  })

  it('usa username si no hay titular', () => {
    expect(resolveTitularCuenta(null, 'Mi Negocio')).toBe('Mi Negocio')
    expect(
      formatDatosCobroClipboard({
        username: 'Mi Negocio',
        cuenta: '012345678901234567',
      })
    ).toContain('Titular: Mi Negocio')
  })
})
