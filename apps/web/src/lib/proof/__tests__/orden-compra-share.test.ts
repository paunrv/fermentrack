import { describe, expect, it } from 'vitest'
import { buildOrdenCompraShareText } from '@/lib/proof/orden-compra-share'

const TEST_USER_ID = 'cd459e32-718d-46da-9003-5b002c483cfd'

describe('buildOrdenCompraShareText', () => {
  it('export logístico antes de recibir', () => {
    const text = buildOrdenCompraShareText({
      numero: 'OC-001',
      proveedor: 'Cervecería Norte',
      fecha: '2026-06-14',
      estado: 'pendiente',
      lineas: [{ producto_nombre: 'IPA', cantidad_ordenada: 50 }],
    })
    expect(text).toContain('OC-001')
    expect(text).toContain('Cervecería Norte')
    expect(text).toContain('pendiente de llegada')
    expect(text).not.toContain('Saldo')
  })

  it('export completo tras recibir con CxP', () => {
    const text = buildOrdenCompraShareText({
      numero: 'OC-002',
      proveedor: 'Mezcal del Valle',
      fecha: '2026-06-10',
      estado: 'recibida',
      lineas: [
        { producto_nombre: 'Silvana', cantidad_ordenada: 24, cantidad_recibida: 24 },
      ],
      cxp: {
        monto_total: 12000,
        saldo_pendiente: 5000,
        pagos: [
          {
            id: 'p1',
            user_id: TEST_USER_ID,
            profile_type_v2: 'distributor',
            cuenta_por_pagar_id: 'c1',
            monto: 7000,
            metodo: 'transferencia',
            referencia: null,
            fecha_pago: '2026-06-12',
            nota: null,
            created_at: '2026-06-12',
          },
        ],
      },
    })
    expect(text).toContain('Saldo pendiente')
    expect(text).toContain('Pago')
  })
})
