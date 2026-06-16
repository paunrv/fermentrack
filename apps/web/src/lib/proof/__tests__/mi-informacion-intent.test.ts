import { describe, expect, it } from 'vitest'
import { tryDistributorQuickAnswer } from '@/lib/proof/distributor-agent-answers'
import { parseActualizarMiInformacionIntent } from '@/lib/proof/mi-informacion-intent'
import { parseDistributorActionIntent } from '@/lib/proof/distributor-agent-actions'
import { makeDistributorContext } from './fixtures/distributor-context'

describe('mi-informacion-intent', () => {
  it('detecta consulta de CLABE', () => {
    const ctx = makeDistributorContext({
      mi_informacion: {
        titular_cuenta: 'Distribuidora Norte SA de CV',
        cuenta_deposito: '012345678901234567',
        banco_deposito: 'BBVA',
        tiene_constancia_fiscal: true,
      },
    })
    const ans = tryDistributorQuickAnswer('cuál es mi clabe', ctx as unknown as Record<string, unknown>)
    expect(ans?.mensaje).toContain('012345678901234567')
    expect(ans?.mensaje).toContain('BBVA')
    expect(ans?.mensaje).toContain('Distribuidora Norte')
  })

  it('parsea actualización de cuenta', () => {
    const parsed = parseActualizarMiInformacionIntent(
      'configura mi cuenta BBVA clabe 012345678901234567'
    )
    expect(parsed?.cuenta_deposito).toBe('012345678901234567')
    expect(parsed?.banco_deposito).toBe('BBVA')
  })

  it('genera acción de agente', () => {
    const action = parseDistributorActionIntent(
      'mi clabe es 012345678901234567 banco santander',
      makeDistributorContext()
    )
    expect(action?.type).toBe('actualizar_mi_informacion')
    if (action?.type === 'actualizar_mi_informacion') {
      expect(action.cuenta_deposito).toBe('012345678901234567')
      expect(action.banco_deposito).toBe('Santander')
    }
  })

  it('parsea actualización de titular', () => {
    const parsed = parseActualizarMiInformacionIntent(
      'actualizar nombre de Mi Inofrmación: Paulina Noriega Romero Vargas'
    )
    expect(parsed?.titular_cuenta).toBe('Paulina Noriega Romero Vargas')
    expect(parsed?.cuenta_deposito).toBeUndefined()
  })

  it('genera acción de agente para titular', () => {
    const action = parseDistributorActionIntent(
      'actualizar nombre de Mi Información: Paulina Noriega Romero Vargas',
      makeDistributorContext()
    )
    expect(action?.type).toBe('actualizar_mi_informacion')
    if (action?.type === 'actualizar_mi_informacion') {
      expect(action.titular_cuenta).toBe('Paulina Noriega Romero Vargas')
    }
  })

  it('parsea actualización de banco', () => {
    const parsed = parseActualizarMiInformacionIntent('actualizar nombre del banco: Banregio')
    expect(parsed?.banco_deposito).toBe('Banregio')
    expect(parsed?.cuenta_deposito).toBeUndefined()
  })

  it('genera acción de agente para banco', () => {
    const action = parseDistributorActionIntent(
      'actualizar nombre del banco: Banregio',
      makeDistributorContext()
    )
    expect(action?.type).toBe('actualizar_mi_informacion')
    if (action?.type === 'actualizar_mi_informacion') {
      expect(action.banco_deposito).toBe('Banregio')
    }
  })
})
