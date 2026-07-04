'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/context/OrganizationContext'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerOwnerCopy } from '@/hooks/useWinemakerOwnerCopy'
import { buildOwnerAlertDescriptors, type OwnerLotEventRow } from '@/lib/proof/winemaker-owner-alerts'
import { buildPipelineLots, type PipelineLot } from '@/lib/proof/pipeline-lot-meta'
import { fetchExistenciaLotIds } from '@/lib/proof/record-lot-bottling'
import { fetchPlanHomeWarnings, type PlanHomeWarnings } from '@/lib/proof/plan-limit-warnings'
import type { AlertaOperativa } from '@/lib/proof/types'
import {
  completeTask as completeTaskRow,
  fetchActiveLots,
  fetchLotEvents,
  fetchOwnerOrganizationId,
  fetchPendingTasks,
  fetchProfileFirstName,
  fetchTasksToday,
  fetchTeamMembers,
  type OwnerLotRow,
  type OwnerTaskRow,
  type OwnerTeamMember,
} from '@/lib/supabase/winemaker-owner-home'

export type WinemakerOwnerHomeData = {
  loading: boolean
  error: string | null
  firstName: string
  displayName: string
  organizationId: string | null
  lots: OwnerLotRow[]
  pipelineLots: PipelineLot[]
  alerts: AlertaOperativa[]
  attentionLotCount: number
  tasksToday: OwnerTaskRow[]
  pendingTasks: OwnerTaskRow[]
  team: OwnerTeamMember[]
  completingTaskId: string | null
  completeTask: (taskId: string) => Promise<void>
  reload: () => Promise<void>
  planWarnings: PlanHomeWarnings | null
}

export function useWinemakerOwnerHomeData(): WinemakerOwnerHomeData {
  const supabase = useSupabase()
  const { user } = useAuth()
  const { activeOrg } = useOrganization()
  const { scope } = useProfile()
  const userId = scope?.user_id ?? user?.id
  const copy = useWinemakerOwnerCopy()
  const tHome = useTranslations('winemaker.home')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [lots, setLots] = useState<OwnerLotRow[]>([])
  const [events, setEvents] = useState<OwnerLotEventRow[]>([])
  const [alerts, setAlerts] = useState<AlertaOperativa[]>([])
  const [attentionLotCount, setAttentionLotCount] = useState(0)
  const [tasksToday, setTasksToday] = useState<OwnerTaskRow[]>([])
  const [pendingTasks, setPendingTasks] = useState<OwnerTaskRow[]>([])
  const [team, setTeam] = useState<OwnerTeamMember[]>([])
  const [existenciaLotIds, setExistenciaLotIds] = useState<Set<string>>(new Set())
  const [planWarnings, setPlanWarnings] = useState<PlanHomeWarnings | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const [orgId, name] = await Promise.all([
        fetchOwnerOrganizationId(supabase, userId),
        fetchProfileFirstName(supabase, userId),
      ])
      const resolvedOrgId = orgId ?? activeOrg?.id ?? null
      setFirstName(name)
      setOrganizationId(resolvedOrgId)

      if (!resolvedOrgId) {
        setLots([])
        setEvents([])
        setAlerts([])
        setAttentionLotCount(0)
        setTasksToday([])
        setPendingTasks([])
        setTeam([])
        setExistenciaLotIds(new Set())
        setPlanWarnings(null)
        return
      }

      const [activeLots, todayTasks, pending, members, warnings] = await Promise.all([
        fetchActiveLots(supabase, resolvedOrgId),
        fetchTasksToday(supabase, resolvedOrgId, userId),
        fetchPendingTasks(supabase, resolvedOrgId, userId),
        fetchTeamMembers(supabase, resolvedOrgId),
        fetchPlanHomeWarnings(supabase, resolvedOrgId),
      ])

      const lotIds = activeLots.map(l => l.id)
      const [events, bottledLotIds] = await Promise.all([
        fetchLotEvents(supabase, resolvedOrgId, lotIds),
        fetchExistenciaLotIds(supabase, resolvedOrgId, lotIds),
      ])
      const descriptors = buildOwnerAlertDescriptors(activeLots, events)
      const computedAlerts = copy.mapAlerts(descriptors)
      const lotIdsWithAlerts = new Set(descriptors.map(d => d.lotId))

      setLots(activeLots)
      setEvents(events)
      setExistenciaLotIds(bottledLotIds)
      setAlerts(computedAlerts)
      setAttentionLotCount(lotIdsWithAlerts.size)
      setTasksToday(todayTasks)
      setPendingTasks(pending)
      setTeam(members)
      setPlanWarnings(warnings)
    } catch (err) {
      const msg = err instanceof Error ? err.message : tHome('loadError')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, activeOrg?.id, copy, tHome])

  useEffect(() => {
    void load()
  }, [load])

  const completeTask = useCallback(
    async (taskId: string) => {
      setCompletingTaskId(taskId)
      try {
        await completeTaskRow(supabase, taskId)
        setTasksToday(prev => prev.filter(t => t.id !== taskId))
        setPendingTasks(prev => prev.filter(t => t.id !== taskId))
      } catch (err) {
        console.error('[useWinemakerOwnerHomeData] complete task', err)
      } finally {
        setCompletingTaskId(null)
      }
    },
    [supabase]
  )

  const displayName = useMemo(
    () => firstName || copy.defaultFirstName,
    [firstName, copy.defaultFirstName]
  )

  const pipelineLots = useMemo(
    () => buildPipelineLots(lots, events, Date.now(), existenciaLotIds),
    [lots, events, existenciaLotIds]
  )

  return {
    loading,
    error,
    firstName,
    displayName,
    organizationId,
    lots,
    pipelineLots,
    alerts,
    attentionLotCount,
    tasksToday,
    pendingTasks,
    team,
    completingTaskId,
    completeTask,
    reload: load,
    planWarnings,
  }
}
