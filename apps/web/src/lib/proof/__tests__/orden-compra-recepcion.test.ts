import { describe, expect, it } from 'vitest'
import {
  lineasRecepcionCompleta,
  pendienteIngresoUnidades,
} from '@/lib/supabase/distribuidor'

describe('orden compra recepción helpers', () => {
  it('calcula pendiente de ingreso', () => {
    expect(
      pendienteIngresoUnidades([
        { id: 'a', cantidad_ordenada: 24, cantidad_recibida: 0 },
        { id: 'b', cantidad_ordenada: 10, cantidad_recibida: 10 },
      ])
    ).toBe(24)
  })

  it('arma líneas de recepción completa', () => {
    expect(
      lineasRecepcionCompleta([
        { id: 'a', cantidad_ordenada: 24, cantidad_recibida: 0 },
      ])
    ).toEqual([{ item_id: 'a', cantidad_recibida: 24 }])
  })
})
