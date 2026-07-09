'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/context/ProfileContext'
import { buildDistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import {
  fetchCuentasPorCobrarActivas,
  fetchPedidos,
  fetchSkus,
} from '@/lib/supabase/distribuidor'
import {
  fetchCorridas,
  fetchLotes,
  sumSaldosPalenqueros,
} from '@/lib/supabase/destilador'

export type OpsHomeKpi = {
  id: string
  labelKey: string
  value: string
  href: string
}

export type OpsHomeKpisState = {
  loading: boolean
  error: string | null
  kpis: OpsHomeKpi[]
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n)
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtLiters(n: number): string {
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n)} L`
}

async function loadDistributorKpis(
  supabase: ReturnType<typeof useAuth>['supabase'],
  scope: NonNullable<ReturnType<typeof useProfile>['scope']>
): Promise<OpsHomeKpi[]> {
  const [skus, pedidos, cuentas] = await Promise.all([
    fetchSkus(supabase, scope),
    fetchPedidos(supabase, scope, { limit: 100 }),
    fetchCuentasPorCobrarActivas(supabase, scope),
  ])
  const { resumen } = buildDistributorAgentContext(skus, pedidos, cuentas)
  return [
    {
      id: 'stock',
      labelKey: 'kpis.stock',
      value: fmtInt(resumen.stockDisponibleTotal),
      href: '/dashboard/inventario',
    },
    {
      id: 'orders',
      labelKey: 'kpis.orders',
      value: fmtInt(resumen.pedidosActivos),
      href: '/dashboard/pedidos',
    },
    {
      id: 'receivable',
      labelKey: 'kpis.receivable',
      value: fmtMoney(resumen.total_por_cobrar),
      href: '/dashboard/credito',
    },
    {
      id: 'shortage',
      labelKey: 'kpis.shortage',
      value: fmtInt(resumen.quiebre),
      href: '/dashboard/inventario',
    },
  ]
}

async function loadDistillerKpis(
  supabase: ReturnType<typeof useAuth>['supabase'],
  userId: string
): Promise<OpsHomeKpi[]> {
  const [lotes, corridas, deuda] = await Promise.all([
    fetchLotes(supabase, userId, { limit: 100 }),
    fetchCorridas(supabase, userId, { estado: 'activa', limit: 50 }),
    sumSaldosPalenqueros(supabase, userId),
  ])
  const litrosGranelTotal = lotes.reduce(
    (sum, lot) => sum + Number(lot.litros_disponibles_granel ?? 0),
    0
  )
  return [
    {
      id: 'liters',
      labelKey: 'kpis.liters',
      value: fmtLiters(litrosGranelTotal),
      href: '/dashboard/destilador/bodega',
    },
    {
      id: 'lots',
      labelKey: 'kpis.lots',
      value: fmtInt(lotes.length),
      href: '/dashboard/destilador/lotes',
    },
    {
      id: 'owed',
      labelKey: 'kpis.owed',
      value: fmtMoney(deuda),
      href: '/dashboard/destilador/compras',
    },
    {
      id: 'runs',
      labelKey: 'kpis.runs',
      value: fmtInt(corridas.length),
      href: '/dashboard/destilador/produccion',
    },
  ]
}

export function useOpsHomeKpis(profileType: ProfileType): OpsHomeKpisState {
  const { supabase, user, isLoaded } = useAuth()
  const { scope } = useProfile()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kpis, setKpis] = useState<OpsHomeKpi[]>([])

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        let next: OpsHomeKpi[] = []
        if (profileType === 'distributor' && scope) {
          next = await loadDistributorKpis(supabase, scope)
        } else if (profileType === 'distiller') {
          next = await loadDistillerKpis(supabase, user.id)
        }
        if (!cancelled) setKpis(next)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'load_failed')
          setKpis([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoaded, user?.id, profileType, scope, supabase])

  return { loading, error, kpis }
}
