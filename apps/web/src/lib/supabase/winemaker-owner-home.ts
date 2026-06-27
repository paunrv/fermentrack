import type { SupabaseClient } from '@supabase/supabase-js'
import { PROOF_PROFILES_TABLE, type ExtraProfile } from '@/lib/supabase'
import type { AlertaOperativa } from '@/lib/proof/types'

const TEMP_MIN = 15
const TEMP_MAX = 17
const STALE_DAYS = 3
const EVENT_WINDOW_DAYS = 7

const STAGE_LABELS: Record<string, string> = {
  harvest: 'Cosecha',
  fermentation: 'Fermentación',
  malolactic: 'Maloláctica',
  aging: 'Crianza',
  bottling: 'Embotellado',
  bottled: 'Embotellado',
}

export type OwnerLotRow = {
  id: string
  code: string
  current_stage: string | null
  varietal: string | null
  created_at: string
}

export type OwnerTaskRow = {
  id: string
  title: string
  due_at: string | null
  status: string
  assigned_to: string | null
  assigneeName: string | null
}

export type OwnerTeamMember = {
  id: string
  userId: string
  fullName: string | null
  orgRole: string
  profileType: ExtraProfile | null
}

type EventRow = {
  id: string
  lot_id: string | null
  event_type: string
  payload: unknown
  occurred_at: string
}

type LotQueryRow = {
  id: string
  code: string
  current_stage: string | null
  created_at: string
  lot_grape_inputs: unknown
}

export function varietalNamesFromInputs(inputs: unknown): string[] {
  if (!Array.isArray(inputs)) return []
  const names: string[] = []
  for (const row of inputs) {
    if (!row || typeof row !== 'object') continue
    const varietals = (row as { varietals?: unknown }).varietals
    if (Array.isArray(varietals)) {
      for (const v of varietals) {
        if (v && typeof v === 'object' && typeof (v as { name?: unknown }).name === 'string') {
          names.push((v as { name: string }).name)
        }
      }
    } else if (varietals && typeof varietals === 'object' && typeof (varietals as { name?: unknown }).name === 'string') {
      names.push((varietals as { name: string }).name)
    }
  }
  return names
}

export function greetingForHour(date = new Date()): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function stageLabel(stage: string | null): string {
  if (!stage) return 'Sin etapa'
  return STAGE_LABELS[stage] ?? stage
}

function parseTemp(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null
  const temp = (payload as Record<string, unknown>).temp_c
  if (typeof temp === 'number' && Number.isFinite(temp)) return temp
  if (typeof temp === 'string') {
    const n = parseFloat(temp)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export async function fetchOwnerOrganizationId(
  sb: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await sb
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.organization_id ?? null
}

export async function fetchProfileFirstName(
  sb: SupabaseClient,
  userId: string
): Promise<string> {
  const { data, error } = await sb
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  const fullName = data?.full_name?.trim()
  if (!fullName) return 'Aldo'
  return fullName.split(/\s+/)[0] || fullName
}

function isMissingTasksTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || (error.message ?? '').toLowerCase().includes('tasks')
}

export async function fetchActiveLots(
  sb: SupabaseClient,
  organizationId: string
): Promise<OwnerLotRow[]> {
  const { data, error } = await sb
    .from('lots')
    .select('id, code, current_stage, created_at, lot_grape_inputs(varietals(name))')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('code')

  if (error) throw error

  return ((data ?? []) as LotQueryRow[]).map(lot => {
    const varietalNames = varietalNamesFromInputs(lot.lot_grape_inputs)
    return {
      id: lot.id,
      code: lot.code,
      current_stage: lot.current_stage,
      varietal: varietalNames.length > 0 ? varietalNames.join(', ') : null,
      created_at: lot.created_at,
    }
  })
}

export async function fetchLotEvents(
  sb: SupabaseClient,
  organizationId: string,
  lotIds: string[]
): Promise<EventRow[]> {
  if (lotIds.length === 0) return []

  const { data, error } = await sb
    .from('events')
    .select('id, lot_id, event_type, payload, occurred_at')
    .eq('organization_id', organizationId)
    .in('lot_id', lotIds)
    .order('occurred_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as EventRow[]
}

export function buildOwnerAlerts(lots: OwnerLotRow[], events: EventRow[]): AlertaOperativa[] {
  const alerts: AlertaOperativa[] = []
  const lotById = new Map(lots.map(l => [l.id, l]))
  const now = Date.now()
  const windowStart = now - EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000

  for (const ev of events) {
    if (ev.event_type !== 'FERMENTATION_MONITORING' || !ev.lot_id) continue
    if (new Date(ev.occurred_at).getTime() < windowStart) continue
    const temp = parseTemp(ev.payload)
    if (temp == null || (temp >= TEMP_MIN && temp <= TEMP_MAX)) continue
    const lot = lotById.get(ev.lot_id)
    if (!lot) continue
    alerts.push({
      id: `temp-${ev.id}`,
      nivel: 'P1',
      condicion: 'quiebre_inminente',
      titulo: `🌡️ ${lot.code} — temp fuera de rango`,
      subtexto: `${temp}°C · esperado 15–17°C`,
      color: 'rojo',
      acciones: [{ label: 'Ver lote', href: `/dashboard/lotes/${lot.id}` }],
    })
  }

  const lastEventByLot = new Map<string, string>()
  for (const ev of events) {
    if (!ev.lot_id) continue
    const prev = lastEventByLot.get(ev.lot_id)
    if (!prev || ev.occurred_at > prev) lastEventByLot.set(ev.lot_id, ev.occurred_at)
  }

  for (const lot of lots) {
    const last = lastEventByLot.get(lot.id)
    const reference = last ? new Date(last).getTime() : new Date(lot.created_at).getTime()
    const daysSince = Math.floor((now - reference) / (24 * 60 * 60 * 1000))
    if (daysSince <= STALE_DAYS) continue
    alerts.push({
      id: `stale-${lot.id}`,
      nivel: 'P2',
      condicion: 'sku_sin_rotar',
      titulo: `🧪 ${lot.code} · ${daysSince} días sin registro`,
      subtexto: last ? `Último evento hace ${daysSince} días` : 'Sin eventos registrados',
      color: 'amarillo',
      acciones: [{ label: 'Ver lote', href: `/dashboard/lotes/${lot.id}` }],
    })
  }

  return alerts
}

export async function fetchTasksToday(
  sb: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<OwnerTaskRow[]> {
  const start = startOfToday().toISOString()
  const end = endOfToday().toISOString()

  const { data, error } = await sb
    .from('tasks')
    .select('id, title, due_at, status, assigned_to')
    .eq('organization_id', organizationId)
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .gte('due_at', start)
    .lte('due_at', end)
    .order('due_at', { ascending: true })

  if (error) {
    if (isMissingTasksTable(error)) return []
    throw error
  }

  return (data ?? []).map(row => ({
    id: row.id,
    title: row.title,
    due_at: row.due_at,
    status: row.status,
    assigned_to: row.assigned_to,
    assigneeName: null,
  }))
}

export async function fetchPendingTasks(
  sb: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<OwnerTaskRow[]> {
  const { data, error } = await sb
    .from('tasks')
    .select('id, title, due_at, status, assigned_to')
    .eq('organization_id', organizationId)
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) {
    if (isMissingTasksTable(error)) return []
    throw error
  }

  const rows = data ?? []
  const assigneeIds = [...new Set(rows.map(r => r.assigned_to).filter(Boolean))] as string[]
  const names = new Map<string, string>()

  if (assigneeIds.length > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, full_name')
      .in('id', assigneeIds)
    for (const p of profiles ?? []) {
      if (p.full_name) names.set(p.id, p.full_name)
    }
  }

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    due_at: row.due_at,
    status: row.status,
    assigned_to: row.assigned_to,
    assigneeName: row.assigned_to ? names.get(row.assigned_to) ?? null : null,
  }))
}

export async function fetchTeamMembers(
  sb: SupabaseClient,
  organizationId: string
): Promise<OwnerTeamMember[]> {
  const { data: members, error } = await sb
    .from('organization_members')
    .select('id, user_id, role')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!members?.length) return []

  const userIds = members.map(m => m.user_id)
  const [{ data: profiles }, { data: proofProfiles }] = await Promise.all([
    sb.from('profiles').select('id, full_name').in('id', userIds),
    sb
      .from(PROOF_PROFILES_TABLE)
      .select('user_id, profile_type_v2')
      .in('user_id', userIds),
  ])

  const profileById = new Map((profiles ?? []).map(p => [p.id, p.full_name]))
  const proofByUser = new Map(
    (proofProfiles ?? []).map(p => [p.user_id as string, p.profile_type_v2 as ExtraProfile])
  )

  return members.map(member => ({
    id: member.id,
    userId: member.user_id,
    fullName: profileById.get(member.user_id) ?? null,
    orgRole: member.role,
    profileType: proofByUser.get(member.user_id) ?? null,
  }))
}

export async function completeTask(sb: SupabaseClient, taskId: string): Promise<void> {
  const { error } = await sb
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) throw error
}

export function formatTaskTime(dueAt: string | null): string {
  if (!dueAt) return 'Sin hora'
  return new Date(dueAt).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function memberInitial(name: string | null, userId: string): string {
  const base = name?.trim() || userId
  return base.charAt(0).toUpperCase()
}

const PROFILE_BADGE_LABELS: Partial<Record<ExtraProfile, string>> = {
  winemaker: 'Winemaker',
  bodega: 'Bodega',
  distiller: 'Destilador',
  distributor: 'Distribuidor',
  brewer: 'Brewer',
}

export function profileBadgeLabel(profileType: ExtraProfile | null): string {
  if (!profileType) return 'Sin perfil'
  return PROFILE_BADGE_LABELS[profileType] ?? profileType
}
