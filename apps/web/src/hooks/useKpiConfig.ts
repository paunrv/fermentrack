'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  DEFAULT_METRICS,
  type KpiMetric,
  type ProfileType,
} from '@/lib/proof/kpi-metrics'

export type KpiScope = 'all' | 'single'

export interface KpiConfig {
  slot: number
  metric: string
  scope: KpiScope
  scopeId?: string
}

function buildDefaultConfig(profileType: ProfileType): KpiConfig[] {
  const metrics = DEFAULT_METRICS[profileType]
  return ([0, 1, 2] as const).map(slot => ({
    slot,
    metric: metrics[slot],
    scope: 'all' as KpiScope,
  }))
}

function rowScopeToApp(scope: string): KpiScope {
  return scope === 'lote_id' || scope === 'single' ? 'single' : 'all'
}

function appScopeToRow(scope: KpiScope): 'all' | 'lote_id' {
  return scope === 'single' ? 'lote_id' : 'all'
}

async function loadConfig(
  clerkId: string,
  profileType: ProfileType,
  loteId: string | undefined,
  supabase: SupabaseClient
): Promise<KpiConfig[]> {
  const { data, error } = await supabase
    .from('kpi_config')
    .select('slot, metric, scope, scope_id')
    .eq('clerk_id', clerkId)
    .eq('profile_type', profileType)
    .order('slot')

  if (error) {
    if (error.message.includes('does not exist') || error.code === 'PGRST205') {
      return buildDefaultConfig(profileType)
    }
    throw error
  }

  const defaults = buildDefaultConfig(profileType)
  const globalBySlot = new Map<number, KpiConfig>()
  const singleBySlot = new Map<number, KpiConfig>()

  for (const row of data ?? []) {
    const slot = Number(row.slot)
    const scopeId = row.scope_id as string | null
    const entry: KpiConfig = {
      slot,
      metric: row.metric as string,
      scope: rowScopeToApp(row.scope as string),
      ...(scopeId ? { scopeId } : {}),
    }
    if (scopeId) singleBySlot.set(slot, entry)
    else globalBySlot.set(slot, entry)
  }

  return defaults.map(d => {
    if (loteId && singleBySlot.has(d.slot)) {
      const s = singleBySlot.get(d.slot)!
      if (s.scopeId === loteId) return s
    }
    return globalBySlot.get(d.slot) ?? d
  })
}

export function useKpiConfig(profileType: ProfileType, loteId?: string) {
  const supabase = useSupabase()
  const { scope } = useProfile()
  const clerkId = scope?.clerk_id

  const [config, setConfig] = useState<KpiConfig[]>(() => buildDefaultConfig(profileType))
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!clerkId) {
      setConfig(buildDefaultConfig(profileType))
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const rows = await loadConfig(clerkId, profileType, loteId, supabase)
      setConfig(rows)
    } catch {
      setConfig(buildDefaultConfig(profileType))
    } finally {
      setLoading(false)
    }
  }, [supabase, clerkId, profileType, loteId])

  useEffect(() => {
    void reload()
  }, [reload])

  const updateKpi = useCallback(
    async (slot: number, metric: string, kpiScope: KpiScope) => {
      if (!clerkId) return

      const rowScope = appScopeToRow(kpiScope)
      const scopeId = kpiScope === 'single' && loteId ? loteId : null

      setConfig(prev =>
        prev.map(c =>
          c.slot === slot
            ? {
                slot,
                metric,
                scope: kpiScope,
                ...(scopeId ? { scopeId } : {}),
              }
            : c
        )
      )

      if (kpiScope === 'all') {
        const { error: delErr } = await supabase
          .from('kpi_config')
          .delete()
          .eq('clerk_id', clerkId)
          .eq('profile_type', profileType)
          .eq('slot', slot)
          .not('scope_id', 'is', null)

        if (delErr && !delErr.message.includes('does not exist')) {
          console.error('kpi_config delete overrides:', delErr.message)
        }
      }

      const { error } = await supabase.from('kpi_config').upsert(
        {
          clerk_id: clerkId,
          profile_type: profileType,
          slot,
          metric,
          scope: rowScope,
          scope_id: scopeId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_id,profile_type,slot,scope_id' }
      )

      if (error && !error.message.includes('does not exist')) {
        console.error('kpi_config upsert:', error.message)
        await reload()
      }
    },
    [supabase, clerkId, profileType, loteId, reload]
  )

  return { config, updateKpi, loading }
}

export type { KpiMetric, ProfileType }
