import type { SkuRow } from '@/lib/supabase/distribuidor'
import type { AlertaOperativa, InicioEstado } from './types'

export function buildAlertasFromSkus(skus: SkuRow[]): AlertaOperativa[] {
  const alertas: AlertaOperativa[] = []

  skus.forEach(s => {
    const stockDisponible = s.stock_disponible
    const stockTotal = s.stock_total
    const stockReservado = s.stock_reservado

    if (s.estado === 'sobrevendido' || stockReservado > stockTotal) {
      alertas.push({
        id: `sov-${s.id}`,
        nivel: 'P1',
        condicion: 'sobrevendido',
        titulo: `${s.nombre} — sobrevendido`,
        subtexto: `Reservado ${stockReservado} bts · Disponible ${stockDisponible} bts`,
        color: 'rojo',
        acciones: [
          { label: 'Ver inventario', href: '/dashboard/inventario' },
          { label: 'Ver pedidos', href: '/dashboard/pedidos' },
        ],
      })
    }

    if (s.estado === 'quiebre' || stockDisponible <= 0) {
      alertas.push({
        id: `agot-${s.id}`,
        nivel: 'P1',
        condicion: 'quiebre_inminente',
        titulo: `${s.nombre} en quiebre`,
        subtexto:
          stockDisponible <= 0
            ? '0 botellas disponibles'
            : `Solo ${stockDisponible} bts disponibles`,
        color: 'rojo',
        acciones: [{ label: 'Registrar entrada', href: '/dashboard/recepcion' }],
      })
    }

    if (s.dias_sin_movimiento > 60 && stockDisponible > 0 && s.estado !== 'muerto') {
      alertas.push({
        id: `muerto-${s.id}`,
        nivel: 'P5',
        condicion: 'sku_sin_rotar',
        titulo: `${s.nombre} sin rotar`,
        subtexto: `${s.dias_sin_movimiento} días sin movimiento`,
        color: 'pasivo',
        acciones: [{ label: 'Ver inventario', href: '/dashboard/inventario' }],
      })
    }

    if (s.estado === 'muerto') {
      alertas.push({
        id: `capital-${s.id}`,
        nivel: 'P5',
        condicion: 'sku_sin_rotar',
        titulo: `${s.nombre} — capital muerto`,
        subtexto: `${s.dias_sin_movimiento} días sin movimiento · ${stockDisponible} bts`,
        color: 'pasivo',
        acciones: [{ label: 'Ver inventario', href: '/dashboard/inventario' }],
      })
    }

    if (s.estado === 'bajo') {
      const already = alertas.some(a => a.id === `agot-${s.id}`)
      if (!already) {
        alertas.push({
          id: `bajo-${s.id}`,
          nivel: 'P4',
          condicion: 'pedido_incompleto_hoy',
          titulo: `Stock bajo — ${s.nombre}`,
          subtexto: `${stockDisponible} bts (mín. ${s.stock_minimo})`,
          color: 'amarillo',
          acciones: [{ label: 'Ver inventario', href: '/dashboard/inventario' }],
        })
      }
    }
  })

  const order: Record<string, number> = {
    P1: 0,
    P2: 1,
    P3: 2,
    P4: 3,
    P5: 4,
    P6: 5,
  }
  return alertas.sort((a, b) => (order[a.nivel] ?? 9) - (order[b.nivel] ?? 9))
}

export function resolverEstadoInicio(
  productCount: number,
  alertas: AlertaOperativa[]
): InicioEstado {
  if (productCount === 0) return 'vacio'

  const criticas = alertas.filter(a => a.nivel === 'P1' || a.nivel === 'P2')
  const sobrevendido = alertas.some(a => a.condicion === 'sobrevendido')
  if (criticas.length >= 3 || sobrevendido) return 'crisis'

  const urgentes = alertas.filter(
    a => a.nivel === 'P1' || a.nivel === 'P2' || a.nivel === 'P3' || a.nivel === 'P4'
  )
  if (urgentes.length === 0) return 'tranquilo'

  return 'activo'
}
